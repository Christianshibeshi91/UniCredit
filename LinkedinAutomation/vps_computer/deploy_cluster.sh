#!/usr/bin/env bash
# ============================================================
# Cluster Deployment Script for WSL2 Ubuntu
#
# Deploys the full AI agent cluster on an 8GB laptop:
#   - Ollama (native, qwen3:8b)
#   - Redis (Docker, 50MB)
#   - Qdrant (Docker, 128MB)
#   - Python services (orchestrator, crawl workers, API)
#
# Usage:
#   chmod +x deploy_cluster.sh
#   ./deploy_cluster.sh
# ============================================================

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$APP_DIR/venv"
DATA_DIR="/opt/cluster/data"
RESULTS_DIR="/opt/cluster/results"

echo "============================================"
echo "  AI Agent Cluster — Deployment"
echo "============================================"
echo "App directory: $APP_DIR"
echo ""

# --- 1. System dependencies ---
echo "[1/8] Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
    python3 python3-venv python3-pip \
    curl docker.io docker-compose-plugin \
    > /dev/null 2>&1

# Enable Docker without sudo
sudo usermod -aG docker "$USER" 2>/dev/null || true

# --- 2. Install Ollama ---
echo "[2/8] Installing Ollama..."
if ! command -v ollama &>/dev/null; then
    curl -fsSL https://ollama.com/install.sh | sh
fi

# Configure Ollama for the cluster
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/override.conf > /dev/null << 'OLLAMA_CONF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0"
Environment="OLLAMA_KEEP_ALIVE=5m"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
Environment="OLLAMA_NUM_PARALLEL=1"
OLLAMA_CONF

sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl restart ollama
sleep 3

# Pull model
echo "  Pulling qwen3:8b..."
ollama pull qwen3:8b

# --- 3. Start infrastructure (Redis + Qdrant) ---
echo "[3/8] Starting Redis + Qdrant..."
sudo systemctl start docker 2>/dev/null || sudo service docker start
cd "$APP_DIR"
docker compose -f docker-compose.cluster.yml up -d

# --- 4. Create data directories ---
echo "[4/8] Creating data directories..."
sudo mkdir -p "$DATA_DIR" "$RESULTS_DIR"
sudo chown -R "$USER:$USER" "$DATA_DIR" "$RESULTS_DIR"

# --- 5. Python virtual environment ---
echo "[5/8] Setting up Python environment..."
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"
pip install --upgrade pip -q

# Install PyTorch CPU-only (saves ~1.5GB vs CUDA version)
pip install torch --index-url https://download.pytorch.org/whl/cpu -q 2>/dev/null || true
pip install -r "$APP_DIR/requirements.cluster.txt" -q

# --- 6. Install Playwright browsers ---
echo "[6/8] Installing Playwright Chromium..."
playwright install chromium --with-deps 2>/dev/null || true

# --- 7. Create systemd service ---
echo "[7/8] Creating systemd service..."
SERVICE_FILE="/etc/systemd/system/ai-cluster.service"

sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=AI Agent Cluster (Orchestrator + API)
After=network-online.target docker.service ollama.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=$VENV_DIR/bin/python cluster_api.py
Restart=always
RestartSec=10
StandardOutput=append:/var/log/ai-cluster.log
StandardError=append:/var/log/ai-cluster.log
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ai-cluster

# --- 8. Configure WSL memory limit ---
echo "[8/8] Configuring WSL memory..."
# This creates .wslconfig on the Windows side
WSLCONFIG="/mnt/c/Users/$(whoami)/.wslconfig"
if [ ! -f "$WSLCONFIG" ]; then
    cat > "$WSLCONFIG" << 'WSL_CONF'
[wsl2]
memory=7GB
swap=4GB
processors=8
WSL_CONF
    echo "  Created .wslconfig (restart WSL to apply)"
fi

# --- Start ---
echo ""
echo "============================================"
echo "  Starting Cluster..."
echo "============================================"
sudo systemctl restart ai-cluster
sleep 5

# Verify
echo ""
echo "Service status:"
sudo systemctl status ai-cluster --no-pager -l 2>/dev/null || true

echo ""
echo "Health check:"
curl -s http://localhost:8000/health 2>/dev/null || echo "  (starting up...)"

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
echo "Endpoints:"
echo "  API:    http://localhost:8000"
echo "  Health: http://localhost:8000/health"
echo "  Status: http://localhost:8000/status"
echo ""
echo "Submit a research task:"
echo "  curl -X POST http://localhost:8000/research \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"query\": \"Find remote Python jobs paying \$150k+\"}'"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status ai-cluster     # Service status"
echo "  sudo systemctl restart ai-cluster    # Restart"
echo "  tail -f /var/log/ai-cluster.log      # Logs"
echo "  docker compose -f docker-compose.cluster.yml logs  # Infra logs"
echo ""
