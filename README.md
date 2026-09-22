# InfoPlayer Left

Bot de WhatsApp para consultar Steam y servidores de Left 4 Dead 2.

## Instalación en Termux

```bash
pkg update -y && pkg upgrade -y
pkg install -y nodejs-lts git
termux-setup-storage
git clone https://github.com/guianpierrcastillolazo-rgb/infoplayerleft.git
cd infoplayerleft
npm ci
cp .env.example .env
nano .env
npm start
```

Para mantenerlo activo en segundo plano:

```bash
pkg install -y tmux
tmux new -s infoplayerleft
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
git clone https://github.com/guianpierrcastillolazo-rgb/infoplayerleft.git
cd infoplayerleft
npm ci
cp .env.example .env
nano .env
npm start
```

Si la versión de Node incluida por la distribución es inferior a 20, instala Node.js 20 o superior desde [Node.js](https://nodejs.org/en/download) antes de ejecutar `npm ci`.

## Instalación en Windows

Instala [Node.js LTS](https://nodejs.org/en/download) y [Git para Windows](https://git-scm.com/download/win). Después abre PowerShell y ejecuta:

```powershell
git clone https://github.com/guianpierrcastillolazo-rgb/infoplayerleft.git
Set-Location infoplayerleft
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
git clone https://github.com/guianpierrcastillolazo-rgb/infoplayerleft.git
cd infoplayerleft
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
| Steam Web API | [Crear Steam API Key](https://steamcommunity.com/dev/apikey) | `STEAM_API_KEY` |
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

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?template=https://github.com/guianpierrcastillolazo-rgb/infoplayerleft)

[Crear proyecto directamente en Railway](https://railway.com/new/template?template=https://github.com/guianpierrcastillolazo-rgb/infoplayerleft)

Después del despliegue, configura las variables de `.env` en **Variables** y revisa los logs para vincular WhatsApp. Para conservar la sesión y los datos, utiliza un volumen persistente y configura:

```env
AUTH_DIR=/app/data/auth_info
AI_MEMORY_FILE=/app/data/ai-memory.json
WATCH_STATE_FILE=/app/data/watchlist.json
OFFICIAL_ADDRESSES_FILE=/app/data/l4d2-official-addresses.txt
STEAM_KEY_FILE=/app/data/.steam_key
```

Más información: [Documentación de Railway](https://docs.railway.com/).

## Deploy con Heroku

[![Deploy en Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/guianpierrcastillolazo-rgb/infoplayerleft)

[Crear aplicación directamente en Heroku](https://heroku.com/deploy?template=https://github.com/guianpierrcastillolazo-rgb/infoplayerleft)

Después del despliegue, configura las variables de `.env` en **Settings → Config Vars** y revisa los logs para vincular WhatsApp. Heroku utiliza almacenamiento efímero; la sesión de WhatsApp y los archivos de estado pueden desaparecer después de un reinicio.

## Variables mínimas

```env
STEAM_API_KEY=tu_clave_de_steam
AI_PROVIDER=local
AI_MODEL=local-model
PAIRING_CODE=false
GROUPS_ENABLED=true
REPLY_IN_PRIVATE=true
```

Las opciones de seguridad del archivo `.env.example` están configuradas con defaults restrictivos. Cambia solo las variables que necesites.

## Menús y comandos de WhatsApp

Todos los comandos empiezan con `!` y se escriben directamente en el chat de WhatsApp.

### Menús disponibles

| Comando | Qué muestra |
|---|---|
| `!ayuda` o `!help` | Menú general con todos los comandos principales. |
| `!nsfw` | Menú de categorías de imágenes para adultos autorizadas. Esta función está desactivada por defecto. |
| `!idioma` o `!idioma lista` | Lista de idiomas y códigos disponibles. |
| `!tono` o `!tono lista` | Lista de tonos disponibles. |
| `!proveedor` o `!proveedor lista` | Lista de proveedores de IA disponibles. |

También puedes escribir `!idioma list`, `!tono list` o `!proveedor list`; la palabra `list` funciona como alias de `lista`.

### IA

```text
!ai <pregunta>
!ia <pregunta>
!ai fuentes <pregunta>
!idioma list
!idioma es-MX
!tono list
!tono formal
!proveedor list
!proveedor ollama
```

Idiomas disponibles: `es-ES`, `es-MX`, `es-AR`, `es-CO`, `en-US`, `en-GB`, `it-IT`, `pt-BR`, `pt-PT`, `fr-FR` y `de-DE`. También se aceptan alias como `es`, `en`, `méxico`, `argentina`, `usa`, `italia`, `brasil` y `francia`.

Tonos disponibles: `tranquilo`, `agresivo`, `insultos`, `formal`, `divertido`, `sarcastico`, `breve` y `amable`.

Proveedores disponibles: `local`, `ollama`, `llama_cpp`, `localai`, `gemini`, `groq`, `mistral` y `openrouter`.

### Steam y Left 4 Dead 2

```text
!info <SteamID64|nickname|URL>
!buscar <nickname>
!servidor <IP:puerto>
!jugadores <IP:puerto>
!ping
```

### Vigilancia de jugadores

```text
!vigilar <nickname|SteamID64|URL>
!vigilarnick <nickname|SteamID64|URL>
!novigilar <nickname|SteamID64|URL>
!lista
!escaneo
!escaneo <número>
!escaneo <nickname|SteamID64|URL>
```

Después de usar `!escaneo`, el bot muestra una lista numerada. Responde únicamente con el número para ejecutar el escaneo seleccionado.

### Imágenes y vídeo

```text
!anime
!nsfw
!4k
!anal
!ass
!blowjob
!boobs
!feet
!gonewild
!hass
!hboobs
!hentai
!hentaianal
!hkitsune
!hmidriff
!htigh
!hyuri
!kanna
!lewd
!lewdneko
!paizuri
!pgif
!pussy
!tentacle
!thigh
!yaoi
!phub <URL pública>
```

Los comandos NSFW requieren `NSFW_ENABLED=true` y las restricciones correspondientes en `.env`. `!phub` requiere `PHUB_ENABLED=true`, Python, PHUB y ffmpeg.
