"""Compile final ranked report with all pipeline results."""

import base64
import io
import os
import time

from utils.logger import get_logger


class ReportAgent:
    """Assembles final_report dict from all pipeline state."""

    async def run(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)
        log.info("starting")
        try:
            result = await self._execute(state)
            log.info("complete", extra={"keys_updated": list(result.keys())})
            return result
        except Exception as exc:
            log.error("failed", exc_info=True)
            return {"errors": [f"ReportAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)

        docking = state.get("docking_results", [])
        admet = state.get("admet_profiles", [])
        selectivity = state.get("selectivity_results", [])
        highlights = state.get("toxicophore_highlights", [])
        trials = state.get("clinical_trials", [])
        optimized = state.get("optimized_leads", [])

        # Calculate final confidence score
        confidence_dict = state.get("confidence", {})
        confidence_scores = [
            confidence_dict.get("structure", 1.0),
            confidence_dict.get("docking", 1.0),
            confidence_dict.get("selectivity", 1.0),
            confidence_dict.get("admet", 1.0),
        ]
        final_confidence = min(confidence_scores) if confidence_scores else 0.5
        confidence_dict["final"] = final_confidence
        
        # Classify confidence tier
        if final_confidence >= 0.7:
            confidence_tier = "GREEN"
            confidence_banner = "✅ HIGH CONFIDENCE: Results are well-grounded in structural and docking data."
        elif final_confidence >= 0.5:
            confidence_tier = "AMBER"
            confidence_banner = "⚠️ MEDIUM CONFIDENCE: Some limitations present. See confidence details for caveats."
        else:
            confidence_tier = "RED"
            confidence_banner = "🔴 LOW CONFIDENCE: Results are primarily computational estimates. Experimental validation strongly recommended."

        admet_map = {a["smiles"]: a for a in admet}
        sel_map = {s["smiles"]: s for s in selectivity}
        highlight_map = {h["smiles"]: h for h in highlights}
        opt_map: dict[str, list] = {}
        for o in optimized:
            opt_map.setdefault(o.get("parent_smiles", ""), []).append(o)

        resistant = state.get("resistant_drugs", [])

        ranked_leads = []
        for i, d in enumerate(docking[:10]):
            smi = d.get("smiles", "")
            a = admet_map.get(smi, {})
            s = sel_map.get(smi, {})
            h = highlight_map.get(smi, {})

            admet_flags = []
            if not a.get("lipinski_pass", True):
                admet_flags.append("Lipinski fail")
            if a.get("pains_flag"):
                admet_flags.append(f"PAINS: {a.get('pains_match', '')}")
            if not a.get("bbb", True):
                admet_flags.append("Poor BBB")

            mol_b64 = self._mol_image(smi)
            ranked_leads.append(
                {
                    "rank": i + 1,
                    "smiles": smi,
                    "compound_name": d.get("compound_name", f"Lead-{i + 1}"),
                    "docking_score": d.get("binding_energy"),
                    "confidence": d.get("confidence", "Moderate"),
                    "admet_pass": a.get("lipinski_pass", True),
                    "admet_flags": admet_flags,
                    "selectivity_ratio": s.get("selectivity_ratio", 1.0),
                    "selective": s.get("selective", False),
                    "selectivity_label": s.get("selectivity_label", "Low"),
                    "toxicophore_highlight_b64": h.get("highlight_b64", ""),
                    "toxicophore_reason": h.get("reason", ""),
                    "optimization_history": opt_map.get(smi, []),
                    "similar_to": [
                        sc.get("chembl_id", "") for sc in state.get("similar_compounds", [])[:2]
                    ],
                    "resistance_flag": d.get("compound_name", "") in resistant,
                    "mol_image_b64": mol_b64,
                    "clinical_trials_count": len(trials),
                }
            )

        report = {
            "ranked_leads": ranked_leads,
            "summary": state.get("summary", "Pipeline complete."),
            "resistance_forecast": state.get("resistance_forecast"),
            "clinical_trials": trials,
            "evolution_tree": state.get("evolution_tree"),
            "confidence_tier": confidence_tier,
            "confidence_banner": confidence_banner,
            "confidence_object": confidence_dict,
            "metrics": {
                "literature_count": len(state.get("literature", [])),
                "proteins_found": len(state.get("proteins", [])),
                "structures_found": len(state.get("structures", [])),
                "molecules_generated": len(state.get("generated_molecules", [])),
                "molecules_docked": len(docking),
                "admet_passing": sum(1 for a in admet if a.get("lipinski_pass")),
                "leads_optimized": len(optimized),
                "selective_leads": sum(1 for s in selectivity if s.get("selective")),
                "clinical_trials_found": len(trials),
                "pocket_detection_method": state.get("pocket_detection_method", "unknown"),
                "docking_mode": state.get("docking_mode", "unknown"),
                "llm_provider": state.get("llm_provider_used", "unknown"),
                "langsmith_run_id": state.get("langsmith_run_id"),
                "execution_time_ms": state.get("execution_time_ms", 0),
            },
            "export_ready": True,
        }

        discovery_id = ""
        if os.getenv("DATABASE_URL"):
            try:
                from utils.db import save_discovery

                discovery_id = await save_discovery({**state, "final_report": report})
            except Exception as e:
                log.warning(f"DB save failed: {e}")

        return {"final_report": report, "discovery_id": discovery_id}

    def _mol_image(self, smiles: str) -> str:
        try:
            from rdkit.Chem import Draw, MolFromSmiles

            mol = MolFromSmiles(smiles)
            if mol is None:
                return ""
            img = Draw.MolToImage(mol, size=(300, 200))
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            return base64.b64encode(buf.getvalue()).decode()
        except Exception:
            return ""
