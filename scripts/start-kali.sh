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

exec proot-distro login "$DISTRO" -- bash -lc "cd '$PROJECT_DIR' && exec npm start"
