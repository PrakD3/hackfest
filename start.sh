#!/bin/bash
set -e

# AXONENGINE v4.0 — Drug Discovery AI Quick Start (Unix/Linux/Mac)
# ================================================================

echo "🧬 Drug Discovery AI — Quick Start (Unix/Linux/Mac)"
echo "======================================================"
echo "AXONENGINE v4.0 with Advanced ML Features"
echo ""

# ── Backend Setup ────────────────────────────────────────────────────────────
echo ""
echo "> Configuring backend environment..."

cd backend

# Create .env if not exists
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "  WARNING: Created backend/.env from .env.example — add your API keys!"
    else
        echo "  WARNING: No .env.example found. Create backend/.env manually."
    fi
fi

# Create virtual environment if not exists
if [ ! -d ".venv" ]; then
    echo "  Creating Python virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
echo "  Installing core Python dependencies..."
pip install -q -r requirements.txt 2>/dev/null || pip install -r requirements.txt

# ── V4 Optional Features ──────────────────────────────────────────────────────
echo ""
echo "🔬 V4 OPTIONAL ML FEATURES (Enhanced Predictions)"
echo "  > Checking for optional molecular docking tools..."

# Check for Vina
if pip list | grep -q vina; then
    echo "  ✓ Vina found - real docking enabled"
else
    echo "  ⚠ Vina not installed - molecular docking disabled (using hash fallback)"
    echo "    Install with: pip install vina meeko"
fi

# Check for ML features
echo ""
echo "🤖 Optional ML Model Features (slow first run, requires 4GB VRAM):"
echo "   To enable V4 ML features, install: pip install -r requirements-v4.txt"
echo "   Features include:"
echo "     • ESM-1v variant pathogenicity scoring"
echo "     • DimeNet++ GNN affinity prediction"
echo "     • Pocket2Mol 3D-conditioned generation"
echo "   Set env variable: export ENABLE_V4_ML=1"
echo ""

# Start backend in background
echo "  Launching uvicorn on http://localhost:8000 ..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd ..

# ── Frontend ──────────────────────────────────────────────────────────────────
echo ""
echo "> Starting frontend..."

cd frontend

# Create .env.local if not exists
if [ ! -f ".env.local" ]; then
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        echo "  Created frontend/.env.local from .env.local.example"
    else
        cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
        echo "  Created frontend/.env.local"
    fi
fi

# Install npm dependencies
if [ ! -d "node_modules" ]; then
    echo "  Installing npm dependencies..."
    npm install
fi

# Start frontend in background
echo "  Launching Next.js on http://localhost:3000 ..."
npm run dev &
FRONTEND_PID=$!

cd ..

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "✅ Both services launching:"
echo "   Frontend  > http://localhost:3000"
echo "   Backend   > http://localhost:8000"
echo "   API Docs  > http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both services
wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true

# Cleanup
echo ""
echo "Shutting down services..."
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
