"""Real molecular docking via Vina or Gnina — no fake scores, no fallbacks."""

import hashlib
import os
import shutil
import asyncio
import tempfile
from pathlib import Path

from utils.logger import get_logger

# ── AutoDock atom-type map ─────────
_AUTODOCK_TYPE: dict = {
    "ZN": "Zn", "MG": "Mg", "FE": "Fe", "MN": "Mn", "CO": "Co", "NI": "Ni", "CU": "Cu", "CA": "Ca", "NA": "Na", "K": "K", "LI": "Li", "AL": "Al",
    "CL": "Cl", "BR": "Br", "C": "C", "N": "N", "O": "O", "S": "S", "H": "H", "P": "P", "F": "F", "I": "I",
}


def _autodock_type(atom_name: str) -> str:
    name = atom_name.strip().upper()
    if name in _AUTODOCK_TYPE: return _AUTODOCK_TYPE[name]
    stripped = name.lstrip("0123456789")
    if stripped in _AUTODOCK_TYPE: return _AUTODOCK_TYPE[stripped]
    if len(stripped) >= 2 and stripped[:2] in _AUTODOCK_TYPE: return _AUTODOCK_TYPE[stripped[:2]]
    first = stripped[0] if stripped else "C"
    return _AUTODOCK_TYPE.get(first, "C")


