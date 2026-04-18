"""Real molecular docking via Vina or Gnina — no fake scores, no fallbacks."""

import hashlib
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from utils.logger import get_logger

# ── AutoDock atom-type map (case-sensitive, Vina rejects wrong case) ─────────
_AUTODOCK_TYPE: dict = {
    # Metals — first-char heuristic gives wrong types; must be explicit
    "ZN": "Zn",
    "MG": "Mg",
    "FE": "Fe",
    "MN": "Mn",
    "CO": "Co",
    "NI": "Ni",
    "CU": "Cu",
    "CA": "Ca",
    "NA": "Na",
    "K": "K",
    "LI": "Li",
    "AL": "Al",
    # Halogens
    "CL": "Cl",
    "BR": "Br",
    # Standard non-metals (identity mapping)
    "C": "C",
    "N": "N",
    "O": "O",
    "S": "S",
    "H": "H",
    "P": "P",
    "F": "F",
    "I": "I",
}


def _autodock_type(atom_name: str) -> str:
    """Map a PDB atom name to a valid, case-sensitive AutoDock atom type.

    Lookup order:
    1. Full stripped name          (ZN → Zn, CL → Cl …)
    2. Leading-digit-stripped name (1HB → H …)
    3. Two-character prefix        (ZN1 → ZN → Zn …)
    4. First-character fallback    (C, N, O, S …)
    """
    name = atom_name.strip().upper()
    if name in _AUTODOCK_TYPE:
        return _AUTODOCK_TYPE[name]
    stripped = name.lstrip("0123456789")
    if stripped in _AUTODOCK_TYPE:
        return _AUTODOCK_TYPE[stripped]
    if len(stripped) >= 2 and stripped[:2] in _AUTODOCK_TYPE:
        return _AUTODOCK_TYPE[stripped[:2]]
    first = stripped[0] if stripped else "C"
    return _AUTODOCK_TYPE.get(first, "C")


