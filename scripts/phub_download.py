#!/usr/bin/env python3
"""Download one public video with PHUB for the optional !phub command."""
import asyncio
import os
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
        quality = os.getenv("PHUB_QUALITY", "half").strip().lower() or "half"
        if quality not in {"best", "half", "worst"}:
            quality = "half"

        downloader_name = os.getenv("PHUB_DOWNLOADER", "default").strip().lower() or "default"
        downloader = None
        if downloader_name == "ffmpeg":
            try:
                import phub.download as download
            except ImportError:
                print("PHUB_DOWNLOADER=ffmpeg requiere una versión de PHUB con phub.download; se usará el descargador interno.", file=sys.stderr)
            else:
                downloader = download.FFMPEG
        elif downloader_name == "threaded":
            try:
                import phub.download as download
            except ImportError:
                print("PHUB_DOWNLOADER=threaded requiere una versión de PHUB con phub.download; se usará el descargador interno.", file=sys.stderr)
            else:
                try:
                    workers = int(os.getenv("PHUB_MAX_WORKERS", "4"))
                    timeout = int(os.getenv("PHUB_SEGMENT_TIMEOUT_SECONDS", "45"))
                except ValueError:
                    workers, timeout = 4, 45
                downloader = download.threaded(
                    max_workers=max(1, min(8, workers)),
                    timeout=max(10, min(120, timeout)),
                )
        if downloader_name == "default" or downloader is None:
            # No importar phub.download: PHUB 5.1.2 usa su descargador interno
            # cuando no se proporciona el argumento downloader.
            download_options = {}
        else:
            download_options = {"downloader": downloader}

        await video.download(
            path=output,
            quality=quality,
            no_title=True,
            remux=True,
            **download_options,
        )

    try:
        asyncio.run(download_video())
    except (ValueError, TypeError) as exc:
        print(f"configuración PHUB inválida: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1
    if not Path(output).is_file() or Path(output).stat().st_size == 0:
        print("PHUB no produjo un archivo de video", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
