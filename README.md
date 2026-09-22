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
git clone https://github.com/guian18/whatsapp-media-bot.git
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
npm ci
npm test
npm start
```

Si tu carpeta todavía se llama `infoplayerleft`:

```bash
cd ~/infoplayerleft
git remote set-url origin https://github.com/guian18/whatsapp-media-bot.git
git pull --ff-only origin main
```

## Instalación en Linux

Compatible con Ubuntu, Debian y distribuciones similares.

```bash
sudo apt update
sudo apt install -y git curl nodejs npm
git clone https://github.com/guian18/whatsapp-media-bot.git
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
git clone https://github.com/guian18/whatsapp-media-bot.git
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
git clone https://github.com/guian18/whatsapp-media-bot.git
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
NSFW_ALLOW_EXTERNAL_URLS=false
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

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?template=https://github.com/guian18/whatsapp-media-bot)

También puedes crear el proyecto desde [Railway](https://railway.app/) seleccionando **Deploy from GitHub repo** y el repositorio `guian18/whatsapp-media-bot`.

El repositorio incluye `railway.json` con la instalación y el arranque configurados. Las variables se editan en **Service → Variables**.

### Variables mínimas

```env
WHATSAPP_NUMBER=
PAIRING_CODE=false
```

### Qué colocar en las variables

Estas son las variables que suelen generar dudas en Railway. No copies las comillas y no compartas públicamente ninguna clave API.

| Variable | Qué debes colocar |
|---|---|
| `ENV_FILE` | Ruta a un archivo `.env` alternativo. En Railway normalmente déjala vacía; el bot usa `.env` por defecto y Railway entrega directamente sus variables al proceso. En Termux/Linux puedes usar, por ejemplo, `/home/usuario/whatsapp-media-bot/.env`. |
| `NSFW_API_KEY` | Déjala vacía. El bot no utiliza esta variable ni necesita una clave para sus proveedores incluidos. |
| `NSFW_API_URLS` | Orígenes NSFW separados por comas. El valor recomendado es `nekobot,waifuim`: el bot consulta Waifu.im automáticamente si Nekobot devuelve un error HTTP temporal. También admite URLs de una API propia compatible con el formato de Nekobot. |
| `NSFW_API_URL` | Variable heredada para una sola URL compatible con Nekobot. Déjala vacía en instalaciones nuevas; si contiene la URL de Nekobot, Waifu.im se añadirá como respaldo automáticamente. |
| `NSFW_API_RETRIES` y `NSFW_IMAGE_RETRIES` | Reintentos adicionales por origen y por descarga, respectivamente. El valor recomendado es `1`; se admiten de `0` a `3` para API y de `0` a `2` para imágenes. |
| `NSFW_DIRECT_URL` | `false` (recomendado) descarga y valida la imagen antes de enviarla a WhatsApp, por lo que el bot puede informar y reintentar fallos HTTP del CDN. Usa `true` solo si prefieres que WhatsApp descargue la URL directamente. |
| `NSFW_ALLOW_EXTERNAL_URLS` | Déjala en `false` para aceptar únicamente los CDN HTTPS de Nekobot y Waifu.im. Cámbiala a `true` solo si configuraste una API propia que devuelve imágenes desde otro dominio HTTPS de confianza. |
| `ALLOWED_GROUPS` | IDs de grupos permitidos, separados por comas. Déjala vacía para permitir todos los grupos. Ejemplo: `120363012345678901@g.us,120363098765432109@g.us`. |
| `GEMINI_API_KEY` | Una clave de [Google AI Studio](https://aistudio.google.com/app/apikey). Solo es necesaria si usas `AI_PROVIDER=gemini`; en otro caso, déjala vacía. |
| `OLLAMA_API_KEY` | La clave de tu servidor Ollama si está protegido por autenticación. Para Ollama local sin autenticación, déjala vacía. |
| `OPENROUTER_API_KEY` | Una clave de [OpenRouter](https://openrouter.ai/keys). Solo es necesaria si usas `AI_PROVIDER=openrouter`; en otro caso, déjala vacía. |
| `LLAMA_CPP_API_KEY` | La clave configurada en tu servidor `llama.cpp` si exige autenticación. Para un servidor local sin autenticación, déjala vacía. |
| `NSFW_ALLOWED_GROUPS` | IDs de grupos donde se permiten específicamente los comandos NSFW, separados por comas. Déjala vacía para no limitar por grupo cuando `NSFW_ENABLED=true`. |
| `AI_API_KEY` | Clave genérica del proveedor de IA elegido. Úsala como alternativa si no configuras la variable específica del proveedor; por ejemplo, una clave compatible con Gemini, OpenRouter u otro proveedor remoto. Para `local`, `ollama`, `llama_cpp` o `localai` sin autenticación, déjala vacía. |

#### Ejemplo recomendado para Railway

Si quieres usar el modo local y permitir todos los grupos, puedes dejar las variables opcionales vacías:

```env
ENV_FILE=
NSFW_API_KEY=
NSFW_API_URLS=nekobot,waifuim
NSFW_API_RETRIES=1
NSFW_IMAGE_RETRIES=1
NSFW_DIRECT_URL=false
ALLOWED_GROUPS=
GEMINI_API_KEY=
OLLAMA_API_KEY=
OPENROUTER_API_KEY=
LLAMA_CPP_API_KEY=
NSFW_ALLOWED_GROUPS=
AI_API_KEY=
```

Configura una sola opción de IA remota cuando la necesites. Por ejemplo, para OpenRouter:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=tu_clave_de_openrouter
```

No es necesario rellenar simultáneamente `AI_API_KEY`, `GEMINI_API_KEY`, `OLLAMA_API_KEY`, `OPENROUTER_API_KEY` y `LLAMA_CPP_API_KEY`. Elige el proveedor en `AI_PROVIDER` y añade únicamente la clave que corresponda.

Configura también los permisos que quieras utilizar. Los valores recomendados son:

```env
GROUPS_ENABLED=true
REPLY_IN_PRIVATE=true
NSFW_ENABLED=true
NSFW_ALLOW_PRIVATE_CHATS=true
NSFW_ALLOW_EXTERNAL_URLS=false
ALLOW_SELF=true
AUTO_RESET=true
```

### Volumen persistente para WhatsApp

Railway puede crear un contenedor nuevo durante cada deploy. Para que la sesión no desaparezca, crea un volumen conectado al mismo servicio que ejecuta `npm start`:

1. Abre el proyecto en Railway.
2. Selecciona el servicio del bot.
3. Entra en **Volumes**.
4. Pulsa **Add Volume** o **New Volume**.
5. Ponle un nombre, por ejemplo `whatsapp-data`.
6. Usa exactamente esta ruta de montaje:

```text
/app/data
```

7. Guarda el volumen y comprueba que está conectado al servicio del bot.
8. En **Variables**, añade:

```env
AUTH_DIR=/app/data/auth_info
AI_MEMORY_FILE=/app/data/ai-memory.json
```

La estructura persistente será:

```text
/app/data/
├── auth_info/
└── ai-memory.json
```

Después de guardar las variables, pulsa **Redeploy**. Vincula WhatsApp después del primer deploy. En los siguientes cambios, Railway reutilizará la sesión mientras conserves el mismo volumen.

No borres el volumen ni cambies `/app/data` después de vincular WhatsApp. Tampoco ejecutes `npm run reset` si quieres conservar la sesión. No uses `/tmp/auth_info`, `/app/auth_info` ni `./auth_info` como ruta de producción porque pueden desaparecer durante un redeploy.

Si Railway ya tiene variables antiguas con valor `false`, actualízalas manualmente desde **Variables** y vuelve a desplegar. Las variables del repositorio sirven como ejemplo; las variables configuradas en el panel de Railway son las que se aplican al servicio.

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
