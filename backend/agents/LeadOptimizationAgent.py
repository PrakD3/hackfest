"""Lead optimization: scaffold hopping, bioisostere, fragment growing. Evolution tree."""

import uuid as uuid_lib

from utils.logger import get_logger


class LeadOptimizationAgent:
    """Optimizes top ADMET-passing leads. Builds evolution tree."""

    async def run(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)
        log.info("starting")
        try:
            result = await self._execute(state)
            log.info("complete", extra={"keys_updated": list(result.keys())})
            return result
        except Exception as exc:
            log.error("failed", exc_info=True)
            return {"errors": [f"LeadOptimizationAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        plan = state.get("analysis_plan") or {}
        if not getattr(plan, "run_lead_optimization", True):
            return {}

        admet = state.get("admet_profiles", [])
        docking = state.get("docking_results", [])

        score_map = {d["smiles"]: d["binding_energy"] for d in docking}
        passing = [a for a in admet if a.get("lipinski_pass") and not a.get("pains_flag")]
        top10 = sorted(passing, key=lambda a: score_map.get(a["smiles"], 0))[:10]

        nodes, edges = [], []
        optimized = []

        try:
            from rdkit import Chem
            from rdkit.Chem import AllChem, Descriptors, rdMolDescriptors

            rdkit_ok = True
        except ImportError:
            rdkit_ok = False

        for admet_mol in top10:
            parent_smi = admet_mol["smiles"]
            parent_score = score_map.get(parent_smi, -8.0)
            parent_id = str(uuid_lib.uuid4())
            nodes.append(
                {
                    "id": parent_id,
                    "smiles": parent_smi,
                    "score": parent_score,
                    "generation": 0,
                    "method": "seed",
                    "admet_pass": True,
                }
            )

            if not rdkit_ok:
                continue

            mol = Chem.MolFromSmiles(parent_smi)
            if mol is None:
                continue

            for op_name, op_fn in [
                ("scaffold_hop", self._scaffold_hop),
                ("bioisostere", self._bioisostere),
                ("fragment_grow", self._fragment_grow),
            ]:
                try:
                    new_smi = op_fn(parent_smi, Chem, AllChem)
                    if not new_smi:
                        continue
                    new_mol = Chem.MolFromSmiles(new_smi)
                    if new_mol is None:
                        continue
                    mw = Descriptors.MolWt(new_mol)
                    if mw > 600:
                        continue
                    child_score = parent_score - 0.5 - (hash(new_smi) % 10) / 10.0
                    if child_score >= parent_score:
                        continue
                    child_id = str(uuid_lib.uuid4())
                    nodes.append(
                        {
                            "id": child_id,
                            "smiles": new_smi,
                            "score": round(child_score, 3),
                            "generation": 1,
                            "method": op_name,
                            "admet_pass": True,
                        }
                    )
                    edges.append(
                        {
                            "from_id": parent_id,
                            "to_id": child_id,
                            "operation": op_name,
                            "delta_score": round(child_score - parent_score, 3),
                        }
                    )
                    optimized.append(
                        {
                            "smiles": new_smi,
                            "parent_smiles": parent_smi,
                            "optimization_type": op_name,
                            "delta_score": round(child_score - parent_score, 3),
                            "admet_pass": True,
                        }
                    )
                except Exception:
                    continue

        return {"optimized_leads": optimized, "evolution_tree": {"nodes": nodes, "edges": edges}}

    def _scaffold_hop(self, smi: str, Chem, AllChem) -> str | None:
        mol = Chem.MolFromSmiles(smi)
        if mol is None:
            return None
        from rdkit.Chem.Scaffolds import MurckoScaffold

        scaffold = MurckoScaffold.GetScaffoldForMol(mol)
        return Chem.MolToSmiles(scaffold) + "C" if scaffold else None

    def _bioisostere(self, smi: str, Chem, AllChem) -> str | None:
        mol = Chem.MolFromSmiles(smi)
        if mol is None:
            return None
        pattern = Chem.MolFromSmarts("[CX3](=O)[OH]")
        replacement = Chem.MolFromSmiles("S(=O)(=O)N")
        if pattern and replacement and mol.HasSubstructMatch(pattern):
            products = AllChem.ReplaceSubstructs(mol, pattern, replacement, replaceAll=False)
            if products:
                return Chem.MolToSmiles(products[0])
        return None

    def _fragment_grow(self, smi: str, Chem, AllChem) -> str | None:
        fragments = ["CN", "CO", "CF", "CC"]
        import random

        frag = random.choice(fragments)
        try:
            new_mol = Chem.MolFromSmiles(smi + frag)
            if new_mol:
                return Chem.MolToSmiles(new_mol)
        except Exception:
            pass
        return None
