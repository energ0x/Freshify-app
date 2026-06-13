#!/usr/bin/env python3
"""
Cross-platform dev bootstrap for Freshify.

Host:   python setup.py          — full setup + optional docker compose launch
Docker: python setup.py --docker — .env patching only (called by compose setup service)
"""

import os
import secrets
import shutil
import socket
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
ENV_EXAMPLE = os.path.join(ROOT, ".env.example")
ENV_FILE = os.path.join(ROOT, ".env")

DOCKER_MODE = "--docker" in sys.argv


def get_lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return ""


def read_env(path: str) -> list[str]:
    with open(path, encoding="utf-8") as f:
        return f.readlines()


def write_env(path: str, lines: list[str]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.writelines(lines)


def patch_env(lines: list[str]) -> tuple[list[str], list[str]]:
    warnings = []
    result = []

    for line in lines:
        stripped = line.strip()

        if stripped.startswith("SECRET_KEY="):
            value = line.split("=", 1)[1].strip().rstrip("\n")
            if not value:
                line = f"SECRET_KEY={secrets.token_hex(32)}\n"
                print("  [ok] SECRET_KEY generated")

        elif stripped.startswith("GEMINI_API_KEY="):
            value = line.split("=", 1)[1].strip().rstrip("\n")
            if not value:
                warnings.append(
                    "GEMINI_API_KEY is empty — AI features won't work.\n"
                    "       Get a key at https://aistudio.google.com/app/apikey\n"
                    "       then set it in .env"
                )

        elif stripped.startswith("EXPO_PUBLIC_API_URL="):
            value = line.split("=", 1)[1].strip().strip('"').rstrip("\n")
            if not value or "192.168.x.x" in value:
                if DOCKER_MODE:
                    warnings.append(
                        "EXPO_PUBLIC_API_URL still has a placeholder.\n"
                        "       Run setup.py on the host to auto-detect your LAN IP,\n"
                        "       or set it manually in .env"
                    )
                else:
                    ip = get_lan_ip()
                    if ip:
                        line = f'EXPO_PUBLIC_API_URL=http://{ip}:8000\n'
                        print(f"  [ok] EXPO_PUBLIC_API_URL → http://{ip}:8000")
                    else:
                        warnings.append(
                            "Could not detect LAN IP. Set EXPO_PUBLIC_API_URL manually in .env"
                        )

        result.append(line)

    return result, warnings


def main() -> None:
    print("\n=== Freshify setup ===\n")

    if not os.path.exists(ENV_FILE):
        shutil.copy(ENV_EXAMPLE, ENV_FILE)
        print("  [ok] .env created from .env.example")
    else:
        print("  [--] .env already exists — patching missing values")

    lines = read_env(ENV_FILE)
    patched, warnings = patch_env(lines)
    write_env(ENV_FILE, patched)

    if warnings:
        print()
        for w in warnings:
            print(f"  [!]  {w}")

    if DOCKER_MODE:
        print("\n=== Done — now run: docker compose up -d --build ===\n")
        return

    print()
    if not shutil.which("docker"):
        print("  [!]  Docker not found — install Docker Desktop and re-run setup.py")
        sys.exit(1)

    answer = input("Start the backend with docker compose? [Y/n] ").strip().lower()
    if answer in ("", "y", "yes"):
        cmd = ["docker", "compose", "up", "-d", "--build"]
        print(f"\n  Running: {' '.join(cmd)}\n")
        result = subprocess.run(cmd, cwd=ROOT)
        if result.returncode != 0:
            print("\n  [!]  docker compose failed — check the output above")
            sys.exit(result.returncode)
        print("\n  [ok] Backend → http://localhost:8000")
        print("  [ok] Health:  curl http://localhost:8000/health")
    else:
        print("\n  Skipped. Run manually: docker compose up -d --build")

    print("\n=== Done ===\n")


if __name__ == "__main__":
    main()
