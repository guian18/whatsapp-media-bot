# WhatsApp Media Bot

Bot de WhatsApp para IA, descargas de vídeo y automatizaciones multimedia.

## Instalación en Termux

```bash
pkg update -y && pkg upgrade -y
pkg install -y nodejs-lts git
termux-setup-storage
git clone https://github.com/guianpierrcastillolazo-rgb/whatsapp-media-bot.git
cd whatsapp-media-bot
npm ci
cp .env.example .env
nano .env
npm start
```

Para mantenerlo activo en segundo plano:

```bash
pkg install -y tmux
tmux new -s whatsapp-media-bot
npm start
```

Para volver a vincular WhatsApp:

```bash
npm run relink
```

## Instalación en Linux

Compatible con Ubuntu, Debian y distribuciones similares.

```bash
sudo apt update
sudo apt install -y git curl nodejs npm
git clone https://github.com/guianpierrcastillolazo-rgb/whatsapp-media-bot.git
cd whatsapp-media-bot
npm ci
cp .env.example .env
nano .env
npm start
```

Si la versión de Node incluida por la distribución es inferior a 20, instala Node.js 20 o superior desde [Node.js](https://nodejs.org/en/download) antes de ejecutar `npm ci`.

## Instalación en Windows

Instala [Node.js LTS](https://nodejs.org/en/download) y [Git para Windows](https://git-scm.com/download/win). Después abre PowerShell y ejecuta:

```powershell
git clone https://github.com/guianpierrcastillolazo-rgb/whatsapp-media-bot.git
Set-Location whatsapp-media-bot
npm ci
Copy-Item .env.example .env
notepad .env
npm start
```

Para volver a vincular WhatsApp:

```powershell
npm run relink
```

## Instalación en macOS

Instala [Homebrew](https://brew.sh/) si aún no lo tienes y ejecuta:

```bash
brew install node git
git clone https://github.com/guianpierrcastillolazo-rgb/whatsapp-media-bot.git
cd whatsapp-media-bot
npm ci
cp .env.example .env
nano .env
npm start
```

También puedes editar `.env` con cualquier editor de texto. Para volver a vincular WhatsApp:

```bash
npm run relink
```

## Configuración de las APIs

Copia `.env.example` como `.env` y añade únicamente las claves de los servicios que vayas a utilizar. Nunca publiques `.env` ni compartas sus claves.

| Servicio | Enlace directo para crear la clave | Variable |
|---|---|---|
| Groq | [Crear Groq API Key](https://console.groq.com/keys) | `GROQ_API_KEY` |
| Google Gemini | [Crear Gemini API Key](https://aistudio.google.com/app/apikey) | `GEMINI_API_KEY` |
| Mistral | [Crear Mistral API Key](https://console.mistral.ai/api-keys) | `MISTRAL_API_KEY` |
| OpenRouter | [Crear OpenRouter API Key](https://openrouter.ai/keys) | `OPENROUTER_API_KEY` |
| Ollama Cloud | [Crear Ollama API Key](https://ollama.com/settings/keys) | `OLLAMA_API_KEY` |
| Hugging Face | [Crear Hugging Face Token](https://huggingface.co/settings/tokens) | `AI_API_KEY` |

Proveedores locales sin clave: [Ollama](https://ollama.com/download), [llama.cpp](https://github.com/ggml-org/llama.cpp) y [LocalAI](https://github.com/mudler/LocalAI).

Después de editar `.env`, inicia el bot con:

```bash
npm start
```

## Deploy con Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?template=https://github.com/guianpierrcastillolazo-rgb/whatsapp-media-bot)

[Crear proyecto directamente en Railway](https://railway.com/new/template?template=https://github.com/guianpierrcastillolazo-rgb/whatsapp-media-bot)

Después del despliegue, configura las variables de `.env` en **Variables** y revisa los logs para vincular WhatsApp. Para conservar la sesión y los datos, utiliza un volumen persistente y configura:

```env
AUTH_DIR=/app/data/auth_info
AI_MEMORY_FILE=/app/data/ai-memory.json
```

Para que Railway use primero el código de vinculación por número, añade `WHATSAPP_NUMBER` con el número internacional, solo dígitos y código de país, por ejemplo `51987654321`. Si quieres usar QR, elimina el valor de `WHATSAPP_NUMBER` y vuelve a desplegar. No dejes ambos métodos configurados al mismo tiempo.

Más información: [Documentación de Railway](https://docs.railway.com/).

## Deploy con Heroku

[![Deploy en Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/guianpierrcastillolazo-rgb/whatsapp-media-bot)

[Crear aplicación directamente en Heroku](https://heroku.com/deploy?template=https://github.com/guianpierrcastillolazo-rgb/whatsapp-media-bot)

Después del despliegue, configura las variables de `.env` en **Settings → Config Vars** y revisa los logs para vincular WhatsApp. Heroku utiliza almacenamiento efímero; la sesión de WhatsApp y los archivos de estado pueden desaparecer después de un reinicio.

## Variables mínimas

```env
AI_PROVIDER=local
AI_MODEL=local-model
WHATSAPP_NUMBER=
PAIRING_CODE=false
GROUPS_ENABLED=true
REPLY_IN_PRIVATE=true
```

Las opciones de seguridad del archivo `.env.example` están configuradas con defaults restrictivos. Cambia solo las variables que necesites.
