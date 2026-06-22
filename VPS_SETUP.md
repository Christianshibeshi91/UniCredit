# AWS EC2 Deployment Guide — 24/7 Job Bot

This gets your LinkedIn automation running on AWS Free Tier so it works even when your PC is off.

---

## Part 1 — Create Your AWS EC2 Instance

### Step 1: Sign up / Log in
Go to [https://aws.amazon.com/free](https://aws.amazon.com/free) and create a free account (credit card required but won't be charged for t2.micro/t3.micro for 12 months).

### Step 2: Launch an EC2 Instance

1. Go to **EC2** → **Launch Instance**
2. Configure:
   - **Name**: `jobbot`
   - **AMI**: Ubuntu Server 24.04 LTS (Free tier eligible ✅)
   - **Instance type**: `t2.micro` or `t3.micro` (Free tier eligible ✅)
   - **Key pair**: Click **Create new key pair** → name it `jobbot-key` → RSA → `.pem` format → **Download it**
   - **Network settings**: Allow SSH from `My IP` only (security)
   - **Storage**: 20 GB gp3 (Free tier gives 30 GB)
3. Click **Launch instance**

> **Save your `.pem` file** — move it somewhere safe like `C:\Users\chris\.ssh\jobbot-key.pem`

### Step 3: Get your server's IP

In EC2 console → **Instances** → click `jobbot` → copy the **Public IPv4 address** (e.g., `3.15.123.45`)

---

## Part 2 — SSH Into Your Server

Open PowerShell and run:

```powershell
# Fix key permissions (required by SSH)
icacls "C:\Users\chris\.ssh\jobbot-key.pem" /inheritance:r /grant:r "$($env:USERNAME):(R)"

# SSH into your server (replace with your actual IP)
ssh -i "C:\Users\chris\.ssh\jobbot-key.pem" ubuntu@3.15.123.45
```

You should see a Linux prompt: `ubuntu@ip-xxx:~$`

---

## Part 3 — Clone Your Repo & Set Up the Bot

Run these commands on the server (copy-paste each block):

```bash
# 1. Update system
sudo apt-get update && sudo apt-get upgrade -y

# 2. Clone your repo
git clone https://github.com/Christianshibeshi91/UniCredit.git Anti-gravity
cd Anti-gravity

# 3. Run the automated deploy script
chmod +x deploy_vps.sh
./deploy_vps.sh
```

The deploy script will:
- Install Python 3, pip, venv
- Install all Python dependencies (requirements.txt)
- Install Playwright + Chromium browser (headless)
- Create .tmp/ and candidate/ directories
- Install and enable the jobbot systemd service

---

## Part 4 — Copy Your Secrets to the Server

Your .env, credentials.json, token.json, and candidate/profile.json are gitignored (never committed). You need to copy them manually.

**On your Windows PC**, open a NEW PowerShell window (keep SSH open in another):

```powershell
$IP = "3.15.123.45"  # <-- replace with your server IP
$KEY = "C:\Users\chris\.ssh\jobbot-key.pem"
$REMOTE = "ubuntu@${IP}:/home/ubuntu/Anti-gravity"

# Copy secrets
scp -i $KEY "C:\Users\chris\Downloads\Anti-gravity\.env"               "${REMOTE}/.env"
scp -i $KEY "C:\Users\chris\Downloads\Anti-gravity\credentials.json"   "${REMOTE}/credentials.json"
scp -i $KEY "C:\Users\chris\Downloads\Anti-gravity\token.json"         "${REMOTE}/token.json"
scp -i $KEY "C:\Users\chris\Downloads\Anti-gravity\token_gmail.json"   "${REMOTE}/token_gmail.json"
scp -i $KEY "C:\Users\chris\Downloads\Anti-gravity\linkedin_auth.json" "${REMOTE}/linkedin_auth.json"

# Create candidate directory and copy profile
ssh -i $KEY ubuntu@$IP "mkdir -p /home/ubuntu/Anti-gravity/candidate"
scp -i $KEY "C:\Users\chris\Downloads\Anti-gravity\candidate\profile.json" "${REMOTE}/candidate/profile.json"

# If you have a gold standard resume:
scp -i $KEY "C:\Users\chris\Downloads\Anti-gravity\candidate\gold_standard_resume.docx" "${REMOTE}/candidate/gold_standard_resume.docx"
```

---

## Part 5 — Start the Service

Back in your SSH window on the server:

```bash
# Start the bot service
sudo systemctl start jobbot

# Check it's running (should say "active (running)")
sudo systemctl status jobbot

# Watch live logs
tail -f /home/ubuntu/Anti-gravity/.tmp/service.log
```

You should see the scheduler starting and Telegram notifications arriving within a few minutes.

---

## Part 6 — Verify It Works With PC Off

1. Watch for a **Telegram message** from the bot — confirms it's running on the server
2. Shut down your PC
3. Wait 30+ minutes
4. Check your phone — new Telegram job alerts should still be arriving
5. Check the **Google Sheet** — new rows should be appearing

---

## Monitoring Commands (SSH in anytime to check)

```bash
# Service status
sudo systemctl status jobbot

# Live logs
tail -f ~/Anti-gravity/.tmp/service.log

# Last 50 log lines
tail -50 ~/Anti-gravity/.tmp/service.log

# Restart the bot
sudo systemctl restart jobbot

# Stop the bot
sudo systemctl stop jobbot

# See system-level logs
sudo journalctl -u jobbot -f
```

---

## Updating the Bot in the Future

When you push code changes to GitHub, SSH in and run:

```bash
cd ~/Anti-gravity
git pull origin main
sudo systemctl restart jobbot
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Permission denied (publickey) | Make sure .pem file permissions are fixed (Step 2) |
| Bot starts but no Telegram messages | Check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_IDS in .env |
| Google Sheets errors | Re-copy credentials.json and token.json |
| Playwright browser crashes | Run `playwright install chromium --with-deps` on server |
| Service crashes in a loop | Check `sudo journalctl -u jobbot -xe` for the real error |

---

## Cost

| Resource | Free Tier | After Free Tier |
|----------|-----------|-----------------|
| t2.micro (750 hrs/mo) | Free for 12 months | ~$8.50/mo |
| 20 GB EBS storage | Free for 12 months | ~$1.60/mo |
| Data transfer (outbound) | 100 GB/mo free | $0.09/GB |

**Total: $0 for first 12 months, ~$10/mo after.**
