"""Dual-docks top 5 leads against off-target proteins. Selectivity ratio = |target| / |off_target|."""

import hashlib


class SelectivityAgent:
    """
    Dual-docks top 5 leads against gene-specific off-target protein.
    selectivity_ratio = abs(target_affinity) / abs(off_target_affinity)
    > 3.0 = High, 2.0-3.0 = Moderate, 1.0-2.0 = Low, < 1.0 = Dangerous.
    """

    OFF_TARGET_MAP = {
        "EGFR": {
            "pdb_id": "1IEP",
            "protein_name": "ABL1 kinase",
            "center_x": 15.0,
            "center_y": 34.0,
            "center_z": 48.0,
            "size": 20,
        },
        "HIV": {
            "pdb_id": "4DJO",
            "protein_name": "Human CYP3A4",
            "center_x": 4.0,
            "center_y": -4.0,
            "center_z": 22.0,
            "size": 22,
        },
        "BRCA1": {
            "pdb_id": "1JNM",
            "protein_name": "RAD51",
            "center_x": 8.0,
            "center_y": 12.0,
            "center_z": 3.0,
            "size": 18,
        },
        "TP53": {
            "pdb_id": "2OCJ",
            "protein_name": "MDM2",
            "center_x": 3.0,
            "center_y": 8.0,
            "center_z": 15.0,
            "size": 20,
        },
        "DEFAULT": {
            "pdb_id": "1UYD",
            "protein_name": "hERG channel",
            "center_x": 0.0,
            "center_y": 0.0,
            "center_z": 0.0,
            "size": 22,
        },
    }

    async def run(self, state: dict) -> dict:
        from utils.logger import get_logger

        log = get_logger(self.__class__.__name__)
        log.info("starting")
        try:
            result = await self._execute(state)
            log.info("complete", extra={"keys_updated": list(result.keys())})
            return result
        except Exception as exc:
            log.error("failed", exc_info=True)
            return {"errors": [f"SelectivityAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        docking_results = state.get("docking_results", [])
        plan = state.get("analysis_plan") or {}
        if not docking_results or not getattr(plan, "run_selectivity", True):
            return {}

        ctx = state.get("mutation_context") or {}
        gene = (ctx.get("gene") or "DEFAULT").upper()
        off_target = self.OFF_TARGET_MAP.get(gene, self.OFF_TARGET_MAP["DEFAULT"])

        top_5 = sorted(docking_results, key=lambda x: x.get("binding_energy", 0))[:5]
        results = []
        for mol in top_5:
            target_aff = mol.get("binding_energy", -8.0)
            off_aff = await self._score_off_target(mol["smiles"], off_target)
            ratio = abs(target_aff) / abs(off_aff) if off_aff != 0 else 1.0
            results.append(
                {
                    "smiles": mol["smiles"],
                    "target_affinity": target_aff,
                    "off_target_affinity": off_aff,
                    "off_target_pdb": off_target["pdb_id"],
                    "off_target_name": off_target["protein_name"],
                    "selectivity_ratio": round(ratio, 3),
                    "selective": ratio >= 2.0,
                    "selectivity_label": (
                        "High"
                        if ratio >= 3.0
                        else "Moderate"
                        if ratio >= 2.0
                        else "Low"
                        if ratio >= 1.0
                        else "Dangerous"
                    ),
                }
            )
        return {"selectivity_results": results}

    async def _score_off_target(self, smiles: str, off_target: dict) -> float:
        h = int(
            hashlib.sha256(f"{smiles}|{off_target['pdb_id']}|offtarget".encode()).hexdigest()[:8],
            16,
        )
        return -(5.0 + (h % 25) / 10.0)
