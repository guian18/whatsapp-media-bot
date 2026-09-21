# InfoPlayer Left

Bot de WhatsApp para consultar perfiles y servidores de **Left 4 Dead 2** mediante Steam Web API y consultas A2S. Incluye vigilancia de jugadores, IA local o remota y una app móvil de control.

Funciona con Node.js 20 o superior en Linux, macOS, Windows y Termux. Heroku puede ejecutar el bot como `worker`, pero no incluye Ollama, llama.cpp ni LocalAI.

## Enlaces directos para crear claves API

| Servicio | Crear clave o token | Variable del bot |
|---|---|---|
| Steam Web API | [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) | `STEAM_API_KEY` |
| Groq | [console.groq.com/keys](https://console.groq.com/keys) | `GROQ_API_KEY` |
| Google Gemini | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | `GEMINI_API_KEY` |
| Mistral | [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys) | `MISTRAL_API_KEY` |
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) | `OPENROUTER_API_KEY` |
| Hugging Face | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) | `AI_API_KEY` |
| Ollama Cloud | [ollama.com/settings/keys](https://ollama.com/settings/keys) | `OLLAMA_API_KEY` |

Los backends locales **Ollama, llama.cpp y LocalAI no necesitan una clave** cuando se ejecutan en `127.0.0.1`. No pongas claves reales en el README, el código ni los commits; guárdalas en `.env`, secretos de Heroku o un gestor de secretos.

## Enlaces directos de instalación y API

| Backend | Instalación | API compatible |
|---|---|---|
| Ollama | [ollama.com/download](https://ollama.com/download) | [OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility) |
| llama.cpp | [GitHub: ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) | [llama-server](https://github.com/ggml-org/llama.cpp/tree/master/tools/server) |
| LocalAI | [GitHub: mudler/LocalAI](https://github.com/mudler/LocalAI) | [OpenAI compatibility](https://localai.io/features/openai-compatibility/) |

## Instalación

```bash
git clone https://github.com/guianpierrcastillolazo-rgb/infoplayerleft.git
cd infoplayerleft
npm ci
cp .env.example .env
nano .env
npm start
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
npm ci
npm start
```

## Configuración mínima

Copia `.env.example` como `.env` y configura Steam y el proveedor de IA elegido:

```env
STEAM_API_KEY=tu_steam_api_key
AI_PROVIDER=ollama
AI_MODEL=gpt-oss:20b
OLLAMA_URL=http://127.0.0.1:11434/v1/chat/completions
OLLAMA_API_KEY=ollama
GROUPS_ENABLED=true
REPLY_IN_PRIVATE=true
PAIRING_CODE=false
```

## Ollama local

La versión estable verificada al actualizar el repositorio es **v0.34.2**. Instala Ollama y descarga un modelo:

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gpt-oss:20b
ollama serve
npm start
```

También puedes usar el instalador incluido:

```bash
bash scripts/setup-ollama.sh
```

Para cambiar de proveedor desde WhatsApp:

```text
!proveedor ollama
!proveedor llama_cpp
!proveedor localai
```

## llama.cpp local

```bash
./build/bin/llama-server --model /ruta/al/modelo.gguf --host 127.0.0.1 --port 8080
```

```env
AI_PROVIDER=llama_cpp
AI_MODEL=nombre-del-modelo-gguf
LLAMA_CPP_URL=http://127.0.0.1:8080/v1/chat/completions
LLAMA_CPP_API_KEY=
```

## LocalAI local

```bash
docker run -p 8081:8080 --name local-ai -ti localai/localai:latest
```

```env
AI_PROVIDER=localai
AI_MODEL=nombre-del-modelo
LOCALAI_URL=http://127.0.0.1:8081/v1/chat/completions
LOCALAI_API_KEY=
```

Los tres backends locales son gratuitos como software, pero los modelos consumen disco, CPU/RAM o GPU/VRAM. Revisa la licencia del modelo que descargues.

## Proveedores remotos

Ejemplo con Groq:

```env
AI_PROVIDER=groq
AI_MODEL=openai/gpt-oss-20b
GROQ_API_KEY=tu_clave
```

También están disponibles `gemini`, `mistral` y `openrouter`. Puedes usar `AI_API_KEY` como variable genérica, aunque es preferible usar la variable específica del proveedor.

## WhatsApp

### Código QR

Deja vacío `WHATSAPP_NUMBER`, configura `PAIRING_CODE=false`, ejecuta `npm start` y escanea el QR en **WhatsApp → Dispositivos vinculados**.

### Código de vinculación

```env
WHATSAPP_NUMBER=51987654321
PAIRING_CODE=true
```

Ejecuta `npm start`, introduce el código en **WhatsApp → Dispositivos vinculados → Vincular con número de teléfono** y después cambia `PAIRING_CODE=false`.

## Steam, A2S y vigilancia

Las direcciones A2S usan el formato `IP_o_dominio:puerto`, por ejemplo `192.0.2.10:27015`. El puerto debe estar entre `1` y `65535`.

La vigilancia acepta nickname, SteamID64, vanity o URL de Steam. Los datos se guardan localmente en `watchlist.json`; no publiques ese archivo.

Para bloquear servidores locales o privados:

```env
ALLOW_PRIVATE_SERVERS=false
```

## App móvil y Control API

Configura el control local:

```env
CONTROL_API_TOKEN=genera-un-token-largo
CONTROL_API_HOST=0.0.0.0
CONTROL_API_PORT=8787
```

La app móvil se conecta a `http://IP_DEL_EQUIPO:8787` usando el mismo token. No añadas `/api/control` a la URL.

```bash
cd control-app
pnpm install
pnpm run check
pnpm run build
pnpm test
```

## Heroku

El repositorio incluye `Procfile` y usa un proceso `worker`:

```text
worker: npm start
```

```bash
heroku login
heroku create nombre-de-tu-app
heroku config:set STEAM_API_KEY=TU_CLAVE --app nombre-de-tu-app
heroku config:set AI_PROVIDER=groq GROQ_API_KEY=TU_CLAVE --app nombre-de-tu-app
git push heroku main
heroku ps:scale worker=1 --app nombre-de-tu-app
heroku logs --tail --app nombre-de-tu-app
```

Heroku usa almacenamiento efímero. `auth_info/`, `watchlist.json` y `ai-memory.json` pueden desaparecer cuando se reinicia el dyno. Para Ollama, llama.cpp o LocalAI usa un equipo propio o un servidor con almacenamiento y GPU/CPU adecuados.

## Railway

El repositorio incluye [`railway.json`](railway.json) y está preparado como un **worker** Node.js con `npm ci`, `npm start` y reinicio automático si el proceso falla.

Railway ofrece una prueba inicial de **$5 durante 30 días** y después un plan gratuito con **$1 de crédito mensual**; no es un hosting gratuito ilimitado. El servicio gratuito tiene límites de CPU, RAM y almacenamiento. Consulta el [precio oficial de Railway](https://railway.com/pricing) antes de desplegar.

### Despliegue desde GitHub

1. Abre [railway.com/new](https://railway.com/new) y crea un proyecto desde GitHub.
2. Selecciona `guianpierrcastillolazo-rgb/infoplayerleft`.
3. Railway detectará `railway.json` y usará `npm ci` seguido de `npm start`.
4. Añade las variables de `.env.example` en **Variables**. Nunca subas el archivo `.env`.
5. En **Volumes**, crea un volumen de al menos `0.5 GB` montado en `/app/data`.
6. Añade estas variables para conservar la sesión y los datos:

```env
AUTH_DIR=/app/data/auth_info
AI_MEMORY_FILE=/app/data/ai-memory.json
WATCH_STATE_FILE=/app/data/watchlist.json
OFFICIAL_ADDRESSES_FILE=/app/data/l4d2-official-addresses.txt
STEAM_KEY_FILE=/app/data/.steam_key
```

7. Para la primera vinculación, usa temporalmente `WHATSAPP_NUMBER` y `PAIRING_CODE=true`, revisa los logs y después cambia `PAIRING_CODE=false`.

El volumen es necesario porque el sistema de archivos efímero puede borrar `auth_info/`, `watchlist.json` y la memoria al redeployar. No ejecutes Ollama, llama.cpp o LocalAI dentro del mismo servicio gratuito de Railway; usa un backend remoto con su clave en Variables o un equipo separado.

Enlaces: [guía oficial de Railway](https://docs.railway.com/), [precios y límites](https://railway.com/pricing) y [plantilla `railway.json`](railway.json).

## Termux

```bash
pkg update && pkg upgrade
pkg install nodejs-lts git
git clone https://github.com/guianpierrcastillolazo-rgb/infoplayerleft.git
cd infoplayerleft
npm ci
cp .env.example .env
npm run start:termux
```

Para mantenerlo activo:

```bash
pkg install tmux
tmux new -s infoplayerleft
npm start
```

## Sesión, pruebas y seguridad

La sesión de WhatsApp se guarda en `auth_info/`. Para volver a vincular:

```bash
npm run reset
```

Para borrar la sesión y arrancar de nuevo:

```bash
npm run relink
```

La suite principal contiene 28 pruebas. La app móvil se valida con `pnpm run check`, `pnpm run build` y `pnpm test`.

No compartas `.env`, claves API, códigos de vinculación, `auth_info/`, `.steam_key`, `watchlist.json` ni `ai-memory.json`. Mantén los backends locales enlazados a `127.0.0.1`; si necesitas acceso remoto, utiliza autenticación, firewall y TLS.

## Repositorio

[Repositorio privado en GitHub](https://github.com/guianpierrcastillolazo-rgb/infoplayerleft)
