"""System capability detection."""

import shutil
import subprocess
import sys
import warnings

# Suppress optional dependency warnings from deepchem
warnings.filterwarnings("ignore", message=".*PyTorch.*")
warnings.filterwarnings("ignore", message=".*TensorFlow.*")
warnings.filterwarnings("ignore", message=".*JAX.*")
warnings.filterwarnings("ignore", message=".*normalization.*")

from utils.logger import get_logger

log = get_logger("system_check")


def check_vina() -> bool:
    # Check system PATH
    if shutil.which("vina") is not None:
        return True
    # Check PyRx installation (Windows)
    import os
    pyrx_paths = [
        r"C:\Program Files (x86)\PyRx\vina.exe",
        r"C:\Program Files\PyRx\vina.exe",
    ]
    for path in pyrx_paths:
        if os.path.exists(path):
            return True
    return False


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
