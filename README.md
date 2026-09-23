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
- `!proveedor list` — muestra la lista de proveedores disponibles.
- `!anime` o `!gatus` — envía una imagen SFW de anime.
- `!nsfw` — muestra las categorías de imágenes para adultos.
- `!hentai`, `!boobs`, `!ass` y otras categorías — solicitan una imagen si NSFW está habilitado.

## Deploy en Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?template=https://github.com/guian18/whatsapp-media-bot)

También puedes crear el proyecto desde [Railway](https://railway.app/) seleccionando **Deploy from GitHub repo** y el repositorio `guian18/whatsapp-media-bot`.

El repositorio incluye `railway.json` con la instalación y el arranque configurados. Las variables se editan en **Service → Variables**.

### Estado de compatibilidad

El código está preparado para ejecutarse como un **Worker/Service de Railway**: usa Node.js 20 o superior, instala las dependencias con `npm install --omit=dev`, arranca con `npm start` y reinicia el proceso si termina con error. Se usa `npm install` en Railway para evitar el error `npm EBUSY` que puede aparecer cuando el builder reutiliza el directorio cacheado `/app/node_modules`; localmente y en CI se mantiene `npm ci`. No necesita exponer un puerto HTTP porque funciona como bot persistente de WhatsApp; no configures un healthcheck HTTP ni un dominio público para este servicio.

Para que la sesión de WhatsApp sobreviva a los redeploys, el volumen persistente y las variables de almacenamiento son obligatorios. Sin ellos, el bot puede arrancar, pero Railway perderá `auth_info` cuando cree un contenedor nuevo y tendrás que vincular WhatsApp otra vez.

### Variables mínimas

```env
WHATSAPP_NUMBER=
PAIRING_CODE=false
```

### Configuración definitiva recomendada para Railway

Copia este bloque en **Service → Variables**. Las claves de Reddit y Rule34 solo son necesarias si vas a seleccionar esos proveedores; no las publiques ni las subas al repositorio.

```env
WHATSAPP_NUMBER=TU_NUMERO_INTERNACIONAL
PAIRING_CODE=false

GROUPS_ENABLED=true
ALLOWED_GROUPS=
REPLY_IN_PRIVATE=true
ALLOW_SELF=true
AUTO_RESET=true

NSFW_ENABLED=true
NSFW_ALLOW_PRIVATE_CHATS=true
NSFW_ALLOWED_GROUPS=
NSFW_API_URLS=reddit,rule34,nekobot,waifuim
NSFW_PROVIDER=reddit
NSFW_API_TIMEOUT_MS=10000
NSFW_IMAGE_TIMEOUT_MS=30000
NSFW_API_RETRIES=1
NSFW_IMAGE_RETRIES=1
NSFW_DIRECT_URL=false
NSFW_ALLOW_EXTERNAL_URLS=true

AUTH_DIR=/app/data/auth_info
AI_MEMORY_FILE=/app/data/ai-memory.json

REDDIT_CLIENT_ID=TU_CLIENT_ID
REDDIT_CLIENT_SECRET=TU_CLIENT_SECRET
REDDIT_REFRESH_TOKEN=TU_REFRESH_TOKEN
REDDIT_USER_AGENT=whatsapp-media-bot/1.0

RULE34_USER_ID=TU_USER_ID
RULE34_API_KEY=TU_API_KEY
```

`!proveedor` está reservado exclusivamente para la IA. Para NSFW usa `!nsfwproveedor list` o `!nsfwproveedor reddit`, `!nsfwproveedor rule34`, `!nsfwproveedor nekobot` y `!nsfwproveedor waifuim`. No configures `NSFW_API_URL` en instalaciones nuevas: es una variable heredada.

### Qué colocar en las variables

Estas son las variables que suelen generar dudas en Railway. No copies las comillas y no compartas públicamente ninguna clave API.

| Variable | Qué debes colocar |
|---|---|
| `ENV_FILE` | Ruta a un archivo `.env` alternativo. En Railway normalmente déjala vacía; el bot usa `.env` por defecto y Railway entrega directamente sus variables al proceso. En Termux/Linux puedes usar, por ejemplo, `/home/usuario/whatsapp-media-bot/.env`. |
| `NSFW_API_URLS` | Lista de proveedores disponibles, separada por comas. Usa `reddit,rule34,nekobot,waifuim` y selecciona uno con `NSFW_PROVIDER` o `!nsfwproveedor <nombre>`. Solo se hace una solicitud al proveedor elegido; no existe fallback automático. |
| `NSFW_PROVIDER` | Proveedor NSFW único y manual: `reddit`, `rule34`, `nekobot` o `waifuim`. Si lo defines, el bot no usa ningún fallback. También puedes cambiarlo durante la ejecución con `!nsfwproveedor <nombre>`. |
| `NSFW_API_URL` | Variable heredada para una sola URL compatible con Nekobot. Déjala vacía en instalaciones nuevas; si la usas, ese será el único origen disponible. |
| `NSFW_API_RETRIES` y `NSFW_IMAGE_RETRIES` | Reintentos adicionales por origen y por descarga, respectivamente. El valor recomendado es `1`; se admiten de `0` a `3` para API y de `0` a `2` para imágenes. |
| `NSFW_DIRECT_URL` | `false` (recomendado) descarga y valida la imagen antes de enviarla a WhatsApp, por lo que el bot puede informar y reintentar fallos HTTP del CDN. Usa `true` solo si prefieres que WhatsApp descargue la URL directamente. |
| `NSFW_ALLOW_EXTERNAL_URLS` | Está en `true` para permitir fuentes HTTPS externas por defecto. El bot sigue bloqueando HTTP, credenciales en URL y hosts privados/locales. Usa `false` si quieres limitarlo solo a los CDN de Nekobot y Waifu.im. |
| `ALLOWED_GROUPS` | IDs de grupos permitidos, separados por comas. Déjala vacía para permitir todos los grupos. Ejemplo: `120363012345678901@g.us,120363098765432109@g.us`. |
| `GEMINI_API_KEY` | Una clave de [Google AI Studio](https://aistudio.google.com/app/apikey). Solo es necesaria si usas `AI_PROVIDER=gemini`; en otro caso, déjala vacía. |
| `OLLAMA_API_KEY` | La clave de tu servidor Ollama si está protegido por autenticación. Para Ollama local sin autenticación, déjala vacía. |
| `OPENROUTER_API_KEY` | Una clave de [OpenRouter](https://openrouter.ai/keys). Solo es necesaria si usas `AI_PROVIDER=openrouter`; en otro caso, déjala vacía. |
| `LLAMA_CPP_API_KEY` | La clave configurada en tu servidor `llama.cpp` si exige autenticación. Para un servidor local sin autenticación, déjala vacía. |
| `NSFW_ALLOWED_GROUPS` | IDs de grupos donde se permiten específicamente los comandos NSFW, separados por comas. Déjala vacía para no limitar por grupo cuando `NSFW_ENABLED=true`. |
| `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_REFRESH_TOKEN` | Credenciales OAuth de una aplicación de Reddit. Son obligatorias para el proveedor `reddit`; nunca las pongas en el código ni las compartas. `REDDIT_USER_AGENT` debe identificar tu aplicación. |
| `RULE34_USER_ID`, `RULE34_API_KEY` | Credenciales de la API oficial de Rule34. Son obligatorias para el proveedor `rule34`; el bot usa únicamente etiquetas cerradas y `rating:explicit -status:deleted`. |
| `AI_API_KEY` | Clave genérica del proveedor de IA elegido. Úsala como alternativa si no configuras la variable específica del proveedor; por ejemplo, una clave compatible con Gemini, OpenRouter u otro proveedor remoto. Para `local`, `ollama`, `llama_cpp` o `localai` sin autenticación, déjala vacía. |
| `AI_PROVIDER` | En Railway no uses `local`, `ollama`, `llama_cpp` ni `localai` salvo que también hayas desplegado ese servidor dentro de una red accesible. Para usar `!ai`, elige un proveedor remoto como `groq`, `gemini`, `mistral` u `openrouter` y configura únicamente su clave. |
| `AUTH_DIR` | Debe ser `/app/data/auth_info` cuando uses el volumen recomendado. No lo dejes en `auth_info` en producción si quieres conservar la sesión. |
| `AI_MEMORY_FILE` | Debe ser `/app/data/ai-memory.json` cuando uses memoria de IA persistente. |

#### Enlaces directos para obtener las credenciales

Para Reddit, crea la aplicación desde [Reddit App Preferences](https://www.reddit.com/prefs/apps). En la aplicación creada, el texto corto que aparece bajo el nombre es `REDDIT_CLIENT_ID` y el campo **secret** es `REDDIT_CLIENT_SECRET`. Usa el flujo OAuth documentado en la [guía oficial de Reddit OAuth2](https://github.com/reddit-archive/reddit/wiki/OAuth2) y la [documentación oficial de la API OAuth](https://www.reddit.com/dev/api/oauth/) para autorizar la cuenta y guardar el `refresh_token` como `REDDIT_REFRESH_TOKEN`. No pegues aquí el `access_token`: el bot lo renueva automáticamente usando el refresh token.

`REDDIT_USER_AGENT` no es una clave ni un token: es un texto identificativo que envía el bot a Reddit. Puedes usar exactamente `whatsapp-media-bot/1.0` o una variante que incluya tu nombre de usuario y versión, por ejemplo `whatsapp-media-bot/1.0 by u/tu_usuario`. No uses un User-Agent genérico como `curl`.

Para Rule34, inicia sesión y abre directamente [Account → API Access Credentials](https://rule34.xxx/index.php?page=account&s=options). Allí obtienes `RULE34_USER_ID` y generas `RULE34_API_KEY`. La referencia de parámetros y autenticación está en la [documentación oficial de Rule34 API](https://api.rule34.xxx/). Mantén ambas credenciales privadas y no solicites más de una API key.

### Proveedor NSFW manual

También puede activarse **NSWFparse (Reddit real)**, adaptado del repositorio [zachey01/nswf-tg-bot](https://github.com/zachey01/nswf-tg-bot). Solo se conectan los métodos de `reddit.real` para personas reales; no se habilitan los módulos hentai del paquete. Requiere que el operador tenga autorización para consultar y redistribuir el contenido obtenido y que cumpla las reglas de Reddit y la legislación aplicable.

```env
NSFW_ENABLED=true
NSFW_ALLOW_PRIVATE_CHATS=true
NSFW_API_URLS=nswfparse
NSFW_PROVIDER=nswfparse
NSWFPARSE_ENABLED=true
NSWFPARSE_CATEGORIES=ass,feet,gonewild,blowjob,pussy,thigh,hyuri,lesbian,bdsm
```

El proveedor ofrece categorías compatibles como `!ass`, `!feet`, `!gonewild`, `!blowjob`, `!pussy` y `!thigh`. Si la categoría no tiene un método real exacto, el bot la rechaza en lugar de cambiar a otra fuente.

Para apagar o encender este proveedor sin cambiar el código usa `NSWFPARSE_ENABLED=false` o `NSWFPARSE_ENABLED=true`. Esta variable controla el proveedor completo; no elimina los filtros permanentes que excluyen categorías inseguras.

`NSWFPARSE_CATEGORIES` es una lista explícita separada por comas. Solo se aceptan categorías adultas predefinidas por el adaptador; cualquier otro valor se ignora y la categoría queda bloqueada.

Todos los proveedores pasan por el mismo envío multimedia: si devuelven una imagen se manda como imagen, un `.gif` como GIF reproducible y un vídeo (`.mp4`, `.webm`, `.mov` o `video/*`) como vídeo de WhatsApp. Cuando `NSFW_DIRECT_URL` no está activo, el bot descarga primero, limita el archivo a 15 MB y valida su formato antes de enviarlo.

El orden configurado es **Reddit (adaptación del flujo de `pvnotpv/wabot`) → Rule34 API → Nekobot (la fuente usada por `Nekros-dsc/Nsfw-Bot`) → Waifu.im**. Reddit consulta únicamente subreddits cerrados para `ass`, `boobs`, `gonewild` y `pussy`; Rule34 usa una lista cerrada de tags y credenciales oficiales; Nekobot conserva sus tipos originales; Waifu.im solo se usa cuando confirma una etiqueta exacta. Los repositorios de bots no se ejecutan como sub-bots: se reutiliza únicamente su patrón de proveedor.

El bot fija la versión `v7`, solicita únicamente contenido marcado explícitamente como NSFW, excluye las etiquetas `loli` y `shota`, valida la URL/CDN y muestra la fuente en el pie de la imagen. El proveedor seleccionado se usa de forma exclusiva: si no tiene credenciales o falla, el bot informa del error y no cambia de origen. Rule34 exige `rating:explicit`, excluye `loli`, `shota`, `young`, `underage` y `child`, y no permite búsquedas libres. Reddit solo acepta URLs de imagen directa de los subreddits configurados; esto no verifica edad, consentimiento, licencia ni legalidad del contenido y debe usarse únicamente donde sea legal y permitido.

Se investigaron bots y APIs con contenido adulto realista y se incorporó el flujo de `pvnotpv/wabot` como adaptador de Reddit, no el bot completo. Los candidatos no ofrecen garantías verificables de mayoría de edad, consentimiento, derechos, moderación o legalidad; por eso el código usa subreddits y etiquetas cerrados, no búsquedas libres. Esto no reemplaza la verificación de edad, el consentimiento ni el cumplimiento de las políticas de WhatsApp, la legislación local y los términos de cada proveedor.

#### Variables recomendadas para Railway

Este bloque sirve como base para un bot que usa medios y NSFW. No pongas comillas y no copies claves de ejemplo:

```env
WHATSAPP_NUMBER=51987654321
PAIRING_CODE=false
GROUPS_ENABLED=true
REPLY_IN_PRIVATE=true
NSFW_ENABLED=true
NSFW_ALLOW_PRIVATE_CHATS=true
NSFW_ALLOWED_GROUPS=
NSFW_API_URLS=reddit,rule34,nekobot,waifuim
NSFW_PROVIDER=reddit
NSFW_API_RETRIES=1
NSFW_IMAGE_RETRIES=1
NSFW_DIRECT_URL=false
ALLOWED_GROUPS=
NSFW_ALLOW_EXTERNAL_URLS=true
REDDIT_CLIENT_ID=tu_client_id
REDDIT_CLIENT_SECRET=tu_client_secret
REDDIT_REFRESH_TOKEN=tu_refresh_token
REDDIT_USER_AGENT=whatsapp-media-bot/1.0
RULE34_USER_ID=tu_user_id
RULE34_API_KEY=tu_api_key
ALLOW_SELF=true
AUTO_RESET=true
AUTH_DIR=/app/data/auth_info
AI_MEMORY_FILE=/app/data/ai-memory.json
```

`WHATSAPP_NUMBER` debe contener solo dígitos con código internacional. Con un número configurado, el bot solicita el código de vinculación en los logs de Railway; introdúcelo en WhatsApp desde **Dispositivos vinculados → Vincular con número de teléfono**. Si prefieres QR, deja `WHATSAPP_NUMBER` vacío y revisa los logs del servicio.

Para cambiar el proveedor NSFW sin redeployar, usa `!nsfwproveedor reddit`, `!nsfwproveedor rule34`, `!nsfwproveedor nekobot` o `!nsfwproveedor waifuim`. Consulta el activo con `!nsfwproveedor list`. Para volver al primero configurado, usa `!nsfwproveedor automático`; esto no activa fallback, solo selecciona el primer elemento de `NSFW_API_URLS`. La selección hecha por comando dura hasta reiniciar; para dejarla permanente, configura `NSFW_PROVIDER` en Railway. `!proveedor` queda reservado exclusivamente para la IA.

El bloque anterior no configura IA. Para habilitar `!ai` en Railway, añade una sola configuración remota, por ejemplo:

```env
AI_PROVIDER=groq
GROQ_API_KEY=tu_clave_de_groq
AI_MODEL=openai/gpt-oss-20b
```

No configures `AI_PROVIDER=local` esperando que Railway encuentre tu llama.cpp u Ollama del ordenador: `127.0.0.1` dentro de Railway apunta al propio contenedor y no a tu dispositivo.

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
NSFW_ALLOW_EXTERNAL_URLS=true
ALLOW_SELF=true
AUTO_RESET=true
```

### Volumen persistente para WhatsApp — obligatorio en producción

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

Comprueba en los logs que el proceso muestra `Conectado a WhatsApp` y que no aparece un error de permisos para `/app/data`. Si la vinculación se completa, no ejecutes `npm run reset` y no elimines el volumen.

No borres el volumen ni cambies `/app/data` después de vincular WhatsApp. Tampoco ejecutes `npm run reset` si quieres conservar la sesión. No uses `/tmp/auth_info`, `/app/auth_info` ni `./auth_info` como ruta de producción porque pueden desaparecer durante un redeploy.

Si Railway ya tiene variables antiguas con valor `false`, actualízalas manualmente desde **Variables** y vuelve a desplegar. Las variables del repositorio sirven como ejemplo; las variables configuradas en el panel de Railway son las que se aplican al servicio.

### Actualizar el servicio sin perder la sesión

Desde Railway, usa **Redeploy** después de cambiar variables o de fusionar una actualización en `main`. No borres el volumen ni cambies `/app/data`. Para comprobar el mismo flujo localmente antes de desplegar:

```bash
npm ci
npm test
```

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
