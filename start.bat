@echo off
setlocal enabledelayedexpansion

echo 🧬 ProEngine Labs — Enterprise Setup (Windows)
echo ===============================================
echo This script launches the ProEngine Labs pipeline.
echo.

:: --- 1. Environment Check ---
echo ^> Checking for Python 3.11...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.11 from https://www.python.org/
    pause
    exit /b 1
)

:: --- 2. Backend Setup ---
echo.
echo ^> Configuring backend environment...
cd backend
if not exist ".env" (
    copy .env.example .env
    echo   ⚠️ Created backend\.env - add your API keys!
)

if not exist ".venv" (
    echo   Creating virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat
echo   Installing packages and fixing dependencies...
pip install -r requirements.txt -q
pip install "urllib3<2.0" -q

echo   Launching backend...
start "ProEngine Labs - Backend" cmd /k "call .venv\Scripts\activate.bat && uvicorn main:app --reload --host 0.0.0.0 --port 7860"
cd ..

:: --- 3. Frontend Setup ---
echo.
echo ^> Configuring frontend environment...
cd frontend
if not exist ".env.local" (
    copy .env.local.example .env.local
)

echo ^> Checking for Node.js...
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js v20+ from https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo   Installing npm dependencies...
    npm install
)

echo   Launching frontend...
start "ProEngine Labs - Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ✅ ProEngine Labs Services Starting:
echo    Frontend ^> http://localhost:3000
echo    Backend  ^> http://localhost:7860
echo.
echo Close the separate windows to stop the servers.
pause
