@echo off
REM ============================================================
REM WSL2 Ubuntu Cluster Setup — Run on the old laptop
REM Sets up Ubuntu, Docker, Ollama, Redis, Qdrant, and the agent
REM ============================================================

echo ============================================
echo   AI Agent Cluster — WSL2 Setup
echo ============================================

REM 1. Import Ubuntu (no systemd)
echo [1/6] Setting up Ubuntu WSL2...
wsl --unregister Ubuntu 2>nul
mkdir C:\WSL\Ubuntu 2>nul
wsl --import Ubuntu C:\WSL\Ubuntu C:\Users\SC_Local\ubuntu_wsl\x64\install.tar.gz --version 2
if errorlevel 1 (
    echo ERROR: Failed to import Ubuntu
    pause
    exit /b 1
)

REM 2. Create user and install packages
echo [2/6] Creating user and installing packages...
wsl -d Ubuntu -u root -- bash -c "useradd -m -s /bin/bash agent; echo 'agent:cluster123' | chpasswd; usermod -aG sudo agent; echo 'agent ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers"

REM Configure wsl.conf (no systemd)
wsl -d Ubuntu -u root -- bash -c "printf '[user]\ndefault=agent\n' > /etc/wsl.conf"

REM Install packages
wsl -d Ubuntu -u root -- bash -c "apt-get update -qq && apt-get install -y -qq python3 python3-venv python3-pip curl zstd docker.io 2>/dev/null"

REM 3. Install Ollama
echo [3/6] Installing Ollama...
wsl -d Ubuntu -u root -- bash -c "curl -fsSL https://ollama.com/install.sh | sh"

REM 4. Copy cluster code into WSL
echo [4/6] Copying cluster code...
wsl -d Ubuntu -u agent -- bash -c "mkdir -p /home/agent/cluster"
for %%f in (C:\Users\SC_Local\vps_computer\*.py C:\Users\SC_Local\vps_computer\*.txt C:\Users\SC_Local\vps_computer\.env*) do (
    wsl -d Ubuntu -u agent -- bash -c "cp '/mnt/c/Users/SC_Local/vps_computer/%%~nxf' /home/agent/cluster/ 2>/dev/null"
)

REM 5. Setup Python venv and install deps
echo [5/6] Setting up Python environment...
wsl -d Ubuntu -u agent -- bash -c "cd /home/agent/cluster && python3 -m venv venv && . venv/bin/activate && pip install --upgrade pip -q && pip install torch --index-url https://download.pytorch.org/whl/cpu -q 2>/dev/null; pip install -r requirements.cluster.txt -q && playwright install chromium --with-deps 2>/dev/null"

REM 6. Create startup script
echo [6/6] Creating startup script...
wsl -d Ubuntu -u agent -- bash -c "cat > /home/agent/start_cluster.sh << 'SCRIPT'\n#!/bin/bash\n# Start Docker\nsudo service docker start\n# Start Ollama\nOLLAMA_HOST=0.0.0.0 OLLAMA_KEEP_ALIVE=5m OLLAMA_MAX_LOADED_MODELS=1 nohup ollama serve > /tmp/ollama.log 2>&1 &\nsleep 3\n# Pull model if needed\nollama pull qwen3:8b 2>/dev/null\n# Start Redis + Qdrant\ncd /home/agent/cluster\nsudo docker compose -f docker-compose.cluster.yml up -d 2>/dev/null || sudo docker-compose -f docker-compose.cluster.yml up -d\n# Start cluster API\nsource venv/bin/activate\nnohup python cluster_api.py > /tmp/cluster.log 2>&1 &\necho 'Cluster started. API at http://0.0.0.0:8000'\nSCRIPT\nchmod +x /home/agent/start_cluster.sh"

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo To start the cluster:
echo   wsl -d Ubuntu -- bash /home/agent/start_cluster.sh
echo.
pause
