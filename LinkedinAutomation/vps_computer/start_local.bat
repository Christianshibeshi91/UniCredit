@echo off
REM Start AI Computer Agent on local laptop
REM Points to Ollama on old PC at 10.0.0.200

cd /d "%~dp0"

echo === AI Computer Agent - Local Laptop ===
echo Ollama Host: http://10.0.0.200:11434
echo Model: qwen3:8b
echo API: http://localhost:8000
echo.

REM Install Playwright Chromium if needed
python -m playwright install chromium 2>nul

REM Start the API server
python api.py
