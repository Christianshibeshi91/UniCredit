#!/usr/bin/env bash
# ============================================================
# AI Job Bot — VPS Deployment Script
#
# Sets up the job discovery bot as a 24/7 systemd service.
# Run on a fresh Linux VPS (Ubuntu/Debian).
#
# Usage:
#   chmod +x deploy_vps.sh
#   ./deploy_vps.sh
# ============================================================

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_NAME="jobbot"
VENV_DIR="$APP_DIR/venv"

echo "============================================"
echo "  AI Job Bot — VPS Deployment"
echo "============================================"
echo "App directory: $APP_DIR"
echo ""

# --- 1. System dependencies ---
echo "[1/6] Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq python3 python3-venv python3-pip > /dev/null

# --- 2. Python virtual environment ---
echo "[2/6] Setting up Python virtual environment..."
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"
pip install --upgrade pip -q
pip install -r "$APP_DIR/requirements.txt" -q
echo "  Dependencies installed."

# Install Playwright browsers (for Easy Apply automation)
if python3 -c "import playwright" 2>/dev/null; then
    echo "  Installing Playwright browsers..."
    playwright install chromium --with-deps 2>/dev/null || true
fi

# --- 3. .env configuration ---
echo "[3/6] Checking .env configuration..."
if [ ! -f "$APP_DIR/.env" ]; then
    echo "  WARNING: .env file not found!"
    echo "  Copy .env.example to .env and fill in your values:"
    echo "    cp $APP_DIR/.env.example $APP_DIR/.env"
    echo "    nano $APP_DIR/.env"
    echo ""
    echo "  Then re-run this script."
    exit 1
else
    echo "  .env found."
fi

# --- 4. Create working directories ---
echo "[4/6] Creating directories..."
mkdir -p "$APP_DIR/.tmp"
mkdir -p "$APP_DIR/candidate"

# --- 5. Install systemd service ---
echo "[5/6] Installing systemd service..."
# Update paths in service file for this machine
ACTUAL_USER="$(whoami)"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

sudo bash -c "cat > $SERVICE_FILE" << EOF
[Unit]
Description=AI Job Discovery Bot (Scheduler + Telegram)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$ACTUAL_USER
WorkingDirectory=$APP_DIR
ExecStart=$VENV_DIR/bin/python run_service.py
Restart=always
RestartSec=30
StandardOutput=append:$APP_DIR/.tmp/service.log
StandardError=append:$APP_DIR/.tmp/service.log
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"

# --- 6. Start service ---
echo "[6/6] Starting service..."
sudo systemctl restart "$SERVICE_NAME"
sleep 2

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
echo "Service status:"
sudo systemctl status "$SERVICE_NAME" --no-pager -l || true
echo ""
echo "Useful commands:"
echo "  sudo systemctl status $SERVICE_NAME    # Check status"
echo "  sudo systemctl restart $SERVICE_NAME   # Restart"
echo "  sudo systemctl stop $SERVICE_NAME      # Stop"
echo "  tail -f $APP_DIR/.tmp/service.log      # Live logs"
echo "  sudo journalctl -u $SERVICE_NAME -f    # System logs"
echo ""
