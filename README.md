# WhatsApp Media Bot

Bot de WhatsApp para IA, imágenes y automatizaciones multimedia.

## Requisitos

- Node.js 20 o superior.
- Git.
- Una cuenta de WhatsApp para vincular el bot.
- Una clave de IA únicamente si utilizas un proveedor remoto como Groq, Gemini, Mistral u OpenRouter.

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

Para mantenerlo activo mientras Termux está abierto:

```bash
pkg install -y tmux
tmux new -s whatsapp-media-bot
npm start
```

Para salir de `tmux` sin detener el bot, pulsa `Ctrl+B` y después `D`. Para volver:

```bash
tmux attach -t whatsapp-media-bot
```

Para actualizar una instalación existente:

```bash
cd ~/whatsapp-media-bot
git pull --ff-only origin main
npm install
npm test
npm start
```

Si tu carpeta todavía se llama `infoplayerleft`:

```bash
cd ~/infoplayerleft
git remote set-url origin https://github.com/guianpierrcastillolazo-rgb/whatsapp-media-bot.git
git pull --ff-only origin main
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

La versión de Node.js debe ser 20 o superior.

## Instalación en Windows

Instala [Node.js LTS](https://nodejs.org/en/download) y [Git para Windows](https://git-scm.com/download/win). Después abre PowerShell:

```powershell
git clone https://github.com/guianpierrcastillolazo-rgb/whatsapp-media-bot.git
Set-Location whatsapp-media-bot
npm ci
Copy-Item .env.example .env
notepad .env
npm start
```

## Instalación en macOS

Instala [Homebrew](https://brew.sh/) si aún no lo tienes:

```bash
brew install node git
git clone https://github.com/guianpierrcastillolazo-rgb/whatsapp-media-bot.git
cd whatsapp-media-bot
npm ci
cp .env.example .env
nano .env
npm start
```

## Configuración de `.env`

Copia `.env.example` como `.env` y edita únicamente lo que necesites. Nunca publiques `.env` ni compartas sus claves.

Configuración básica:

```env
WHATSAPP_NUMBER=
PAIRING_CODE=false
GROUPS_ENABLED=true
REPLY_IN_PRIVATE=true
NSFW_ENABLED=true
NSFW_ALLOW_PRIVATE_CHATS=true
NSFW_ALLOW_EXTERNAL_URLS=true
ALLOW_SELF=true
AUTO_RESET=true
```

Para vincular mediante código con número, escribe el número internacional solo con dígitos:

```env
WHATSAPP_NUMBER=51987654321
PAIRING_CODE=false
```

Para usar QR, deja el número vacío:

```env
WHATSAPP_NUMBER=
PAIRING_CODE=false
```

Si utilizas una API de IA remota, configura el proveedor y su clave correspondiente. Por ejemplo, con Groq:

```env
AI_PROVIDER=groq
AI_MODEL=openai/gpt-oss-20b
GROQ_API_KEY=tu_clave_de_groq
```

Enlaces directos para crear claves:

- [Groq](https://console.groq.com/keys)
- [Google Gemini](https://aistudio.google.com/app/apikey)
- [Mistral](https://console.mistral.ai/api-keys)
- [OpenRouter](https://openrouter.ai/keys)
- [Ollama](https://ollama.com/settings/keys)

## Comandos disponibles

- `!ayuda` — muestra la ayuda.
- `!ping` — comprueba si el bot responde.
- `!ai <pregunta>` o `!ia <pregunta>` — consulta la IA.
- `!tono` — muestra los tonos disponibles.
- `!tono list` — muestra la lista de tonos.
- `!idioma` — muestra los idiomas disponibles.
- `!idioma list` — muestra la lista de idiomas.
- `!proveedor` — muestra los proveedores disponibles.
- `!proveedor list` — muestra la lista de proveedores.
- `!anime` — envía una imagen SFW de anime.
- `!nsfw` — muestra las categorías de imágenes para adultos.
- `!hentai`, `!boobs`, `!ass` y otras categorías — solicitan una imagen si NSFW está habilitado.

## Deploy en Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?template=https://github.com/guianpierrcastillolazo-rgb/whatsapp-media-bot)

También puedes crear el proyecto desde [Railway](https://railway.app/) seleccionando **Deploy from GitHub repo** y el repositorio `guianpierrcastillolazo-rgb/whatsapp-media-bot`.

El repositorio incluye `railway.json` con la instalación y el arranque configurados. En Railway, las variables se pueden editar en **Service → Variables**. Configura como mínimo:

```env
WHATSAPP_NUMBER=
PAIRING_CODE=false
```

Para conservar la sesión entre deploys, crea un volumen montado en `/app/data` y configura:

```env
AUTH_DIR=/app/data/auth_info
AI_MEMORY_FILE=/app/data/ai-memory.json
```

Si Railway ya tiene variables antiguas con valor `false`, actualízalas manualmente desde **Variables**. Después pulsa **Redeploy**.

## Deploy en Heroku

[![Deploy en Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/guianpierrcastillolazo-rgb/whatsapp-media-bot)

Después del despliegue, configura las variables en **Settings → Config Vars**. Heroku utiliza almacenamiento efímero, por lo que la sesión puede perderse después de un reinicio; Railway con volumen persistente es preferible para uso continuo.

## Sesión de WhatsApp

La sesión se guarda en `auth_info/` localmente o en la ruta indicada por `AUTH_DIR`. No borres esa carpeta si no quieres volver a vincular WhatsApp.

Para borrar la sesión y vincularla de nuevo intencionalmente:

```bash
npm run reset
npm start
```

Con `AUTO_RESET=true`, el bot elimina automáticamente una sesión que WhatsApp marque como inválida. Los cortes normales de Internet no deberían borrar una sesión válida.

## Pruebas

```bash
npm test
```

El proyecto debe terminar con todas las pruebas correctas y cero fallos.

## Licencia y seguridad

No subas `.env`, claves API, tokens, `auth_info/` ni copias de seguridad del entorno al repositorio. Revisa siempre los permisos y las políticas de WhatsApp antes de usar el bot en producción.
