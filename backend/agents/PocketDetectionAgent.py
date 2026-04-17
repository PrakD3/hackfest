"""Detect binding pocket via fpocket, known sites, or centroid fallback."""

import json
import re
import shutil
import subprocess
from pathlib import Path

KNOWN_SITES_PATH = Path(__file__).parent.parent / "data" / "known_active_sites.json"


class PocketDetectionAgent:
    """Reads pdb_content+structures, writes binding_pocket."""

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
            return {"errors": [f"PocketDetectionAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        if not (state.get("analysis_plan") or {}).get("run_pocket_detection", True):
            return {}
        structures = state.get("structures", [])
        pdb_content = state.get("pdb_content", "")

        known = self._check_known_sites(structures)
        if known:
            return {
                "binding_pocket": {**known, "method": "known_site"},
                "pocket_detection_method": "known_site",
            }

        if shutil.which("fpocket") and structures:
            pdb_path = structures[0].get("pdb_path")
            if pdb_path:
                pocket = self._run_fpocket(pdb_path)
                if pocket:
                    return {
                        "binding_pocket": {**pocket, "method": "fpocket"},
                        "pocket_detection_method": "fpocket",
                    }

        if pdb_content:
            centroid = self._centroid_fallback(pdb_content)
            return {
                "binding_pocket": {**centroid, "method": "centroid"},
                "pocket_detection_method": "centroid",
            }

        return {
            "binding_pocket": {
                "center_x": 0.0,
                "center_y": 0.0,
                "center_z": 0.0,
                "size_x": 20,
                "size_y": 20,
                "size_z": 20,
                "score": 0.0,
                "method": "default",
            },
            "pocket_detection_method": "default",
        }

    def _check_known_sites(self, structures: list) -> dict | None:
        try:
            with open(KNOWN_SITES_PATH) as f:
                known = json.load(f)
        except Exception:
            return None
        for struct in structures:
            pdb_id = struct.get("pdb_id", "")
            if pdb_id in known:
                return known[pdb_id]
        return None

    def _run_fpocket(self, pdb_path: str) -> dict | None:
        try:
            subprocess.run(["fpocket", "-f", pdb_path], capture_output=True, timeout=30)
            out_dir = pdb_path.replace(".pdb", "_out")
            info_file = Path(out_dir) / f"{Path(pdb_path).stem}_info.txt"
            if info_file.exists():
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

    def _centroid_fallback(self, pdb_content: str) -> dict:
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
