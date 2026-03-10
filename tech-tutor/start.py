"""
Tech Tutor Launcher — starts both backend and frontend with Tailscale support.

Usage:
    python start.py              # Start both (auto-detect Tailscale)
    python start.py --backend    # Backend only
    python start.py --frontend   # Frontend only
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"
PROJECT_ROOT = ROOT.parent

BACKEND_PORT = int(os.environ.get("TECH_TUTOR_PORT", "8101"))
FRONTEND_PORT = 5174


def get_tailscale_ip() -> str | None:
    try:
        result = subprocess.run(
            ["tailscale", "ip", "-4"],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0:
            return result.stdout.strip().splitlines()[0]
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return None


def start_backend(ts_ip: str | None) -> subprocess.Popen:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(BACKEND_DIR)

    if ts_ip:
        env.setdefault("TECH_TUTOR_FRONTEND_URL", f"http://{ts_ip}:{FRONTEND_PORT}")

    print(f"Starting backend on 0.0.0.0:{BACKEND_PORT}...")
    if ts_ip:
        print(f"  Tailscale: http://{ts_ip}:{BACKEND_PORT}")

    return subprocess.Popen(
        [sys.executable, "run.py"],
        cwd=str(BACKEND_DIR),
        env=env,
    )


def start_frontend() -> subprocess.Popen:
    # Check if node_modules exists
    if not (FRONTEND_DIR / "node_modules").exists():
        print("Installing frontend dependencies...")
        subprocess.run(
            ["npm", "install"],
            cwd=str(FRONTEND_DIR),
            check=True,
            shell=True,
        )

    print(f"Starting frontend on 0.0.0.0:{FRONTEND_PORT}...")
    return subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=str(FRONTEND_DIR),
        shell=True,
    )


def main():
    parser = argparse.ArgumentParser(description="Tech Tutor Launcher")
    parser.add_argument("--backend", action="store_true", help="Start backend only")
    parser.add_argument("--frontend", action="store_true", help="Start frontend only")
    args = parser.parse_args()

    both = not args.backend and not args.frontend

    ts_ip = get_tailscale_ip()
    if ts_ip:
        print(f"Tailscale detected: {ts_ip}")
    else:
        print("Tailscale not detected — local access only")

    procs: list[subprocess.Popen] = []

    try:
        if both or args.backend:
            procs.append(start_backend(ts_ip))

        if both or args.frontend:
            procs.append(start_frontend())

        print()
        print("=" * 50)
        if ts_ip:
            print(f"  Frontend: http://{ts_ip}:{FRONTEND_PORT}")
            print(f"  Backend:  http://{ts_ip}:{BACKEND_PORT}")
        else:
            print(f"  Frontend: http://localhost:{FRONTEND_PORT}")
            print(f"  Backend:  http://localhost:{BACKEND_PORT}")
        print("=" * 50)
        print("Press Ctrl+C to stop")
        print()

        for p in procs:
            p.wait()

    except KeyboardInterrupt:
        print("\nShutting down...")
        for p in procs:
            p.terminate()
        for p in procs:
            p.wait()


if __name__ == "__main__":
    main()
