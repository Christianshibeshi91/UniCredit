"""Launch the Tech Tutor backend server."""

import uvicorn

from app.core.config import HOST, PORT, get_tailscale_ip


def main():
    ts_ip = get_tailscale_ip()
    print(f"Tech Tutor backend starting on {HOST}:{PORT}")
    if ts_ip:
        print(f"Tailscale access: http://{ts_ip}:{PORT}")
    else:
        print("Tailscale not detected - local access only")

    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True, reload_dirs=["."])


if __name__ == "__main__":
    main()
