"""Generate 10-section reasoning trace + LLM narrative summary."""

from utils.logger import get_logger


class ExplainabilityAgent:
    """Synthesizes all pipeline results into reasoning trace and summary."""

    async def run(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)
        log.info("starting")
        try:
            result = await self._execute(state)
            log.info("complete", extra={"keys_updated": list(result.keys())})
            return result
        except Exception as exc:
            log.error("failed", exc_info=True)
            return {"errors": [f"ExplainabilityAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        ctx = state.get("mutation_context") or {}
        gene = ctx.get("gene", "unknown")
        mutation = ctx.get("mutation", "unknown")
        pocket = state.get("binding_pocket") or {}
        docking = state.get("docking_results", [])
        selectivity = state.get("selectivity_results", [])
        admet = state.get("admet_profiles", [])
        optimized = state.get("optimized_leads", [])
        resistance = state.get("resistance_forecast", "")
        trials = state.get("clinical_trials", [])
        tree = state.get("evolution_tree") or {}

        top_lead = docking[0] if docking else {}
        top_sel = selectivity[0] if selectivity else {}

        admet_passing = sum(1 for a in admet if a.get("lipinski_pass"))
        pains_flagged = sum(1 for a in admet if a.get("pains_flag"))
        avg_bioavail = (
            sum(a.get("bioavailability", 0.5) for a in admet) / len(admet) if admet else 0.0
        )

        trace = {
            "mutation_effect": (
                f"{gene} {mutation} is the input mutation. The pipeline treats this as the primary "
                f"context for structure prep, docking, and downstream ranking."
            ),
            "target_evidence": (
                f"Targets pulled from UniProt ({len(state.get('proteins', []))} proteins) and "
                f"structures from RCSB PDB ({len(state.get('structures', []))} structures). "
                f"Literature count: {len(state.get('literature', []))} PubMed records."
            ),
            "pocket_evidence": (
                f"Binding pocket detected via {state.get('pocket_detection_method', 'unknown')} at "
                f"({pocket.get('center_x', 0):.1f}, {pocket.get('center_y', 0):.1f}, "
                f"{pocket.get('center_z', 0):.1f}) with size "
                f"{pocket.get('size_x', 20)}x{pocket.get('size_y', 20)}x"
                f"{pocket.get('size_z', 20)} Å."
            ),
            "docking_support": (
                f"Top docking score: {top_lead.get('binding_energy', 'N/A')} kcal/mol "
                f"(method: {state.get('docking_mode', 'unknown')}). "
                f"Docked molecules: {len(docking)}."
            ),
            "selectivity_analysis": (
                (
                    f"Top selectivity ratio: {top_sel.get('selectivity_ratio', 'N/A')}x "
                    f"({top_sel.get('selectivity_label', 'N/A')}). "
                    f"Off-target: {top_sel.get('off_target_name', 'N/A')} "
                    f"({top_sel.get('off_target_pdb', 'N/A')}). "
                    f"Selective leads: {sum(1 for s in selectivity if s.get('selective'))} / "
                    f"{len(selectivity)}."
                )
                if selectivity
                else "Selectivity analysis not available."
            ),
            "admet_summary": (
                f"Lipinski pass: {admet_passing} / {len(admet)}. "
                f"PAINS flagged: {pains_flagged}. "
                f"Average bioavailability: {avg_bioavail:.2f}."
                if admet
                else "ADMET screening not available."
            ),
            "optimization_steps": (
                f"Evolution tree: {len(tree.get('nodes', []))} nodes and "
                f"{len(tree.get('edges', []))} transformations. "
                f"Optimized leads: {len(optimized)} from {len(admet)} ADMET-passing candidates."
            ),
            "resistance_forecast": (
                resistance or f"No resistance forecast available for {gene} {mutation}."
            ),
            "clinical_context": (
                f"Clinical trial entries: {len(trials)}."
                + (
                    f" Example: {trials[0].get('title', 'N/A')[:60]} "
                    f"({trials[0].get('phase', 'N/A')})"
                    if trials
                    else ""
                )
            ),
            "final_logic": (
                f"1. Parsed mutation {gene} {mutation}.\n"
                f"2. Retrieved {len(state.get('literature', []))} papers, "
                f"{len(state.get('proteins', []))} proteins, "
                f"{len(state.get('structures', []))} structures.\n"
                f"3. Detected binding pocket at "
                f"({pocket.get('center_x', 0):.0f}, "
                f"{pocket.get('center_y', 0):.0f}, "
                f"{pocket.get('center_z', 0):.0f}).\n"
                f"4. Generated {len(state.get('generated_molecules', []))} molecules and docked "
                f"{len(docking)} successfully.\n"
                f"5. Selectivity: top ratio = {top_sel.get('selectivity_ratio', 'N/A')}x.\n"
                f"6. ADMET pass count: {admet_passing}.\n"
                f"7. Optimization produced {len(optimized)} candidates from evolution steps.\n"
                f"8. Resistance flags: {state.get('resistant_drugs', [])}.\n"
                f"9. Clinical trials count: {len(trials)}.\n"
                f"10. Final ranking highlights the top candidate by docking score "
                f"{top_lead.get('binding_energy', 'N/A')} kcal/mol and selectivity "
                f"{top_sel.get('selectivity_ratio', 'N/A')}x."
            ),
        }

        summary, provider = await self._generate_summary(
            gene, mutation, top_lead, top_sel, trials
        )
        result = {"reasoning_trace": trace, "summary": summary}
        if provider:
            result["llm_provider_used"] = provider
        return result

    async def _generate_summary(
        self,
        gene: str,
        mutation: str,
        top_lead: dict,
        top_sel: dict,
        trials: list,
    ) -> tuple[str, str | None]:
        try:
            from utils.llm_router import LLMRouter

            prompt = (
                "Write 2 short paragraphs that explain how the pipeline reached the final ranking. "
                "Use only the provided data. Avoid clinical claims and avoid these words: "
                "drug, treatment, cure, effective, recommended. "
                "Use the term 'candidate compound' and say results are computational predictions. "
                f"Gene: {gene}, Mutation: {mutation}. "
                f"Top docking score: {top_lead.get('binding_energy', 'N/A')} kcal/mol. "
                f"Selectivity ratio: {top_sel.get('selectivity_ratio', 'N/A')}x vs "
                f"{top_sel.get('off_target_name', 'unknown')}. "
                f"Clinical trial entries: {len(trials)}."
            )
            result, provider = await LLMRouter(
                "You are a drug discovery scientist writing a clear summary."
            ).generate(prompt, 300)
            return result, provider
        except Exception:
            return (
                f"Pipeline completed for {gene} {mutation}. "
                f"Top candidate docking score: {top_lead.get('binding_energy', 'N/A')} kcal/mol, "
                f"with {top_sel.get('selectivity_ratio', 'N/A')}x selectivity over off-target proteins. "
                f"Clinical trial entries: {len(trials)}. "
                "All outputs are computational predictions and require experimental validation."
            ), None
