@echo off
setlocal enabledelayedexpansion

echo 🧬 Drug Discovery AI — Quick Start (Windows)
echo =============================================
echo AXONENGINE v4.0 with Advanced ML Features
echo.

:: ── Backend Setup ────────────────────────────────────────────────────────────
echo.
echo ^> Configuring backend environment...

cd backend

if not exist ".env" (
    copy .env.example .env
    echo   WARNING: Created backend\.env from .env.example — add your API keys!
)

if not exist ".venv" (
    echo   Creating Python virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

echo   Installing core Python dependencies...
pip install -r requirements.txt -q

:: ── V4 Optional Features ──────────────────────────────────────────────────────
echo.
echo 🔬 V4 OPTIONAL ML FEATURES (Enhanced Predictions)
echo   ^> Checking for optional molecular docking tools...

:: Check for Vina (real docking)
pip list | findstr /I "vina" >nul 2>&1
if errorlevel 1 (
    echo   ⚠ Vina not installed - molecular docking disabled ^(using hash fallback^)
    echo     Install with: pip install vina meeko
) else (
    echo   ✓ Vina found - real docking enabled
)

:: Check for optional ML features
echo.
echo 🤖 Optional ML Model Features ^(slow first run, requires 4GB VRAM^):
echo    To enable V4 ML features, install: pip install -r requirements-v4.txt
echo    Features include:
echo      • ESM-1v variant pathogenicity scoring
echo      • DimeNet^+^+ GNN affinity prediction
echo      • Pocket2Mol 3D-conditioned generation
echo    Set env variable: set ENABLE_V4_ML=1
echo.

echo   Launching uvicorn on http://localhost:8000 ...
start "Drug Discovery AI - Backend" cmd /k "call .venv\Scripts\activate.bat && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

cd ..

:: ── Frontend ──────────────────────────────────────────────────────────────────
echo.
echo ^> Starting frontend...

cd frontend

if not exist ".env.local" (
    copy .env.local.example .env.local
    echo   WARNING: Created frontend\.env.local from .env.local.example
)

if not exist "node_modules" (
    echo   Installing npm dependencies...
    npm install
)

echo   Launching Next.js on http://localhost:3000 ...
start "Drug Discovery AI - Frontend" cmd /k "npm run dev"

cd ..

:: ── Done ─────────────────────────────────────────────────────────────────────
echo.
echo ✅ Both services launching in separate windows:
echo    Frontend ^> http://localhost:3000
echo    Backend  ^> http://localhost:8000
echo    API Docs ^> http://localhost:8000/docs
echo.
echo Close the backend and frontend windows to stop the servers.
echo.
pause
