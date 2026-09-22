#!/usr/bin/env python3
"""Adaptador no interactivo de xvideos-dl para !xvideos."""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        print("uso: xvideos_download.py URL SALIDA", file=sys.stderr)
        return 2

    url, output = sys.argv[1:]
    if not (url.startswith("https://") or url.startswith("http://")):
        print("solo se aceptan URLs HTTP(S)", file=sys.stderr)
        return 2

    python = os.getenv("XVIDEOS_PYTHON", sys.executable)
    quality = os.getenv("XVIDEOS_QUALITY", "low").strip().lower() or "low"
    if quality not in {"low", "middle", "high"}:
        quality = "low"

    output_path = Path(output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    configured_cookie = os.getenv("XVIDEOS_COOKIE", "").strip()
    if not configured_cookie:
        print("XVIDEOS_COOKIE es obligatorio para xvideos-dl; configura la cookie de tu sesión de xvideos.com en .env", file=sys.stderr)
        return 2

    with tempfile.TemporaryDirectory(prefix="whatsapp-media-bot-xvideos-") as work_dir:
        work = Path(work_dir)
        destination = work / "downloads"
        destination.mkdir()
        child_env = os.environ.copy()

        # xvideos-dl guarda la cookie en ~/.xvideos/cookie. Usamos un HOME
        # temporal solo cuando se proporciona XVIDEOS_COOKIE para no modificar
        # la configuración personal del sistema.
        if configured_cookie:
            home = work / "home"
            cookie_dir = home / ".xvideos"
            cookie_dir.mkdir(parents=True)
            cookie_file = cookie_dir / "cookie"
            cookie_file.write_text(configured_cookie, encoding="utf-8")
            cookie_file.chmod(0o600)
            child_env["HOME"] = str(home)

        command = [
            python,
            "-m",
            "xvideos_dl",
            url,
            "--destination",
            str(destination),
            "--quality",
            quality,
            "--overwrite",
        ]
        try:
            completed = subprocess.run(
                command,
                env=child_env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                timeout=max(30, int(os.getenv("XVIDEOS_TIMEOUT_MS", "180000")) / 1000),
                check=False,
            )
        except FileNotFoundError:
            print(f"no se encontró Python: {python}", file=sys.stderr)
            return 3
        except subprocess.TimeoutExpired:
            print("xvideos-dl agotó el tiempo de descarga", file=sys.stderr)
            return 1

        videos = [item for item in destination.rglob("*.mp4") if item.is_file()]
        if completed.returncode != 0 or not videos:
            detail = " ".join((completed.stdout or "").split())[-900:]
            print(detail or "xvideos-dl no produjo un vídeo", file=sys.stderr)
            return 1

        source = max(videos, key=lambda item: item.stat().st_mtime)
        if source.stat().st_size <= 0:
            print("xvideos-dl produjo un archivo vacío", file=sys.stderr)
            return 1
        shutil.copyfile(source, output_path)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
