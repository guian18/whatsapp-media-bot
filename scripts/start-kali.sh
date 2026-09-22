#!/data/data/com.termux/files/usr/bin/sh
set -eu

DISTRO="${KALI_DISTRO:-kali-rolling}"
PROJECT_DIR="${PROJECT_DIR:-$HOME/infoplayerleft}"

if ! command -v proot-distro >/dev/null 2>&1; then
  echo "Falta proot-distro. Instálalo con: pkg install proot-distro" >&2
  exit 1
fi

if [ ! -d "$PROJECT_DIR" ]; then
  echo "No existe el proyecto: $PROJECT_DIR" >&2
  exit 1
fi

exec proot-distro login "$DISTRO" -- bash -lc '
set -eu
cd "$1"

case "$(uname -s)" in
  Linux) ;;
  *) echo "Playwright necesita Linux dentro de Kali; plataforma detectada: $(uname -s)" >&2; exit 1 ;;
esac

command -v node >/dev/null 2>&1 || { echo "Falta Node.js dentro de Kali. Instala: apt install -y nodejs npm" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Falta npm dentro de Kali. Instala: apt install -y npm" >&2; exit 1; }

node_major="$(node -p "process.versions.node.split(\".\")[0]")"
if [ "$node_major" -lt 20 ]; then
  echo "Se requiere Node.js 20 o superior; detectado: $(node -v)" >&2
  exit 1
fi

chromium_path="${VIDEO_BROWSER_EXECUTABLE_PATH:-}"
if [ -z "$chromium_path" ]; then
  for candidate in /usr/lib/chromium/chromium /usr/bin/chromium /usr/bin/chromium-browser; do
    if [ -x "$candidate" ]; then chromium_path="$candidate"; break; fi
  done
fi
if [ -z "$chromium_path" ] || [ ! -x "$chromium_path" ]; then
  echo "No se encontró Chromium compatible. Instala: apt update && apt install -y chromium" >&2
  exit 1
fi

export VIDEO_BROWSER_EXECUTABLE_PATH="$chromium_path"
export VIDEO_BROWSER_WAIT_MS="${VIDEO_BROWSER_WAIT_MS:-5000}"
echo "Playwright: Linux $(uname -m), Node $(node -v), Chromium $VIDEO_BROWSER_EXECUTABLE_PATH"
exec npm start
' bash "$PROJECT_DIR"