class DockingAgent:
    """Docks generated molecules against the target pocket using Vina or Gnina."""

    UNCERTAINTY = {"vina": 1.8, "gnina": 1.5}

    async def run(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)
        log.info("starting")
        try:
            result = await self._execute(state)
            log.info("complete")
            return result
        except Exception as exc:
            log.error("failed", exc_info=True)
            return {"errors": [f"DockingAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)

        molecules = state.get("generated_molecules", [])
        pocket = state.get("binding_pocket") or {}
        structures = state.get("structures", [])
        pdb_content: str | None = state.get("pdb_content")
        pdb_id = structures[0].get("pdb_id", "unknown") if structures else "unknown"

        log.info(
            f"DockingAgent state: molecules={len(molecules)}, "
            f"pdb_content_length={len(pdb_content) if pdb_content else 0}, "
            f"pdb_id={pdb_id}, structures={len(structures)}"
        )

        if not molecules:
            return {"docking_results": [], "docking_mode": "no_molecules"}

        if not pdb_content:
            raise RuntimeError(
                "No PDB structure available — cannot dock without real protein coordinates"
            )

        has_gnina = shutil.which("gnina") is not None
        has_vina = shutil.which("vina") is not None or os.path.exists(r"C:\tools\vina.exe")

        if not has_vina and not has_gnina:
            raise RuntimeError("Neither Vina nor Gnina is installed — cannot perform real docking")

        mode = "gnina" if has_gnina else "vina"
        exe = _vina_exe(mode)
        log.info(f"Docking mode detection: has_gnina={has_gnina}, has_vina={has_vina}, mode={mode}")

        # Prepare receptor once — reused for every ligand
        receptor_pdbqt = _prepare_receptor(pdb_content, log)

        has_wt = state.get("has_wt", False)
        wt_pdb_content: str = state.get("wt_pdb_content", "")
        wt_receptor_pdbqt = (
            _prepare_receptor(wt_pdb_content, log) if (has_wt and wt_pdb_content) else None
        )

        session_id = state.get("session_id", "default")
        pose_dir = Path(__file__).parent.parent / "data" / "docked_poses" / session_id
        pose_dir.mkdir(parents=True, exist_ok=True)
        pose_map: dict[str, str] = {}

        results: list = []
        skipped = 0

        for idx, mol in enumerate(molecules[:50], start=1):
            smiles = mol.get("smiles", "")
            if not smiles:
                continue

            pose_id = _pose_id(smiles, idx)
            mut_energy, pose_meta = await _dock_one(
                smiles,
                pocket,
                receptor_pdbqt,
                exe,
                log,
                pose_dir=pose_dir,
                pose_id=pose_id,
                persist_pose=True,
            )
            if mut_energy is None:
                skipped += 1
                continue

            if pose_meta and pose_meta.get("pose_path"):
                pose_map[pose_meta["pose_id"]] = pose_meta["pose_path"]

            entry = {
                "smiles": smiles,
                "compound_name": f"Molecule_{len(results) + 1}",
                "structure": pdb_id,
                "binding_energy": mut_energy,
                "binding_energy_formatted": _fmt(mut_energy, mode),
                "confidence": _confidence(mut_energy),
                "method": mode,
                "pose_id": pose_meta.get("pose_id") if pose_meta else None,
                "pose_format": pose_meta.get("pose_format") if pose_meta else None,
                "is_mock": False,
            }

            if wt_receptor_pdbqt:
                wt_energy, _ = await _dock_one(
                    smiles,
                    pocket,
                    wt_receptor_pdbqt,
                    exe,
                    log,
                    persist_pose=False,
                )
                if wt_energy is not None:
                    delta = mut_energy - wt_energy
                    entry["wt_binding_energy"] = wt_energy
                    entry["affinity_delta"] = delta
                    entry["selectivity_10fold"] = delta < -1.36  # ~10× at 298 K
                    entry["is_selective"] = delta < -0.68  # ~5×  at 298 K

            results.append(entry)

        log.info(f"Docking complete: {len(results)} docked, {skipped} skipped (failed prep)")
        results.sort(key=lambda x: x["binding_energy"])

        if state.get("confidence") is None:
            state["confidence"] = {}
        state["confidence"]["docking"] = 0.7 if mode == "vina" else 0.8

        if pose_map:
            state["docked_pose_map"] = {
                **state.get("docked_pose_map", {}),
                **pose_map,
            }

        return {
            "docking_results": results,
            "docking_mode": mode,
            "has_vina": has_vina,
            "has_gnina": has_gnina,
            "dual_docking": has_wt,
        }


# ── Module-level helpers ──────────────────────────────────────────────────────


async def _dock_one(
    smiles: str,
    pocket: dict,
    receptor_pdbqt: str,
    exe: str,
    log,
    *,
    pose_dir: Path | None = None,
    pose_id: str | None = None,
    persist_pose: bool = True,
) -> tuple[float | None, dict | None]:
    """Prepare one ligand and run a single Vina/Gnina docking job.

    Returns the best binding energy (kcal/mol, always negative) or None
    when the molecule cannot be prepared or Vina rejects it.
    There is no scoring fallback — callers skip None results.
    """
    from rdkit import Chem
    from rdkit.Chem import AllChem

    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None, None
    try:
        Chem.SanitizeMol(mol)
    except Exception:
        return None, None

    mol = Chem.AddHs(mol)

    # Embed with ETKDGv3; fall back to ETKDGv2 if unavailable
    try:
        params = AllChem.ETKDGv3()
    except AttributeError:
        params = AllChem.ETKDGv2()

    conf_id = AllChem.EmbedMolecule(mol, params)
    if conf_id < 0:
        return None, None  # Cannot generate 3-D coordinates — skip molecule

    try:
        AllChem.MMFFOptimizeMolecule(mol)
    except Exception:
        pass  # Best-effort; continue with un-optimised geometry

    # Sanity-check for NaN coordinates
    conf = mol.GetConformer()
    for i in range(mol.GetNumAtoms()):
        p = conf.GetAtomPosition(i)
        if p.x != p.x:  # NaN check (NaN != NaN is True)
            return None, None

    with tempfile.TemporaryDirectory() as tmpdir:
        sdf_path = os.path.join(tmpdir, "ligand.sdf")
        pdbqt_path = os.path.join(tmpdir, "ligand.pdbqt")
        out_path = os.path.join(tmpdir, "docked.pdbqt")

        writer = Chem.SDWriter(sdf_path)
        writer.write(mol)
        writer.close()

        # Convert SDF → ligand PDBQT via obabel.
        #
        # ⚠️  Do NOT post-process with any clean-up that strips ROOT / ENDROOT /
        # BRANCH / ENDBRANCH / TORSDOF.  Vina REQUIRES these records in the
        # ligand file to parse the torsional tree.  Removing them causes:
        #   "Unknown or inappropriate tag found in flex residue or ligand"
        #
        # The SDF already has 3-D coordinates from RDKit — do NOT pass --gen3d.
        obabel = subprocess.run(
            ["obabel", sdf_path, "-O", pdbqt_path],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if obabel.returncode != 0 or not os.path.exists(pdbqt_path):
            log.warning(f"obabel ligand conversion failed for {smiles[:40]}: {obabel.stderr[:120]}")
            return None, None

        cmd = [
            exe,
            "--receptor",
            receptor_pdbqt,
            "--ligand",
            pdbqt_path,
            "--center_x",
            str(pocket.get("center_x", 0)),
            "--center_y",
            str(pocket.get("center_y", 0)),
            "--center_z",
            str(pocket.get("center_z", 0)),
            "--size_x",
            str(min(pocket.get("size_x", 20), 20)),
            "--size_y",
            str(min(pocket.get("size_y", 20), 20)),
            "--size_z",
            str(min(pocket.get("size_z", 20), 20)),
            "--exhaustiveness",
            "4",
            "--out",
            out_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

        if result.returncode != 0:
            log.error(f"Vina error: returncode={result.returncode}, stderr={result.stderr[:200]}")
            return None, None

        energy: float | None = None

        # Vina writes REMARK VINA RESULT lines into the output PDBQT, not stdout.
        if os.path.exists(out_path):
            try:
                with open(out_path) as f:
                    for line in f:
                        if "REMARK VINA RESULT:" in line:
                            parts = line.split()
                            if len(parts) >= 4:
                                energy = float(parts[3])
                                break
            except Exception:
                pass

        # Fallback: some builds print a table to stdout; parse affinity if present.
        if energy is None:
            for line in result.stdout.splitlines():
                if line.strip().startswith("1 "):
                    parts = line.split()
                    if len(parts) >= 2:
                        try:
                            energy = float(parts[1])
                            break
                        except ValueError:
                            continue

        if energy is None:
            log.warning(f"Vina produced no REMARK VINA RESULT for {smiles[:40]}")
            return None, None

        pose_meta = None
        if persist_pose and pose_dir and pose_id and os.path.exists(out_path):
            pose_meta = _persist_pose(out_path, pose_dir, pose_id, log)

        return energy, pose_meta


def _pose_id(smiles: str, idx: int) -> str:
    digest = hashlib.sha256(f"{smiles}|{idx}".encode()).hexdigest()[:12]
    return f"pose_{idx}_{digest}"


def _persist_pose(out_path: str, pose_dir: Path, pose_id: str, log) -> dict | None:
    pose_dir.mkdir(parents=True, exist_ok=True)
    pdbqt_path = pose_dir / f"{pose_id}.pdbqt"
    try:
        shutil.copy(out_path, pdbqt_path)
    except Exception as exc:
        log.warning(f"Failed to persist pose {pose_id}: {exc}")
        return None

    pose_path = pdbqt_path
    pose_format = "pdbqt"

    if shutil.which("obabel"):
        pdb_path = pose_dir / f"{pose_id}.pdb"
        obabel = subprocess.run(
            ["obabel", str(pdbqt_path), "-O", str(pdb_path)],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if obabel.returncode == 0 and pdb_path.exists():
            _sanitize_pose_pdb(pdb_path)
            pose_path = pdb_path
            pose_format = "pdb"

    return {
        "pose_id": pose_id,
        "pose_path": str(pose_path),
        "pose_format": pose_format,
    }


def _sanitize_pose_pdb(pdb_path: Path) -> None:
    """Keep a single-model ligand PDB to avoid multi-model parser issues."""
    try:
        lines = pdb_path.read_text().splitlines()
    except Exception:
        return

    keep = []
    in_model = False
    saw_model = False
    for line in lines:
        if line.startswith("MODEL"):
            if saw_model:
                break
            saw_model = True
            in_model = True
            continue
        if line.startswith("ENDMDL"):
            break
        if line.startswith(("ATOM", "HETATM", "CONECT", "TER")):
            keep.append(line)

    if not keep:
        return

    try:
        pdb_path.write_text("\n".join(keep) + "\nEND\n")
    except Exception:
        pass

def _prepare_receptor(pdb_content: str, log) -> str:
    """Convert PDB text to a Vina-compatible receptor PDBQT file.

    Strategy (in order):
    1. obabel with -xr  (rigid receptor mode) — handles all element types.
    2. Direct PDB→PDBQT conversion with correct AutoDock atom-type mapping.

    Returns the path of a NamedTemporaryFile (delete=False) that persists for
    the lifetime of the process.  The OS cleans it on exit.
    """
    tmp = tempfile.NamedTemporaryFile(suffix=".pdbqt", prefix="receptor_", delete=False)
    pdbqt_path = tmp.name
    tmp.close()

    # Write PDB to a temp file so obabel can read it
    pdb_tmp = tempfile.NamedTemporaryFile(suffix=".pdb", delete=False, mode="w")
    pdb_tmp.write(pdb_content)
    pdb_path = pdb_tmp.name
    pdb_tmp.close()

    try:
        result = subprocess.run(
            ["obabel", pdb_path, "-O", pdbqt_path, "-xr"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if (
            result.returncode == 0
            and os.path.exists(pdbqt_path)
            and os.path.getsize(pdbqt_path) > 0
        ):
            # obabel succeeded.  Receptors must NOT have ROOT/TORSDOF/BRANCH —
            # strip any that obabel might emit (safe for receptors only).
            _clean_receptor_pdbqt(pdbqt_path)
            log.info(f"Receptor PDBQT prepared via obabel ({os.path.getsize(pdbqt_path)} bytes)")
            return pdbqt_path
        else:
            log.warning(f"obabel receptor conversion failed: {result.stderr[:200]}")
    except FileNotFoundError:
        log.warning("obabel not found for receptor prep — using direct parser")
    except Exception as exc:
        log.warning(f"obabel receptor prep error: {exc}")
    finally:
        try:
            os.unlink(pdb_path)
        except Exception:
            pass

    # obabel unavailable or failed — build PDBQT directly from PDB text
    _write_receptor_pdbqt(pdb_content, pdbqt_path)
    log.info(f"Receptor PDBQT prepared via direct parser ({os.path.getsize(pdbqt_path)} bytes)")
    return pdbqt_path


def _clean_receptor_pdbqt(path: str) -> None:
    """Remove ROOT / TORSDOF / BRANCH lines from a RECEPTOR PDBQT file.

    ⚠️  Call ONLY on receptor files.  Ligand PDBQT files need these records.
    """
    try:
        with open(path) as f:
            lines = f.readlines()
        skip_tags = ("ROOT", "ENDROOT", "TORSDOF", "BRANCH", "ENDBRANCH")
        kept = [l for l in lines if not any(l.startswith(t) for t in skip_tags)]
        with open(path, "w") as f:
            f.writelines(kept)
    except Exception:
        pass


def _write_receptor_pdbqt(pdb_content: str, pdbqt_path: str) -> None:
    """Build a minimal Vina-compatible receptor PDBQT directly from PDB text.

    Uses _autodock_type() to produce correct, case-sensitive AutoDock types
    (e.g. ZN → Zn, CL → Cl) instead of the naive first-char-upper heuristic
    that was producing invalid types like Z for zinc.
    """
    out = ["REMARK PDBQT receptor (direct parser)\n"]

    for raw in pdb_content.splitlines():
        if not raw.startswith(("ATOM", "HETATM")):
            continue
        try:
            serial = int(raw[6:11])
            aname = raw[12:16].strip()
            res_name = raw[17:20].strip() or "RES"
            chain = raw[21] if len(raw) > 21 else "A"
            res_seq = int(raw[22:26]) if raw[22:26].strip() else 1
            x = float(raw[30:38])
            y = float(raw[38:46])
            z = float(raw[46:54])
        except (ValueError, IndexError):
            continue

        atype = _autodock_type(aname)
        out.append(
            f"ATOM  {serial:5d} {aname:<4s} {res_name:>3s} {chain}{res_seq:4d}"
            f"    {x:8.3f}{y:8.3f}{z:8.3f}  1.00  0.00    {0.0:>6.3f} {atype:<2s}\n"
        )

    out.append("ENDMDL\n")
    with open(pdbqt_path, "w") as f:
        f.writelines(out)


def _vina_exe(mode: str) -> str:
    if mode == "gnina":
        return shutil.which("gnina") or "gnina"
    win = r"C:\tools\vina.exe"
    return win if os.path.exists(win) else (shutil.which("vina") or "vina")


def _fmt(energy: float, method: str) -> str:
    u = {"vina": 1.8, "gnina": 1.5}.get(method, 2.0)
    return f"{energy:.1f} ± {u:.1f} kcal/mol ({method.upper()})"


def _confidence(energy: float) -> str:
    if energy <= -10:
        return "Very Strong"
    if energy <= -8:
        return "Strong"
    if energy <= -6:
        return "Moderate"
    return "Weak"
