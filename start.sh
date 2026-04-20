#!/bin/bash

# ====================================================================
# ProEngine Labs — Enterprise Discovery Pipeline Setup & Launcher
# ====================================================================
# This script automates the installation of Miniconda, Python 3.11,
# Bio-informatics tools (Vina, fpocket, Open Babel), and Node.js.
# ====================================================================

set -e # Exit on error

echo "🧬 ProEngine Labs — Enterprise Setup"
echo "======================================"

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TOOLS_DIR="$PROJECT_ROOT/tools"
mkdir -p "$TOOLS_DIR"

# --- 1. Detect OS ---
OS_TYPE="$(uname -s)"
case "$OS_TYPE" in
    Linux*)     OS="Linux";;
    Darwin*)    OS="MacOS";;
    *)          OS="Unknown"; echo "❌ Unsupported OS: $OS_TYPE"; exit 1;;
esac

echo "🖥️  Detected OS: $OS"

# --- 2. Check/Install Miniconda ---
CONDA_PATH="$HOME/miniconda3"
if [ -d "$TOOLS_DIR/miniconda" ]; then
    CONDA_PATH="$TOOLS_DIR/miniconda"
fi

if ! command -v conda &> /dev/null && [ ! -f "$CONDA_PATH/bin/conda" ]; then
    echo "📦 Miniconda not found. Downloading..."
    if [ "$OS" == "Linux" ]; then
        CONDA_URL="https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh"
    else
        CONDA_URL="https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-arm64.sh"
    fi
    
    curl -L "$CONDA_URL" -o "$TOOLS_DIR/miniconda.sh"
    bash "$TOOLS_DIR/miniconda.sh" -b -p "$TOOLS_DIR/miniconda"
    rm "$TOOLS_DIR/miniconda.sh"
    CONDA_PATH="$TOOLS_DIR/miniconda"
fi

# Initialize Conda for this script
if [ -f "$CONDA_PATH/bin/conda" ]; then
    source "$CONDA_PATH/etc/profile.d/conda.sh"
else
    # Try global conda
    CONDA_EXEC=$(which conda || echo "")
    if [ -n "$CONDA_EXEC" ]; then
        source "$(dirname "$CONDA_EXEC")/../etc/profile.d/conda.sh"
    fi
fi

if ! command -v conda &> /dev/null; then
    echo "❌ Conda installation failed or not found in path."
    exit 1
fi

# --- 3. Create/Update Conda Environment ---
ENV_NAME="proengine"
echo "🌐 Setting up Conda environment: $ENV_NAME (Python 3.11)"

if ! conda env list | grep -q "$ENV_NAME"; then
    conda create -y -n "$ENV_NAME" python=3.11
fi

conda activate "$ENV_NAME"

# --- 4. Install Bio-informatics Tools ---
echo "🧪 Installing Bio-informatics dependencies (Vina, fpocket, Open Babel)..."
conda install -y -c conda-forge \
    vina \
    fpocket \
    openbabel \
    rdkit \
    numpy \
    pip \
    -n "$ENV_NAME"

# --- 5. Install Backend Requirements ---
echo "python --version"
python --version
echo "📦 Installing backend python packages..."
cd "$PROJECT_ROOT/backend"
pip install -r requirements.txt

# Fix urllib3 warning immediately if it persists
pip install "urllib3<2.0"

# --- 6. Check/Install Node.js ---
cd "$PROJECT_ROOT"
REQUIRED_NODE=20
HAS_NODE=false

if command -v node &> /dev/null; then
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -ge "$REQUIRED_NODE" ]; then
        HAS_NODE=true
        echo "🟢 Node.js $(node -v) detected."
    fi
fi

