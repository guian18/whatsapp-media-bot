#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BOT_ENV="$ROOT_DIR/.env"
HERMES_ENV="${HERMES_HOME:-$HOME/.hermes}/.env"

if [[ ! -f "$BOT_ENV" ]]; then
  cp "$ROOT_DIR/.env.example" "$BOT_ENV"
fi
chmod 600 "$BOT_ENV"
mkdir -p "$(dirname "$HERMES_ENV")"
touch "$HERMES_ENV"
chmod 600 "$HERMES_ENV"

read -r -p "Número de WhatsApp con código de país (solo dígitos, o Enter para QR): " whatsapp_number

api_key="$(openssl rand -hex 32)"

upsert() {
  local file="$1" key="$2" value="$3"
  local escaped
  escaped="$(printf '%s' "$value" | sed 's/[\\&|]/\\&/g')"
  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${escaped}|" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

upsert "$HERMES_ENV" API_SERVER_ENABLED true
upsert "$HERMES_ENV" API_SERVER_HOST 127.0.0.1
upsert "$HERMES_ENV" API_SERVER_PORT 8642
upsert "$HERMES_ENV" API_SERVER_KEY "$api_key"

upsert "$BOT_ENV" AI_PROVIDER hermes
upsert "$BOT_ENV" AI_MODEL hermes-agent
upsert "$BOT_ENV" HERMES_URL http://127.0.0.1:8642/v1/chat/completions
upsert "$BOT_ENV" HERMES_API_KEY "$api_key"
upsert "$BOT_ENV" HERMES_SESSION_ID whatsapp-media-bot
upsert "$BOT_ENV" WHATSAPP_NUMBER "$whatsapp_number"
upsert "$BOT_ENV" PAIRING_CODE "$([[ -n "$whatsapp_number" ]] && echo true || echo false)"

echo
echo "Configuración de API y WhatsApp guardada."
echo "Ahora configura el proveedor/modelo de Hermes con el asistente oficial:"
echo "  hermes model"
echo "Después inicia ambos procesos con:"
echo "  bash scripts/start-termux.sh"
