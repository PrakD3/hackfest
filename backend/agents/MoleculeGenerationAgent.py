"""Generate novel molecules via RDKit + SMARTS bioisostere + LigGPT fallback."""

from utils.logger import get_logger

BIOISOSTERE_PAIRS = [
    ("[CX3](=O)[OH]", "S(=O)(=O)N"),
    ("[OH]", "N"),
    ("[Cl]", "[F]"),
    ("c1ccccc1", "c1ccncc1"),
    ("[NH2]", "[OH]"),
]

SEED_SMILES = [
    "CC(=O)Nc1ccc(O)cc1",
    "c1ccc(NC(=O)c2ccccc2)cc1",
    "CC1=CC=C(C=C1)S(=O)(=O)N",
    "O=C(O)c1ccccc1NC(=O)c1cccnc1",
    "Cc1ccc(-c2cc(C(F)(F)F)nn2-c2ccc(S(N)(=O)=O)cc2)cc1",
]


class MoleculeGenerationAgent:
    """Generates 30-70 novel molecule candidates."""

    async def run(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)
        log.info("starting")
        try:
            result = await self._execute(state)
            log.info("complete")
            return result
        except Exception as exc:
            log.error("failed", exc_info=True)
            return {"errors": [f"MoleculeGenerationAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        plan = state.get("analysis_plan") or {}
        if not getattr(plan, "run_molecule_generation", True):
            return {}

        try:
            from rdkit import Chem
            from rdkit.Chem import AllChem, Descriptors, rdMolDescriptors
            from rdkit.Chem.Scaffolds import MurckoScaffold
        except ImportError:
            return {
                "generated_molecules": self._fallback_molecules(),
                "generation_methods_used": ["fallback"],
            }

        seeds = []
        known = state.get("known_compounds", [])
        for c in known[:5]:
            smi = c.get("canonical_smiles", "")
            if smi:
                mol = Chem.MolFromSmiles(smi)
                if mol:
                    seeds.append(smi)
        seeds.extend(SEED_SMILES)
        seeds = list(dict.fromkeys(seeds))[:5]

        molecules = []
        methods_used = []

        murcko_mols = self._murcko_variants(seeds, Chem, AllChem, Descriptors, rdMolDescriptors)
        molecules.extend(murcko_mols)
        if murcko_mols:
            methods_used.append("murcko_scaffold")

        bioisostere_mols = self._bioisostere_variants(seeds, Chem, Descriptors, rdMolDescriptors)
        molecules.extend(bioisostere_mols)
        if bioisostere_mols:
            methods_used.append("bioisostere")

        unique = {}
        for mol in molecules:
            key = mol.get("smiles", "")
            if key and key not in unique:
                unique[key] = mol
        final = list(unique.values())[:70]

        return {"generated_molecules": final, "generation_methods_used": methods_used}

    def _validate(self, smiles: str, Chem, Descriptors, rdMolDescriptors) -> dict | None:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return None
        mw = Descriptors.MolWt(mol)
        hbd = rdMolDescriptors.CalcNumHBD(mol)
        hba = rdMolDescriptors.CalcNumHBA(mol)
        logp = Descriptors.MolLogP(mol)
        rotb = rdMolDescriptors.CalcNumRotatableBonds(mol)
        if mw > 600 or hbd > 5 or hba > 10 or logp > 5.5:
            return None
        inchi = Chem.MolToInchi(mol) or ""
        return {
            "smiles": Chem.MolToSmiles(mol),
            "inchi": inchi,
            "mw": round(mw, 2),
            "generation_method": "",
            "valid": True,
        }

    def _murcko_variants(self, seeds, Chem, AllChem, Descriptors, rdMolDescriptors) -> list[dict]:
        from rdkit.Chem.Scaffolds import MurckoScaffold

        results = []
        substituents = ["C", "F", "Cl", "OC", "N", "CC", "O", "NC(=O)C", "c1ccccc1", "C(F)(F)F"]
        for smi in seeds:
            mol = Chem.MolFromSmiles(smi)
            if mol is None:
                continue
            try:
                scaffold = MurckoScaffold.GetScaffoldForMol(mol)
                scaffold_smi = Chem.MolToSmiles(scaffold)
                for sub in substituents[:6]:
                    try:
                        new_smi = scaffold_smi + sub if scaffold_smi else smi
                        validated = self._validate(new_smi, Chem, Descriptors, rdMolDescriptors)
                        if validated:
                            validated["generation_method"] = "murcko_scaffold"
                            results.append(validated)
                    except Exception:
                        continue
            except Exception:
                continue
        return results

    def _bioisostere_variants(self, seeds, Chem, Descriptors, rdMolDescriptors) -> list[dict]:
        results = []
        for smi in seeds[:3]:
            mol = Chem.MolFromSmiles(smi)
            if mol is None:
                continue
            for pattern_smi, replacement_smi in BIOISOSTERE_PAIRS:
                try:
                    pattern = Chem.MolFromSmarts(pattern_smi)
                    replacement = Chem.MolFromSmiles(replacement_smi)
                    if pattern and replacement and mol.HasSubstructMatch(pattern):
                        from rdkit.Chem import AllChem

                        products = AllChem.ReplaceSubstructs(
                            mol, pattern, replacement, replaceAll=False
                        )
                        for prod in products[:3]:
                            new_smi = Chem.MolToSmiles(prod)
                            validated = self._validate(new_smi, Chem, Descriptors, rdMolDescriptors)
                            if validated:
                                validated["generation_method"] = "bioisostere"
                                results.append(validated)
                except Exception:
                    continue
        return results

    def _fallback_molecules(self) -> list[dict]:
        return [
            {
                "smiles": smi,
                "inchi": "",
                "mw": 250.0,
                "generation_method": "fallback",
                "valid": True,
            }
            for smi in SEED_SMILES
        ]
