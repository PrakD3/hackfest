"""Decides pipeline mode (full vs lite) and which stages to run."""

from pipeline.state import AnalysisPlan, PipelineMode


class PlannerAgent:
    """Reads query+mutation_context, writes analysis_plan."""

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
            return {"errors": [f"PlannerAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        query = state.get("query", "")
        mode = state.get("mode", PipelineMode.FULL)
        ctx = state.get("mutation_context") or {}
        tokens = query.split()
        is_mutation = ctx.get("is_mutation", False)
        has_digits = any(any(c.isdigit() for c in t) for t in tokens)

        if mode == PipelineMode.LITE or (not is_mutation and len(tokens) <= 2 and not has_digits):
            plan = AnalysisPlan(
                run_literature=True,
                run_target=True,
                run_structure=False,
                run_compound=True,
                run_pocket_detection=False,
                run_molecule_generation=False,
                run_docking=False,
                run_selectivity=False,
                run_admet=False,
                run_lead_optimization=False,
                run_resistance=True,
                run_similarity=True,
                run_synergy=False,
                run_clinical_trials=True,
                run_report=True,
            )
            actual_mode = PipelineMode.LITE
        else:
            plan = AnalysisPlan()
            actual_mode = PipelineMode.FULL

        # Initialize confidence tracking object
        confidence = {
            "structure": 1.0,      # pLDDT-based (StructurePrepAgent)
            "docking": 1.0,        # Vina/Gnina/hash based (DockingAgent)
            "selectivity": 1.0,    # WT vs mutant or off-target (SelectivityAgent)
            "admet": 1.0,          # RDKit-based property filtering (ADMETAgent)
            "final": 1.0,          # Minimum of all above
        }
        
        # Load off-target proteins for selectivity assessment
        off_target_proteins, pdb_structures = await self._load_off_target_proteins(ctx, plan)
        
        return {
            "analysis_plan": plan,
            "mode": actual_mode,
            "confidence": confidence,
            "off_target_proteins": off_target_proteins,
            "pdb_structures": pdb_structures,
        }

    async def _load_off_target_proteins(self, mutation_context: dict, plan: AnalysisPlan) -> tuple[list, dict]:
        """Load off-target proteins and their PDB structures for selectivity assessment."""
        log = __import__("utils.logger", fromlist=["get_logger"]).get_logger(self.__class__.__name__)
        
        # Only load if selectivity will run
        if not plan.run_selectivity:
            return [], {}
        
        try:
            import json
            from pathlib import Path
            
            # Load off-target mapping
            off_target_file = Path(__file__).parent.parent / "data" / "off_target_proteins.json"
            if not off_target_file.exists():
                log.warning(f"Off-target file not found: {off_target_file}")
                return [], {}
            
            with open(off_target_file) as f:
                off_target_map = json.load(f)
            
            # Get gene from mutation context
            gene = mutation_context.get("gene", "EGFR")
            off_targets = off_target_map.get(gene, off_target_map.get("DEFAULT", {}))
            
            if not off_targets:
                log.warning(f"No off-targets configured for {gene}")
                return [], {}
            
            off_target_pdb = off_targets.get("pdb_id", "1UYD")
            
            # Try to fetch PDB structure
            pdb_structures = {}
            try:
                pdb_content = await self._fetch_pdb(off_target_pdb)
                if pdb_content:
                    pdb_structures[off_target_pdb] = pdb_content
                    log.info(f"✓ Loaded off-target PDB: {off_target_pdb}")
            except Exception as e:
                log.warning(f"Could not fetch off-target PDB {off_target_pdb}: {e}")
            
            return [off_target_pdb], pdb_structures
            
        except Exception as e:
            log.error(f"Error loading off-target proteins: {e}")
            return [], {}

    async def _fetch_pdb(self, pdb_id: str) -> str | None:
        """Fetch PDB structure from RCSB."""
        import httpx
        
        url = f"https://files.rcsb.org/download/{pdb_id}.pdb"
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return resp.text
        except Exception:
            pass
        return None