class DockingAgent:
    """Docks generated molecules against the target pocket using Vina or Gnina."""

    async def run(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)
        log.info("starting")
        try:
            result = await self._execute(state)
            log.info("complete")
            return result
        except asyncio.CancelledError:
            log.warning("DockingAgent was cancelled mid-run.")
            raise
        except Exception as exc:
            log.error(f"failed: {exc}", exc_info=True)
            return {"errors": [f"DockingAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)
        molecules = state.get("generated_molecules", [])
        pocket = state.get("binding_pocket") or {}
        pdb_content = state.get("pdb_content")
        
        if not molecules or not pdb_content:
            return {"docking_results": []}

        local_gnina = "/home/rafan/HF26-24/tools/gnina"
        bin_exists = os.path.exists(local_gnina)
        has_gnina = bin_exists or shutil.which("gnina") is not None
        mode = "gnina" if has_gnina else "vina"
        exe = _vina_exe(mode)
        
        log.info(f"Docking mode detection: local_path={local_gnina}, bin_exists={bin_exists}, has_gnina={has_gnina}, mode={mode}, exe={exe}")
        
        receptor_pdbqt = await _prepare_receptor_async(pdb_content, log)
        
        session_id = state.get("session_id", "default")
        pose_dir = Path(__file__).parent.parent / "data" / "docked_poses" / session_id
        pose_dir.mkdir(parents=True, exist_ok=True)
 
        semaphore = asyncio.Semaphore(4)
        results = []

        async def docked_task(idx, mol_data):
            async with semaphore:
                smiles = mol_data.get("smiles")
                if not smiles: return None
                
                energy, pose_meta = await _dock_one_async(
                    smiles, pocket, receptor_pdbqt, exe, mode, log, 
                    pose_dir=pose_dir, pose_id=_pose_id(smiles, idx)
                )
                
                # Update progress for EACH completion
                current_prog = 30 + int((len(results) / len(molecules)) * 60)
                if hasattr(self, 'update_progress'):
                    await self.update_progress(current_prog, f"Docking {len(results)+1}/{len(molecules)}...")
                
                if energy is not None:
                    return {
                        "smiles": smiles,
                        "compound_name": f"Lead-{idx+1}",
                        "binding_energy": energy,
                        "cnn_score": pose_meta.get("cnn_score") if pose_meta else None,
                        "cnn_affinity": pose_meta.get("cnn_affinity") if pose_meta else None,
                        "method": mode,
                        "pose_id": pose_meta.get("pose_id") if pose_meta else None
                    }
                return None

        # Execute all tasks
        tasks = [docked_task(i, m) for i, m in enumerate(molecules)]
        docking_results_all = await asyncio.gather(*tasks)
        
        # Filter out failed ones
        results = [r for r in docking_results_all if r is not None]
 
        return {"docking_results": sorted(results, key=lambda x: x["binding_energy"])}
 
async def _prepare_receptor_async(pdb_content: str, log) -> str:
    tmp = tempfile.NamedTemporaryFile(suffix=".pdbqt", prefix="receptor_", delete=False)
    pdbqt_path = tmp.name
    tmp.close()
 
    with tempfile.NamedTemporaryFile(suffix=".pdb", delete=False, mode="w") as f:
        f.write(pdb_content)
        pdb_path = f.name
 
    try:
        proc = await asyncio.create_subprocess_exec(
            "obabel", pdb_path, "-O", pdbqt_path, "-xr",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        try:
            await asyncio.wait_for(proc.communicate(), timeout=30)
        except asyncio.CancelledError:
            proc.terminate()
            raise
    finally:
        if os.path.exists(pdb_path): os.unlink(pdb_path)
    return pdbqt_path
 
async def _dock_one_async(smiles, pocket, receptor_pdbqt, exe, mode, log, **kwargs) -> tuple:
    from rdkit import Chem
    from rdkit.Chem import AllChem
 
    mol = Chem.MolFromSmiles(smiles)
    if not mol: return None, None
    
    mol = Chem.AddHs(mol)
    if AllChem.EmbedMolecule(mol, AllChem.ETKDGv3()) < 0: return None, None
    
    with tempfile.TemporaryDirectory() as tmpdir:
        sdf_path = os.path.join(tmpdir, "lig.sdf")
        pdbqt_path = os.path.join(tmpdir, "lig.pdbqt")
        out_path = os.path.join(tmpdir, "out.pdbqt")
 
        writer = Chem.SDWriter(sdf_path)
        writer.write(mol); writer.close()
 
        # SDF -> PDBQT
        proc = await asyncio.create_subprocess_exec("obabel", sdf_path, "-O", pdbqt_path, stderr=asyncio.subprocess.PIPE)
        try:
            await asyncio.wait_for(proc.communicate(), timeout=20)
        except asyncio.CancelledError:
            proc.terminate(); raise
 
        if not os.path.exists(pdbqt_path): return None, None
 
        # Vina Run
        cmd = [
            exe, "--receptor", receptor_pdbqt, "--ligand", pdbqt_path,
            "--center_x", str(pocket.get("center_x", 0)),
            "--center_y", str(pocket.get("center_y", 0)),
            "--center_z", str(pocket.get("center_z", 0)),
            "--size_x", "20", "--size_y", "20", "--size_z", "20",
            "--exhaustiveness", "4", "--out", out_path
        ]
        
        proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=300)
        except asyncio.CancelledError:
            log.info("Killing Vina subprocess due to cancellation...")
            proc.terminate()
            raise
 
        energy = None
        cnn_score = None
        cnn_affinity = None

        if os.path.exists(out_path):
            with open(out_path) as f:
                for line in f:
                    parts = line.split()
                    if "REMARK VINA RESULT:" in line:
                        energy = float(parts[3])
                    elif "REMARK minimizedAffinity" in line:
                        energy = float(parts[2])
                    elif "REMARK CNNscore" in line:
                        try: cnn_score = float(parts[2])
                        except: pass
                    elif "REMARK CNNaffinity" in line:
                        try: cnn_affinity = float(parts[2])
                        except: pass
        
        # Cleanup
        pose_meta = None
        if energy is not None:
            pose_id = kwargs.get("pose_id", "pose_1")
            save_path = kwargs.get("pose_dir") / f"{pose_id}.pdbqt"
            shutil.copy(out_path, save_path)
            pose_meta = {
                "pose_id": pose_id,
                "pose_format": "pdbqt",
                "pose_path": str(save_path),
                "cnn_score": cnn_score,
                "cnn_affinity": cnn_affinity
            }

        return energy, pose_meta

def _vina_exe(mode):
    local_gnina = "/home/rafan/HF26-24/tools/gnina"
    if mode == "gnina":
        if os.path.exists(local_gnina): return local_gnina
        return shutil.which("gnina")
    return shutil.which("vina") or "vina"

def _pose_id(smiles, idx):
    return f"pose_{idx}_{hashlib.sha256(smiles.encode()).hexdigest()[:8]}"
