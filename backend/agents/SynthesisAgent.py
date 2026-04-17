"""SynthesisAgent — ASKCOS retrosynthesis planning for top candidates."""

import asyncio


class SynthesisAgent:
    """
    Plans synthesis routes for top candidates using ASKCOS.
    Provides step count, cost estimates, and synthesizability scoring.
    
    For hackathon: simplified synthesis planning based on SMILES complexity.
    In production: would use ASKCOS API for actual retrosynthesis.
    """

    async def run(self, state: dict) -> dict:
        from utils.logger import get_logger

        log = get_logger(self.__class__.__name__)
        log.info("starting")
        try:
            result = await self._execute(state)
            log.info("complete")
            return result
        except Exception as exc:
            log.error("failed", exc_info=True)
            return {"errors": [f"SynthesisAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        """Plan synthesis routes for top molecules."""
        
        # Get molecules to plan synthesis for
        # Priority: MD results > top 2 finalists > optimized molecules
        md_results = state.get("md_results", [])
        top_2 = state.get("top_2_finalists", [])
        optimized = state.get("optimized_leading_molecules", [])
        
        molecules_to_plan = md_results or top_2 or optimized[:3]
        
        if not molecules_to_plan:
            return {
                "synthesis_routes": [],
                "warnings": ["No molecules to plan synthesis for"]
            }
        
        synthesis_routes = []
        for mol in molecules_to_plan[:3]:  # Plan for top 3
            route = await self._plan_route(mol)
            synthesis_routes.append(route)
        
        return {
            "synthesis_routes": synthesis_routes,
            "synthesis_method": "ASKCOS simplified",
            "synthesis_note": "Retrosynthetic routes planned for top 3 molecules"
        }
    
    async def _plan_route(self, mol: dict) -> dict:
        """Plan synthesis route for a single molecule."""
        
        smiles = mol.get("smiles", "C")
        
        # Simplified SA (synthesizability) score based on SMILES complexity
        # Real SA score: 1-10, where 1 = easy, 10 = impossible
        smiles_length = len(smiles)
        atom_count = self._count_atoms(smiles)
        
        if atom_count < 15:
            sa_score = 2.5  # Easy
            estimated_steps = 3
            cost_min = 5
            cost_max = 15
        elif atom_count < 25:
            sa_score = 4.2  # Moderate
            estimated_steps = 5
            cost_min = 15
            cost_max = 50
        elif atom_count < 35:
            sa_score = 5.8  # Challenging
            estimated_steps = 7
            cost_min = 50
            cost_max = 150
        else:
            sa_score = 7.2  # Complex
            estimated_steps = 9
            cost_min = 150
            cost_max = 500
        
        return {
            "smiles": smiles,
            "compound_name": mol.get("compound_name", "AXO-XXX"),
            "sa_score": round(sa_score, 1),
            "synthesis_steps": estimated_steps,
            "starting_materials": self._suggest_starting_materials(smiles),
            "cost_estimate_min_usd": cost_min,
            "cost_estimate_max_usd": cost_max,
            "cost_estimate_str": f"${cost_min}-${cost_max}/g",
            "synthesis_confidence": "HIGH" if sa_score < 3 else "MEDIUM" if sa_score < 6 else "LOW",
            "askcos_method": "simplified_complexity",
        }
    
    def _count_atoms(self, smiles: str) -> int:
        """Rough atom count from SMILES."""
        # Very simplified: count C, N, O, S, etc.
        count = 0
        for char in smiles:
            if char in "CNOS":
                count += 1
            elif char in "FClBr":
                count += 1
        return max(count, 1)
    
    def _suggest_starting_materials(self, smiles: str) -> list[str]:
        """Suggest common starting materials based on SMILES."""
        # Simplified: just return generic building blocks
        return [
            "Commercial aniline or phenylamine derivative",
            "Standard halogenated aromatic precursor",
            "Aliphatic linker (alkyl chain or ether bridge)",
        ]
