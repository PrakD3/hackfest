"""System health check: validate required tools at startup."""

import subprocess
import sys
from pathlib import Path


def check_vina() -> bool:
    """Check if AutoDock Vina is installed."""
    try:
        subprocess.run(
            ["vina", "--help"],
            capture_output=True,
            timeout=5,
            check=False
        )
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def check_obabel() -> bool:
    """Check if OpenBabel (obabel) is installed."""
    try:
        subprocess.run(
            ["obabel", "-V"],
            capture_output=True,
            timeout=5,
            check=False
        )
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def check_fpocket() -> bool:
    """Check if fpocket is installed."""
    try:
        subprocess.run(
            ["fpocket", "-h"],
            capture_output=True,
            timeout=5,
            check=False
        )
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def validate_system() -> dict:
    """Run all health checks and return status."""
    return {
        "vina": check_vina(),
        "obabel": check_obabel(),
        "fpocket": check_fpocket(),
    }


def print_health_report():
    """Print a startup health report."""
    status = validate_system()
    
    print("\n" + "="*60)
    print("AXONENGINE v4 — System Health Check")
    print("="*60)
    
    for tool, available in status.items():
        marker = "✅" if available else "❌"
        print(f"{marker} {tool.upper()}: {'Available' if available else 'MISSING'}")
    
    print("="*60)
    
    missing = [k for k, v in status.items() if not v]
    if missing:
        print(f"\n⚠️  Missing tools: {', '.join(missing)}")
        print("\nInstall on Linux/WSL:")
        print("  sudo apt install autodock-vina openbabel fpocket")
        print("\nInstall on macOS:")
        print("  brew install autodock-vina open-babel fpocket")
        print("\nWithout these tools, docking/selectivity results will be SIMULATED.\n")
    else:
        print("\n✅ All tools available! Full functionality enabled.\n")
    
    return status
