#!/usr/bin/env python3
"""Download one public video with PHUB for the optional !phub command."""
import asyncio
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
    except ImportError as exc:
        print("PHUB no puede cargarse; instala phub==5.1.2 y eaf-base-api==3.2.4", file=sys.stderr)
        print(f"detalle: {exc}", file=sys.stderr)
        return 3
    async def download_video() -> None:
        client = phub.Client()
        video = await phub.Video(url=url, core=client.core).init()
        await video.ensure_html()
        await video.download(path=output, quality="best", no_title=True, remux=True)

    try:
        asyncio.run(download_video())
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1
    if not Path(output).is_file() or Path(output).stat().st_size == 0:
        print("PHUB no produjo un archivo de video", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
