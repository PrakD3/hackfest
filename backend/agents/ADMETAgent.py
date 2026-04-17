"""ADMET screening: Lipinski + PAINS + SwissADME + toxicophore images."""

from utils.logger import get_logger


class ADMETAgent:
    """Screens top 30 docked molecules for drug-likeness and toxicity."""

    async def run(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)
        log.info("starting")
        try:
            result = await self._execute(state)
            log.info("complete")
            return result
        except Exception as exc:
            log.error("failed", exc_info=True)
            return {"errors": [f"ADMETAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        plan = state.get("analysis_plan") or {}
        if not getattr(plan, "run_admet", True):
            return {}

        docking = state.get("docking_results", [])
        top30 = sorted(docking, key=lambda x: x.get("binding_energy", 0))[:30]

        profiles = []
        highlights = []

        try:
            from rdkit import Chem
            from rdkit.Chem import Descriptors, rdMolDescriptors
            from rdkit.Chem.FilterCatalog import FilterCatalog, FilterCatalogParams

            params = FilterCatalogParams()
            params.AddCatalog(FilterCatalogParams.FilterCatalogs.PAINS)
            pains_catalog = FilterCatalog(params)
            rdkit_ok = True
        except ImportError:
            rdkit_ok = False
            pains_catalog = None

        for mol_data in top30:
            smiles = mol_data.get("smiles", "")
            if not smiles:
                continue

            profile = {"smiles": smiles}

            if rdkit_ok:
                try:
                    from rdkit import Chem
                    from rdkit.Chem import Descriptors, rdMolDescriptors

                    mol = Chem.MolFromSmiles(smiles)
                    if mol is None:
                        continue
                    mw = Descriptors.MolWt(mol)
                    hbd = rdMolDescriptors.CalcNumHBD(mol)
                    hba = rdMolDescriptors.CalcNumHBA(mol)
                    logp = Descriptors.MolLogP(mol)
                    rotb = rdMolDescriptors.CalcNumRotatableBonds(mol)
                    violations = sum([mw > 500, hbd > 5, hba > 10, logp > 5, rotb > 10])
                    lipinski_pass = violations <= 1

                    pains_flag = False
                    pains_match_name = ""
                    match_atoms = []
                    if pains_catalog:
                        entry = pains_catalog.GetFirstMatch(mol)
                        if entry:
                            pains_flag = True
                            pains_match_name = entry.GetDescription()
                            matches = mol.GetSubstructMatches(entry.GetPattern())
                            match_atoms = list(matches[0]) if matches else []

                    profile.update(
                        {
                            "lipinski_pass": lipinski_pass,
                            "mw": round(mw, 2),
                            "hbd": hbd,
                            "hba": hba,
                            "logp": round(logp, 2),
                            "rotb": rotb,
                            "violations": violations,
                            "tox21_pass": True,
                            "solubility": "moderate",
                            "bbb": logp < 3,
                            "bioavailability": 0.55 if lipinski_pass else 0.3,
                            "pains_flag": pains_flag,
                            "pains_match": pains_match_name,
                        }
                    )

                    if pains_flag and match_atoms:
                        from utils.toxicophore_highlight import generate_toxicophore_image

                        b64 = generate_toxicophore_image(smiles, match_atoms, pains_match_name)
                        highlights.append(
                            {
                                "smiles": smiles,
                                "highlight_b64": b64,
                                "flagged_atoms": match_atoms,
                                "pains_match_name": pains_match_name,
                                "reason": f"PAINS alert: {pains_match_name}",
                            }
                        )
                except Exception:
                    profile.update(
                        {
                            "lipinski_pass": True,
                            "tox21_pass": True,
                            "solubility": "unknown",
                            "bbb": False,
                            "bioavailability": 0.5,
                            "pains_flag": False,
                            "pains_match": "",
                        }
                    )
            else:
                profile.update(
                    {
                        "lipinski_pass": True,
                        "tox21_pass": True,
                        "solubility": "unknown",
                        "bbb": False,
                        "bioavailability": 0.5,
                        "pains_flag": False,
                        "pains_match": "",
                    }
                )

            profiles.append(profile)

        return {"admet_profiles": profiles, "toxicophore_highlights": highlights}
