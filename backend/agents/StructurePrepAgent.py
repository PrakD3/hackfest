"""Downloads PDB files or uses ESMFold fallback."""

import asyncio
import os
from pathlib import Path

import httpx


class StructurePrepAgent:
    """Reads structures from state, downloads PDB, returns pdb_content."""

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
        if not (state.get("analysis_plan") or {}).get("run_structure", True):
            return {}
        structures = state.get("structures", [])
        session_id = state.get("session_id", "default")
        tmp_dir = Path(f"/tmp/dda_structures/{session_id}")
        tmp_dir.mkdir(parents=True, exist_ok=True)

        pdb_content = None
        updated_structures = []

        for struct in structures[:3]:
            pdb_id = struct.get("pdb_id", "")
            if not pdb_id:
                continue
            local_path = tmp_dir / f"{pdb_id}.pdb"
            content = await self._download_pdb(pdb_id, local_path)
            if content:
                struct = dict(struct)
                struct["pdb_path"] = str(local_path)
                if pdb_content is None:
                    pdb_content = content
            updated_structures.append(struct)

        if not pdb_content:
            proteins = state.get("proteins", [])
            if proteins:
                seq = proteins[0].get("sequence", "")
                if seq:
                    pdb_content = await self._esm_fold(seq)

        return {
            "pdb_content": pdb_content or "",
            "structures": updated_structures if updated_structures else structures,
        }

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
