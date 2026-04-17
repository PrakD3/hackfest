"""Pocket detection utilities (fpocket wrapper + centroid fallback)."""

import re
import subprocess
from pathlib import Path


def detect_pocket_fpocket(pdb_path: str) -> dict | None:
    """Run fpocket and parse the first pocket."""
    try:
        subprocess.run(["fpocket", "-f", pdb_path], capture_output=True, timeout=30)
        stem = Path(pdb_path).stem
        out_dir = Path(pdb_path).parent / f"{stem}_out"
        info_file = out_dir / f"{stem}_info.txt"
        if not info_file.exists():
            return None
        text = info_file.read_text()
        pocket1 = text.split("Pocket 1")[1] if "Pocket 1" in text else ""
        cx = re.search(r"x_barycenter\s*:\s*([\d\.\-]+)", pocket1)
        cy = re.search(r"y_barycenter\s*:\s*([\d\.\-]+)", pocket1)
        cz = re.search(r"z_barycenter\s*:\s*([\d\.\-]+)", pocket1)
        score = re.search(r"Druggability Score\s*:\s*([\d\.]+)", pocket1)
        if cx and cy and cz:
            return {
                "center_x": float(cx.group(1)),
                "center_y": float(cy.group(1)),
                "center_z": float(cz.group(1)),
                "size_x": 20,
                "size_y": 20,
                "size_z": 20,
                "score": float(score.group(1)) if score else 0.5,
            }
    except Exception:
        pass
    return None


def centroid_from_pdb(pdb_content: str) -> dict:
    """Compute centroid of all ATOM/HETATM coordinates."""
    xs, ys, zs = [], [], []
    for line in pdb_content.splitlines():
        if line.startswith("ATOM") or line.startswith("HETATM"):
            try:
                xs.append(float(line[30:38]))
                ys.append(float(line[38:46]))
                zs.append(float(line[46:54]))
            except (ValueError, IndexError):
                continue
    if xs:
        return {
            "center_x": round(sum(xs) / len(xs), 2),
            "center_y": round(sum(ys) / len(ys), 2),
            "center_z": round(sum(zs) / len(zs), 2),
            "size_x": 20,
            "size_y": 20,
            "size_z": 20,
            "score": 0.0,
        }
    return {
        "center_x": 0.0,
        "center_y": 0.0,
        "center_z": 0.0,
        "size_x": 20,
        "size_y": 20,
        "size_z": 20,
        "score": 0.0,
    }
