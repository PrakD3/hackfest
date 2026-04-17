@echo off
setlocal enabledelayedexpansion

echo 🧬 Drug Discovery AI — Quick Start (Windows)
echo =============================================

:: ── Backend ──────────────────────────────────────────────────────────────────
echo.
echo ^> Starting backend...

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

echo   Installing Python dependencies...
pip install -r requirements.txt -q

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
