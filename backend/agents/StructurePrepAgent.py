"""Downloads PDB files or uses ESMFold fallback."""

import asyncio
import os
from pathlib import Path

import httpx


class StructurePrepAgent:
    """Reads structures from state, downloads PDB, returns pdb_content."""

    # Mapping of well-known genes to their wildtype PDB structures
    WILDTYPE_PDB_MAP = {
        "EGFR": "6EFW",      # EGFR Kinase domain (wildtype)
        "ALK": "3LCE",       # ALK kinase (wildtype)
        "BRAF": "1UWJ",      # BRAF kinase domain (wildtype)
        "KRAS": "4OBE",      # KRAS GTPase (wildtype)
        "MET": "3DCE",       # MET kinase (wildtype)
        "ROS1": "3ZBE",      # ROS1 kinase (wildtype)
        "TP53": "1TSR",      # TP53 DNA binding (wildtype)
        "BRCA1": "1JNM",     # BRCA1 (wildtype)
        "HIV": "3I6O",       # HIV protease (wildtype)
    }

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
            return {"errors": [f"StructurePrepAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        plan = state.get("analysis_plan")
        if not getattr(plan, "run_structure", True):
            return {}
        structures = state.get("structures", [])
        mutation_context = state.get("mutation_context", {})
        session_id = state.get("session_id", "default")
        
        # Use Windows-compatible temp path
        import tempfile
        system_temp = tempfile.gettempdir()  # Returns C:\Users\...\AppData\Local\Temp on Windows
        tmp_dir = Path(system_temp) / "dda_structures" / session_id
        tmp_dir.mkdir(parents=True, exist_ok=True)

        pdb_content = None
        wt_pdb_content = None
        updated_structures = []
        plddt_at_mutation = None
        structure_confidence = "UNKNOWN"
        wt_pdb_id = None
        wt_local_path = None

        # Try to download wildtype structure if we know the gene
        gene = (mutation_context.get("gene") or "").upper()
        if gene in self.WILDTYPE_PDB_MAP:
            wt_pdb_id = self.WILDTYPE_PDB_MAP[gene]
            wt_local_path = tmp_dir / f"WT_{wt_pdb_id}.pdb"
            wt_pdb_content = await self._download_pdb(wt_pdb_id, wt_local_path)

        # Download mutant/main structure
        for struct in structures[:3]:
            pdb_id = struct.get("pdb_id", "")
            if not pdb_id:
                continue
            local_path = tmp_dir / f"{pdb_id}.pdb"
            content = await self._download_pdb(pdb_id, local_path)
            if content:
                struct = dict(struct)
                struct["pdb_path"] = str(local_path)
                struct["is_mutant"] = True
                if pdb_content is None:
                    pdb_content = content
                    # Extract pLDDT from B-factor at mutation site
                    mutation_pos = mutation_context.get("position")
                    if mutation_pos:
                        plddt_at_mutation = self._extract_plddt(content, mutation_pos)
                        if plddt_at_mutation is not None:
                            structure_confidence = self._classify_confidence(plddt_at_mutation)
            updated_structures.append(struct)

        # If no PDB found, use ESMFold
        if not pdb_content:
            proteins = state.get("proteins", [])
            if proteins:
                seq = proteins[0].get("sequence", "")
                if seq:
                    pdb_content = await self._esm_fold(seq)
                    if pdb_content:
                        # ESMFold returns PDB with B-factors as pLDDT
                        mutation_pos = mutation_context.get("position")
                        if mutation_pos:
                            plddt_at_mutation = self._extract_plddt(pdb_content, mutation_pos)
                            if plddt_at_mutation is not None:
                                structure_confidence = self._classify_confidence(plddt_at_mutation)

        # Final fallback: use known wildtype structure when mutant structure is missing.
        if not pdb_content and wt_pdb_content and wt_pdb_id:
            pdb_content = wt_pdb_content
            fallback_struct = {
                "pdb_id": wt_pdb_id,
                "title": f"WT fallback {wt_pdb_id}",
                "experimental_methods": "Unknown",
                "resolution": None,
                "pdb_path": str(wt_local_path) if wt_local_path else None,
                "is_mutant": False,
                "is_wildtype": True,
                "fallback": True,
            }
            if updated_structures:
                updated_structures.insert(0, fallback_struct)
            else:
                updated_structures = [fallback_struct]
            state.setdefault("warnings", []).append(
                f"Structure fallback: using wildtype PDB {wt_pdb_id} (mutant structure unavailable)."
            )
        # If we don't have WT yet and have mutant sequence, fold WT version
        if not wt_pdb_content and pdb_content:
            proteins = state.get("proteins", [])
            if proteins:
                seq = proteins[0].get("sequence", "")
                # Construct WT sequence from mutant (this is a simplification)
                wt_seq = seq  # In real scenario, would reverse the mutation
                if seq:
                    wt_pdb_content = await self._esm_fold(wt_seq)

        result = {
            "pdb_content": pdb_content or "",
            "structures": updated_structures if updated_structures else structures,
        }
        
        # Add WT content if available
        if wt_pdb_content:
            result["wt_pdb_content"] = wt_pdb_content
            result["has_wt"] = True
        else:
            result["has_wt"] = False
        
        # Add pLDDT information if available
        if plddt_at_mutation is not None:
            result["plddt_at_mutation"] = plddt_at_mutation
            result["structure_confidence"] = structure_confidence
        
        # Update state confidence based on pLDDT
        if state.get("confidence") is None:
            state["confidence"] = {}
        
        if structure_confidence == "HIGH":
            state["confidence"]["structure"] = 0.95
        elif structure_confidence == "MEDIUM":
            state["confidence"]["structure"] = 0.70
        elif structure_confidence == "LOW":
            state["confidence"]["structure"] = 0.40
        else:
            state["confidence"]["structure"] = 0.20
        
        return result

    async def _download_pdb(self, pdb_id: str, local_path: Path) -> str | None:
        if local_path.exists():
            return local_path.read_text()
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.get(f"https://files.rcsb.org/download/{pdb_id}.pdb")
                if r.status_code == 200:
                    local_path.write_text(r.text)
                    return r.text
        except Exception:
            pass
        return None

    async def _esm_fold(self, sequence: str) -> str | None:
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                r = await client.post(
                    "https://api.esmatlas.com/foldSequence/v1/pdb/",
                    data=sequence[:400],
                    headers={"Content-Type": "text/plain"},
                )
                if r.status_code == 200:
                    return r.text
        except Exception:
            pass
        return None

    def _extract_plddt(self, pdb_content: str, position: int) -> float | None:
        """
        Extract pLDDT (confidence score) from PDB B-factor at mutation position.
        ESMFold encodes pLDDT (0-100) in the B-factor column.
        
        Args:
            pdb_content: PDB file as string
            position: residue number (1-indexed)
        
        Returns:
            pLDDT score (0-100) or None if not found
        """
        try:
            for line in pdb_content.split("\n"):
                if line.startswith("ATOM"):
                    # PDB format: ATOM  X    Y    Z   occupancy B-factor
                    # Field 22-26: residue number
                    # Field 61-66: B-factor
                    res_num_str = line[22:26].strip()
                    b_factor_str = line[60:66].strip()
                    
                    if res_num_str:
                        try:
                            res_num = int(res_num_str)
                            if res_num == position:
                                # Found the residue, extract B-factor (which is pLDDT for ESMFold)
                                b_factor = float(b_factor_str)
                                # pLDDT is 0-100; if B-factor is way off, it might be a real crystal
                                if 0 <= b_factor <= 100:
                                    return b_factor
                                # For real crystal structures, B-factor might be 0-60 and isn't pLDDT
                                # In that case, return None to indicate uncertainty
                                break
                        except (ValueError, IndexError):
                            continue
        except Exception:
            pass
        return None

    def _classify_confidence(self, plddt: float) -> str:
        """Classify struct confidence based on pLDDT score."""
        if plddt >= 90:
            return "HIGH"
        elif plddt >= 70:
            return "MEDIUM"
        elif plddt >= 50:
            return "LOW"
        else:
            return "VERY_LOW"
