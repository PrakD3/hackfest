"""GET /api/docked-poses/{session_id}/{pose_id} — docked ligand pose file."""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()


@router.get("/docked-poses/{session_id}/{pose_id}")
async def get_docked_pose(session_id: str, pose_id: str):
    from agents.OrchestratorAgent import _sessions

    docked_root = (Path(__file__).parent.parent / "data" / "docked_poses").resolve()

    pose_path = None
    state = _sessions.get(session_id)
    if state:
        pose_map = state.get("docked_pose_map", {})
        pose_path = pose_map.get(pose_id)

    if pose_path:
        path = Path(pose_path)
    else:
        # Fallback to filesystem for sessions that were evicted/reloaded.
        base = docked_root / session_id
        candidate_pdb = base / f"{pose_id}.pdb"
        candidate_pdbqt = base / f"{pose_id}.pdbqt"
        if candidate_pdb.exists():
            path = candidate_pdb
        elif candidate_pdbqt.exists():
            path = candidate_pdbqt
        else:
            raise HTTPException(status_code=404, detail="Docked pose not found")

    if not path.exists():
        raise HTTPException(status_code=404, detail="Docked pose file missing")

    try:
        if docked_root.exists() and not str(path.resolve()).startswith(str(docked_root)):
            raise HTTPException(status_code=400, detail="Invalid pose path")
    except Exception:
        pass

    media_type = "chemical/x-pdb" if path.suffix.lower() == ".pdb" else "chemical/x-pdbqt"
    return FileResponse(path, media_type=media_type, filename=path.name)
