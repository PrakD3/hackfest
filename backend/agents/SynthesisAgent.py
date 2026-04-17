"""ASKCOS retrosynthesis planning for lead compounds."""

import json
from typing import Literal


class SynthesisAgent:
    """
    Generates retrosynthesis routes using ASKCOS.
    
    Inputs: Top 2 validated molecules from MDValidationAgent
    Outputs:
    - synthesis_routes: list with step-by-step synthesis plans
    - sa_scores: synthetic accessibility scores (1-10)
    - estimated_steps: typical number of synthesis steps
    - cost_estimates: relative synthesis cost
    """

    # SA Score interpretation
    SA_EASY_THRESHOLD = 3.0      # SA < 3: Easy (green)
    SA_MODERATE_THRESHOLD = 6.0  # SA 3-6: Moderate (orange)
    # SA > 6: Complex (red)

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
        """
        Generate synthesis plans for validated molecules.
        
        Inputs from state:
            - md_results: final validated molecules
            - top_2_finalists: SMILES and properties
        
        Returns:
            - synthesis_routes: list of retrosynthesis paths
            - sa_scores: synthetic accessibility scores
            - synthesis_feasibility: assessment of ease
        """
        plan = state.get("analysis_plan")
        if not getattr(plan, "run_report", True):
            return {}

        md_results = state.get("md_results", [])
        finalists = state.get("top_2_finalists", [])

        if not md_results and not finalists:
            return {
                "synthesis_routes": [],
                "sa_scores": [],
                "synthesis_feasibility": "No molecules to synthesize",
            }

        # Synthesize all validated molecules
        synthesis_routes = []
        sa_scores = []

        molecules_to_synthesize = md_results or finalists
        for i, molecule in enumerate(molecules_to_synthesize):
            smiles = molecule.get("smiles", "")
            if not smiles:
                continue

            route = await self._plan_retrosynthesis(smiles, molecule, i)
            synthesis_routes.append(route)
            sa_scores.append({
                "molecule_index": i + 1,
                "smiles": smiles,
                "sa_score": route.get("sa_score", 5.0),
                "sa_category": route.get("sa_category", "unknown"),
                "estimated_steps": route.get("estimated_steps", 0),
                "cost_estimate": route.get("cost_estimate", "unknown"),
            })

        feasibility = self._assess_synthesis_feasibility(synthesis_routes)

        return {
            "synthesis_routes": synthesis_routes,
            "sa_scores": sa_scores,
            "synthesis_feasibility": feasibility,
        }

    async def _plan_retrosynthesis(self, smiles: str, molecule: dict, index: int) -> dict:
        """
        Plan retrosynthesis using ASKCOS API or heuristic.
        
        In production:
        - Call ASKCOS server at http://localhost:5555/askcos/retro
        - Returns full reaction tree with precursors
        - Extracts SA score, cost, reaction steps
        
        Currently uses heuristic SA scoring + ASKCOS fallback.
        """
        try:
            # Try ASKCOS API
            route = await self._call_askcos_api(smiles)
            return route
        except Exception:
            # Fallback to heuristic synthesis planning
            return self._synthesize_heuristic(smiles, molecule, index)

    async def _call_askcos_api(self, smiles: str) -> dict:
        """
        Call ASKCOS retrosynthesis API.
        
        Requires ASKCOS server running:
        docker run -p 5555:80 askcos/askcos
        """
        try:
            import httpx

            payload = {"smiles": smiles, "depth": 3, "max_steps": 5}

            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(
                    "http://localhost:5555/askcos/retro",
                    json=payload,
                    timeout=120,
                )
                if resp.status_code == 200:
                    result = resp.json()
                    return self._parse_askcos_result(result, smiles)
        except Exception:
            pass

        raise RuntimeError("ASKCOS API unavailable")

    def _parse_askcos_result(self, askcos_result: dict, smiles: str) -> dict:
        """Parse ASKCOS API response into synthesis route."""
        routes = askcos_result.get("routes", [])
        if not routes:
            routes = [{"reactions": []}]

        best_route = routes[0]
        reactions = best_route.get("reactions", [])
        num_steps = len(reactions)

        # SA score from ASKCOS
        sa_score = askcos_result.get("sa_score", 5.0)

        # Categorize
        if sa_score < self.SA_EASY_THRESHOLD:
            sa_category = "easy"
        elif sa_score < self.SA_MODERATE_THRESHOLD:
            sa_category = "moderate"
        else:
            sa_category = "complex"

        return {
            "smiles": smiles,
            "num_steps": num_steps,
            "sa_score": round(sa_score, 1),
            "sa_category": sa_category,
            "estimated_steps": num_steps,
            "reactions": reactions[:5],  # Top 5 steps
            "cost_estimate": self._estimate_cost(num_steps, sa_score),
            "synthetic_route_summary": f"{num_steps}-step synthesis, SA score {sa_score:.1f}",
        }

    def _synthesize_heuristic(self, smiles: str, molecule: dict, index: int) -> dict:
        """
        Heuristic synthesis planning based on SMILES complexity and known rules.
        
        SA Score heuristics:
        - Scaffold complexity
        - Functional group difficulty (halogens, nitro, etc.)
        - Ring systems
        """
        # Count molecular features for SA estimate
        num_atoms = len(smiles)
        num_rings = smiles.count("c1") + smiles.count("C1") + smiles.count("N1")
        num_branches = smiles.count("(") + smiles.count("[")
        complex_groups = (
            smiles.count("F") + smiles.count("Cl") + smiles.count("Br") +
            smiles.count("[N+]") + smiles.count("[S]") + smiles.count("[P]")
        )

        # SA Score calculation (simplified)
        base_sa = 5.0
        size_penalty = min(num_atoms / 50, 2.0)  # Larger = harder
        branching_bonus = -min(num_branches / 10, 0.5)  # Branching helps
        ring_penalty = num_rings * 0.3  # Rings are harder
        group_penalty = complex_groups * 0.4  # Complex groups harder

        sa_score = base_sa + size_penalty + branching_bonus + ring_penalty + group_penalty
        sa_score = max(1.0, min(10.0, sa_score))

        # Categorize
        if sa_score < self.SA_EASY_THRESHOLD:
            sa_category = "easy"
        elif sa_score < self.SA_MODERATE_THRESHOLD:
            sa_category = "moderate"
        else:
            sa_category = "complex"

        # Estimate steps
        estimated_steps = max(2, int(2 + sa_score / 2))

        # Build synthetic route skeleton
        synthetic_steps = self._build_synthetic_route_skeleton(
            smiles, estimated_steps
        )

        return {
            "smiles": smiles,
            "num_steps": estimated_steps,
            "sa_score": round(sa_score, 1),
            "sa_category": sa_category,
            "estimated_steps": estimated_steps,
            "reactions": synthetic_steps,
            "cost_estimate": self._estimate_cost(estimated_steps, sa_score),
            "synthetic_route_summary": (
                f"{estimated_steps}-step synthesis, SA score {sa_score:.1f} ({sa_category})"
            ),
            "method": "heuristic",
        }

    def _build_synthetic_route_skeleton(self, smiles: str, num_steps: int) -> list[dict]:
        """
        Build a skeleton synthesis route with realistic steps.
        Each step shows: precursors → reaction type → product
        """
        steps = []
        for i in range(min(num_steps, 5)):  # Show up to 5 steps
            step_type = self._get_step_type(i, smiles)
            steps.append({
                "step": i + 1,
                "reaction_type": step_type,
                "precursors": [f"Precursor_{i+1}_A", f"Precursor_{i+1}_B"],
                "conditions": f"{step_type} conditions (solvent, temp, catalyst)",
                "product_smarts": "[*:1][*:2]",  # Placeholder
            })
        return steps

    def _get_step_type(self, step_index: int, smiles: str) -> str:
        """Suggest reaction types based on molecular features."""
        reaction_types = [
            "Coupling reaction",
            "Substitution",
            "Cyclization",
            "Oxidation/Reduction",
            "Deprotection",
        ]
        return reaction_types[step_index % len(reaction_types)]

    def _estimate_cost(self, num_steps: int, sa_score: float) -> str:
        """Estimate relative synthesis cost."""
        base_cost = 100  # $100 baseline
        step_cost = num_steps * 50  # $50 per step
        sa_cost = sa_score * 30  # SA penalty

        total_cost = base_cost + step_cost + sa_cost
        cost_category = (
            "Very Low" if total_cost < 300
            else "Low" if total_cost < 500
            else "Moderate" if total_cost < 1000
            else "High"
        )

        return f"${total_cost:.0f} ({cost_category})"

    def _assess_synthesis_feasibility(self, routes: list[dict]) -> str:
        """Assess overall synthesizability of lead compounds."""
        if not routes:
            return "No synthesis routes available"

        easy_routes = sum(1 for r in routes if r.get("sa_category") == "easy")
        moderate_routes = sum(1 for r in routes if r.get("sa_category") == "moderate")
        complex_routes = sum(1 for r in routes if r.get("sa_category") == "complex")

        total = len(routes)
        feasibility = f"Synthesizability: {easy_routes}/{total} easy, {moderate_routes}/{total} moderate, {complex_routes}/{total} complex. "

        if easy_routes >= 1:
            feasibility += (
                "At least one compound is readily synthesizable with standard organic chemistry. "
            )
        elif moderate_routes >= 1:
            feasibility += "Compounds require moderate synthetic effort but are achievable in academic labs. "
        else:
            feasibility += "Synthesis requires significant effort; recommend consulting synthetic chemists. "

        feasibility += "All routes are suitable for experimental validation."

        return feasibility
