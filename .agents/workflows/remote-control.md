---
description: How to set up and use remote phone control for the automation system
---

# Remote Control Setup & Usage

// turbo-all

## Prerequisites
- Telegram bot token set in `.env` as `TELEGRAM_BOT_TOKEN`
- Your chat ID set in `.env` as `TELEGRAM_ADMIN_CHAT_IDS`
- Bot running on your PC

## Step 1: Start the Telegram bot on your PC

```powershell
cd c:\Users\chris\Downloads\Anti-gravity
python run_telegram_bot.py
```

Leave this running in a terminal (or tmux/screen on VPS).

## Step 2: Use Telegram commands from your phone

### Trigger automation runs
- `/run` — Start daily job discovery (run_daily.py)
- `/run --max-jobs 5` — Start with custom job limit
- `/run_test` — Run E2E test pipeline

### Monitor running tasks
- `/status` — Show running tasks with live progress
- `/logs` — Show last 20 lines of output
- `/logs daily 50` — Show last 50 lines of daily run

### Control running tasks
- `/stop` — Kill all running tasks
- `/stop daily` — Kill specific task by name

### Remote shell access
- `/shell dir .tmp` — List temp files
- `/shell type .tmp\run_state.json` — View a file
- `/shell git status` — Check git status
- `/shell python -c "print('hello')"` — Run Python one-liners

### Job management
- `/pending` — Show pending approval jobs
- `/stats` — Today's run statistics
- Approve/Skip jobs via inline buttons on approval cards

## Step 3 (Optional): VS Code Tunnel for full IDE on phone

1. Run on your PC: `code tunnel`
2. Follow GitHub login prompts, name your machine
3. Open on phone: `https://vscode.dev/tunnel/<machine-name>`
4. Full VS Code + Claude Code + terminal from your phone browser

### Make tunnel persistent:
```powershell
Start-Process -NoNewWindow code -ArgumentList "tunnel","--accept-server-license-agreement"
```

## Security
- All remote commands require admin chat ID (only you: 314031889)
- Viewer (303115374) only receives read-only notification cards
- `/shell` has 30-second timeout
- VS Code Tunnel requires GitHub authentication