if [ "$HAS_NODE" = false ]; then
    echo "🟢 Node.js $REQUIRED_NODE+ missing. Installing local Node.js..."
    # Use nvm-sh/nvm or binary download? Let's use a simple binary extraction for portability
    NODE_VERSION="20.11.0"
    if [ "$OS" == "Linux" ]; then
        NODE_DIST="node-v$NODE_VERSION-linux-x86_64"
    else
        NODE_DIST="node-v$NODE_VERSION-darwin-arm64"
    fi
    
    if [ ! -d "$TOOLS_DIR/$NODE_DIST" ]; then
        echo "⬇️  Downloading Node.js $NODE_VERSION..."
        curl -L "https://nodejs.org/dist/v$NODE_VERSION/$NODE_DIST.tar.xz" -o "$TOOLS_DIR/node.tar.xz"
        tar -xJf "$TOOLS_DIR/node.tar.xz" -C "$TOOLS_DIR"
        rm "$TOOLS_DIR/node.tar.xz"
    fi
    export PATH="$TOOLS_DIR/$NODE_DIST/bin:$PATH"
    echo "🟢 Local Node.js $(node -v) ready."
fi

# --- 7. Frontend Setup ---
echo "🎨 Setting up frontend..."
cd "$PROJECT_ROOT/frontend"
if [ ! -d "node_modules" ]; then
    npm install
fi

# --- 8. Environment Files ---
cd "$PROJECT_ROOT"
[ ! -f "backend/.env" ] && cp backend/.env.example backend/.env && echo "⚠️  Created backend/.env - Please add API keys!"
[ ! -f "frontend/.env.local" ] && cp frontend/.env.local.example frontend/.env.local && echo "⚠️  Created frontend/.env.local"

# --- 9. Launch! ---
echo "======================================"
echo "🚀 ProEngine Labs READY"
echo "======================================"

# Determine terminal for launching
TERMINAL=""
if command -v gnome-terminal &> /dev/null; then TERMINAL="gnome-terminal"
elif command -v xterm &> /dev/null; then TERMINAL="xterm"
elif command -v konsole &> /dev/null; then TERMINAL="konsole"
elif command -v xfce4-terminal &> /dev/null; then TERMINAL="xfce4-terminal"
fi

# Launch backend script
cat > "$TOOLS_DIR/run_backend.sh" << EOF
#!/bin/bash
source "$CONDA_PATH/etc/profile.d/conda.sh"
conda activate "$ENV_NAME"
cd "$PROJECT_ROOT/backend"
uvicorn main:app --reload --host 0.0.0.0 --port 7860
EOF
chmod +x "$TOOLS_DIR/run_backend.sh"

# Launch frontend script
cat > "$TOOLS_DIR/run_frontend.sh" << EOF
#!/bin/bash
export PATH="$TOOLS_DIR/$NODE_DIST/bin:\$PATH"
cd "$PROJECT_ROOT/frontend"
npm run dev
EOF
chmod +x "$TOOLS_DIR/run_frontend.sh"

if [ -n "$TERMINAL" ]; then
    echo "🛰️  Launching services in separate terminals..."
    if [ "$TERMINAL" = "gnome-terminal" ]; then
        gnome-terminal -- bash -c "$TOOLS_DIR/run_backend.sh" &
        sleep 2
        gnome-terminal -- bash -c "$TOOLS_DIR/run_frontend.sh" &
    elif [ "$TERMINAL" = "xterm" ]; then
        xterm -e bash "$TOOLS_DIR/run_backend.sh" &
        xterm -e bash "$TOOLS_DIR/run_frontend.sh" &
    else
        # Fallback for others
        $TERMINAL -e "bash $TOOLS_DIR/run_backend.sh" &
        $TERMINAL -e "bash $TOOLS_DIR/run_frontend.sh" &
    fi
else
    echo "⚠️  No terminal emulator found. Running in background..."
    bash "$TOOLS_DIR/run_backend.sh" &
    bash "$TOOLS_DIR/run_frontend.sh" &
fi

echo ""
echo "📡 Backend: http://localhost:7860"
echo "🌐 Frontend: http://localhost:3000"
echo "--------------------------------------"
echo "Press Ctrl+C in this terminal to exit (NOTE: Background processes may persist)"
wait
