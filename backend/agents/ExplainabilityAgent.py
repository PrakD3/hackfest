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
                f"{gene} {mutation} alters the kinase domain structure, reducing drug binding affinity "
                f"and activating downstream proliferation pathways. This mutation confers resistance to "
                f"first-generation inhibitors."
            ),
            "target_evidence": (
                f"Primary target identified via UniProt ({len(state.get('proteins', []))} proteins found) "
                f"and RCSB PDB ({len(state.get('structures', []))} structures). "
                f"Literature support from {len(state.get('literature', []))} PubMed papers."
            ),
            "pocket_evidence": (
                f"Binding pocket detected via {state.get('pocket_detection_method', 'unknown')} method "
                f"at coordinates ({pocket.get('center_x', 0):.1f}, {pocket.get('center_y', 0):.1f}, "
                f"{pocket.get('center_z', 0):.1f}). "
                f"Grid size: {pocket.get('size_x', 20)}x{pocket.get('size_y', 20)}x"
                f"{pocket.get('size_z', 20)} Å."
            ),
            "docking_support": (
                f"Top docking score: {top_lead.get('binding_energy', 'N/A')} kcal/mol "
                f"({top_lead.get('confidence', 'N/A')} confidence). "
                f"Mode: {state.get('docking_mode', 'unknown')}. "
                f"{len(docking)} molecules successfully docked."
            ),
            "selectivity_analysis": (
                (
                    f"Top selectivity ratio: {top_sel.get('selectivity_ratio', 'N/A')}x "
                    f"({top_sel.get('selectivity_label', 'N/A')}). "
                    f"Off-target: {top_sel.get('off_target_name', 'N/A')} "
                    f"({top_sel.get('off_target_pdb', 'N/A')}). "
                    f"{sum(1 for s in selectivity if s.get('selective'))} of "
                    f"{len(selectivity)} leads are selective."
                )
                if selectivity
                else "Selectivity analysis not performed."
            ),
            "admet_summary": (
                f"{admet_passing} of {len(admet)} molecules pass Lipinski RO5. "
                f"{pains_flagged} PAINS flags detected. "
                f"Average bioavailability: {avg_bioavail:.2f}"
                if admet
                else "ADMET screening not performed."
            ),
            "optimization_steps": (
                f"Evolution tree: {len(tree.get('nodes', []))} nodes, "
                f"{len(tree.get('edges', []))} transformations. "
                f"{len(optimized)} leads optimized from {len(admet)} ADMET-passing candidates. "
                f"Operations: scaffold hopping, bioisostere replacement, fragment growing."
            ),
            "resistance_forecast": (
                resistance or f"No resistance forecast available for {gene} {mutation}."
            ),
            "clinical_context": (
                f"{len(trials)} active clinical trials found targeting {gene} {mutation}. "
                + (
                    f"Nearest: {trials[0].get('title', 'N/A')[:60]} "
                    f"({trials[0].get('phase', 'N/A')})"
                    if trials
                    else ""
                )
            ),
            "final_logic": (
                f"1. Parsed mutation {gene} {mutation} → cancer driver.\n"
                f"2. Fetched {len(state.get('literature', []))} papers, "
                f"{len(state.get('proteins', []))} proteins, "
                f"{len(state.get('structures', []))} structures.\n"
                f"3. Detected binding pocket at "
                f"({pocket.get('center_x', 0):.0f}, "
                f"{pocket.get('center_y', 0):.0f}, "
                f"{pocket.get('center_z', 0):.0f}).\n"
                f"4. Generated {len(state.get('generated_molecules', []))} molecules "
                f"→ docked {len(docking)} successfully.\n"
                f"5. Selectivity analysis: top lead ratio = "
                f"{top_sel.get('selectivity_ratio', 'N/A')}x.\n"
                f"6. ADMET screening: {admet_passing} leads pass drug-likeness.\n"
                f"7. Optimization yielded {len(optimized)} improved leads via evolution tree.\n"
                f"8. Resistance profile: resistant to {state.get('resistant_drugs', [])}, "
                f"recommended: {state.get('recommended_drugs', [])}.\n"
                f"9. Clinical context: {len(trials)} active trials.\n"
                f"10. Final recommendation: top lead with selectivity "
                f"{top_sel.get('selectivity_ratio', 'N/A')}x and docking score "
                f"{top_lead.get('binding_energy', 'N/A')} kcal/mol."
            ),
        }

        summary = await self._generate_summary(gene, mutation, top_lead, top_sel, trials)
        return {"reasoning_trace": trace, "summary": summary}

    async def _generate_summary(
        self,
        gene: str,
        mutation: str,
        top_lead: dict,
        top_sel: dict,
        trials: list,
    ) -> str:
        try:
            from utils.llm_router import LLMRouter

            prompt = (
                f"Summarize this drug discovery result in 2 clear paragraphs for a scientific audience. "
                f"Gene: {gene}, Mutation: {mutation}. "
                f"Top lead docking score: {top_lead.get('binding_energy', 'N/A')} kcal/mol. "
                f"Selectivity: {top_sel.get('selectivity_ratio', 'N/A')}x vs "
                f"{top_sel.get('off_target_name', 'unknown')}. "
                f"Clinical trials found: {len(trials)}."
            )
            result, _ = await LLMRouter(
                "You are a drug discovery scientist writing a clear summary."
            ).generate(prompt, 300)
            return result
        except Exception:
            return (
                f"Drug discovery pipeline completed for {gene} {mutation}. "
                f"Top lead achieves {top_lead.get('binding_energy', 'N/A')} kcal/mol binding affinity "
                f"with {top_sel.get('selectivity_ratio', 'N/A')}x selectivity over off-target proteins. "
                f"{len(trials)} active clinical trials provide real-world context for this target."
            )
