#!/usr/bin/env python3
"""Download one public video with PHUB for the optional !phub command."""
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        print("uso: phub_download.py URL SALIDA", file=sys.stderr)
        return 2
    url, output = sys.argv[1:]
    if not (url.startswith("https://") or url.startswith("http://")):
        print("solo se aceptan URLs HTTP(S) públicas", file=sys.stderr)
        return 2
    try:
        import phub
    except ImportError:
        print("falta PHUB; instala con: python3 -m pip install phub", file=sys.stderr)
        return 3
    try:
        video = phub.Client().get(url)
        video.download(path=output, quality="best", convert=True)
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1
    if not Path(output).is_file() or Path(output).stat().st_size == 0:
        print("PHUB no produjo un archivo de video", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
