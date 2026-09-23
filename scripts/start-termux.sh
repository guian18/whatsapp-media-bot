#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v hermes >/dev/null 2>&1; then
  echo "Hermes no está instalado. Ejecuta bash scripts/install-termux.sh"
  exit 1
fi

if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock || true
fi

if command -v tmux >/dev/null 2>&1; then
  if ! tmux has-session -t hermes-agent 2>/dev/null; then
    tmux new-session -d -s hermes-agent "hermes gateway"
  fi
  if ! tmux has-session -t whatsapp-media-bot 2>/dev/null; then
    tmux new-session -d -s whatsapp-media-bot "cd '$ROOT_DIR' && npm run start:termux"
  fi
  echo "Hermes y el bot están ejecutándose en tmux."
  echo "  tmux attach -t hermes-agent"
  echo "  tmux attach -t whatsapp-media-bot"
else
  echo "tmux no está disponible; se ejecutará el bot en primer plano."
  hermes gateway >/tmp/hermes-agent.log 2>&1 &
  exec npm run start:termux
fi
