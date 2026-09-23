#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "${PREFIX:-}" != *com.termux* ]]; then
  echo "Este instalador está diseñado para Termux en Android."
  exit 1
fi

pkg update -y
pkg install -y curl git nodejs-lts python clang rust make pkg-config libffi openssl ripgrep ffmpeg tmux openssl-tool

if ! command -v hermes >/dev/null 2>&1; then
  echo "Instalando Hermes Agent con el instalador oficial..."
  curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
  hash -r
fi

if ! command -v hermes >/dev/null 2>&1; then
  echo "No se encontró el comando hermes después de la instalación."
  exit 1
fi

cd "$ROOT_DIR"
npm ci

if [[ ! -f .env ]]; then
  cp .env.example .env
  chmod 600 .env
  echo "Se creó .env desde .env.example."
fi

node --version
hermes --version || true
npm test

echo
echo "Instalación terminada. Ejecuta:"
echo "  bash scripts/configure-termux.sh"
echo "  bash scripts/start-termux.sh"
