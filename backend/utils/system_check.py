"""System capability detection."""

import shutil
import subprocess
import sys

from utils.logger import get_logger

log = get_logger("system_check")


def check_vina() -> bool:
    return shutil.which("vina") is not None


def check_gnina() -> bool:
    return shutil.which("gnina") is not None


def check_fpocket() -> bool:
    return shutil.which("fpocket") is not None


def check_obabel() -> bool:
    return shutil.which("obabel") is not None


def check_rdkit() -> bool:
    try:
        from rdkit import Chem

        return True
    except ImportError:
        return False


def check_deepchem() -> bool:
    try:
        import deepchem

        return True
    except ImportError:
        return False


def get_system_status() -> dict:
    return {
        "vina": check_vina(),
        "gnina": check_gnina(),
        "fpocket": check_fpocket(),
        "obabel": check_obabel(),
        "rdkit": check_rdkit(),
        "deepchem": check_deepchem(),
        "python_version": sys.version,
        "docking_mode": "gnina"
        if check_gnina()
        else ("vina" if check_vina() else "ai_fallback"),
        "pocket_detection": "fpocket" if check_fpocket() else "centroid_fallback",
    }
