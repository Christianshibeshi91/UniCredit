#!/bin/bash
# Deploy AI Computer Agent to remote server (192.168.111.1)
# Run this ON the remote server, not your personal PC.

set -e

echo "=== AI Computer Agent - Server Setup ==="
echo "Installing on $(hostname) ..."

# 1. System deps
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv git curl

# 2. Install Ollama
if ! command -v ollama &> /dev/null; then
    echo "Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
fi

# 3. Configure Ollama to listen on all interfaces
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/override.conf > /dev/null <<EOF
[Service]
Environment="OLLAMA_HOST=0.0.0.0"
EOF
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl restart ollama

# Wait for Ollama to be ready
echo "Waiting for Ollama..."
sleep 5

# 4. Pull Qwen model
echo "Pulling Qwen 3 4B model..."
ollama pull qwen3:4b

# 5. Set up the agent
APP_DIR="/opt/ai-computer-agent"
sudo mkdir -p "$APP_DIR"
sudo chown "$USER:$USER" "$APP_DIR"

# Copy application files
cp config.py agent.py browser_controller.py search_module.py \
   scraper.py data_processor.py output_formatter.py \
   runtime.py security.py api.py cli.py requirements.txt \
   "$APP_DIR/"

# 6. Create virtual environment
cd "$APP_DIR"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install --with-deps chromium

# 7. Point Ollama to localhost (since it's on the same machine now)
sed -i 's|http://192.168.111.1:11434|http://127.0.0.1:11434|g' config.py

# 8. Create systemd service for the agent
sudo tee /etc/systemd/system/ai-computer-agent.service > /dev/null <<EOF
[Unit]
Description=AI Computer Agent
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=$APP_DIR/venv/bin/python api.py
Restart=always
RestartSec=5
Environment="OLLAMA_HOST=http://127.0.0.1:11434"
Environment="MAX_AGENTS=50"
Environment="MEMORY_POOL_MB=65536"

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ai-computer-agent
sudo systemctl start ai-computer-agent

# 9. Open firewall port
sudo ufw allow 8000/tcp 2>/dev/null || true
sudo ufw allow 11434/tcp 2>/dev/null || true

echo ""
echo "=== DONE ==="
echo "Agent API:  http://192.168.111.1:8000"
echo "API docs:   http://192.168.111.1:8000/docs"
echo "Health:     http://192.168.111.1:8000/health"
echo "Ollama:     http://192.168.111.1:11434"
echo ""
echo "Commands:"
echo "  sudo systemctl status ai-computer-agent   # check status"
echo "  sudo systemctl restart ai-computer-agent   # restart"
echo "  sudo journalctl -u ai-computer-agent -f    # view logs"
