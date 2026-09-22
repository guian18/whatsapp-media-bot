# InfoPlayer Left

Bot de WhatsApp para Steam, servidores de Left 4 Dead 2, vigilancia e IA.

## Catálogo completo de comandos

Todos los comandos se escriben con `!`. Los nombres pueden personalizarse mediante `COMMAND_ALIASES`; por ejemplo, `COMMAND_ALIASES=ayudame=ayuda,video2=video`. El bot muestra los nombres activos con `!ayuda`.

### Ayuda y respuesta rápida

| Comando | Uso | Función |
|---|---|---|
| `!ayuda` / `!help` | `!ayuda` | Muestra este catálogo y los nombres personalizados activos. |
| `!ping` | `!ping` | Comprueba que el bot responde. Las respuestas de fallo simuladas se controlan con `PING_DEAD_CHANCE` y `PING_TRIP_CHANCE`. |

### Steam y servidores de Left 4 Dead 2

| Comando | Uso | Función |
|---|---|---|
| `!info` | `!info <SteamID64\|vanity\|URL>` | Consulta el perfil de Steam y, si está disponible, el servidor actual de Left 4 Dead 2. |
| `!buscar` | `!buscar <nickname>` | Busca un jugador por nombre en servidores públicos consultados. |
| `!servidor` | `!servidor <IP:puerto>` | Muestra información del servidor. |
| `!jugadores` | `!jugadores <IP:puerto>` | Muestra información del servidor y la lista de jugadores. |

Ejemplos:

```text
!info 76561198000000000
!info nombre_de_steam
!buscar guian
!servidor 1.2.3.4:27015
!jugadores 1.2.3.4:27015
```

### Vigilancia de jugadores

| Comando | Uso | Función |
|---|---|---|
| `!vigilar` / `!vigilarnick` | `!vigilar <nickname\|SteamID64\|URL>` | Añade un jugador a la vigilancia de este chat. |
| `!novigilar` | `!novigilar <nickname\|SteamID64\|URL>` | Elimina una vigilancia. |
| `!lista` | `!lista` | Muestra los jugadores vigilados en el chat actual. |
| `!escaneo` | `!escaneo` | Muestra las vigilancias numeradas para elegir una. |
| `!escaneo` | `!escaneo <número>` | Ejecuta un escaneo manual de la vigilancia seleccionada. |
| `!escaneo` | `!escaneo <nickname\|SteamID64\|URL>` | Ejecuta un escaneo manual de un objetivo concreto. |

El escaneo automático usa `WATCH_INTERVAL_SECONDS`, limita servidores con `WATCH_MAX_SERVERS` y guarda el estado en `WATCH_STATE_FILE`.

### Inteligencia artificial

| Comando | Uso | Función |
|---|---|---|
| `!ai` / `!ia` | `!ai <pregunta>` | Responde usando el proveedor configurado. |
| `!ai` / `!ia` | `!ai fuentes <pregunta>` | Responde incorporando resultados de búsqueda web. |
| `!tono` | `!tono <estilo>` | Cambia el estilo persistente. Estilos: `tranquilo`, `agresivo`, `insultos`, `formal`, `divertido`, `sarcastico`, `breve`, `amable`. |
| `!idioma` | `!idioma <país\|código>` | Cambia el idioma persistente, por ejemplo `es`, `es-MX`, `en`, `it` o `pt-BR`. |
| `!proveedor` | `!proveedor <nombre>` | Cambia entre `local`, `ollama`, `llama_cpp`, `localai`, `gemini`, `groq`, `mistral` y `openrouter`. |

Ejemplos:

```text
!ai ¿qué novedades hay en Left 4 Dead 2?
!ai fuentes compara dos servidores públicos
!tono formal
!idioma es-MX
!proveedor ollama
```

### Imágenes SFW y NSFW

| Comando | Uso | Función |
|---|---|---|
| `!anime` | `!anime` | Envía una imagen SFW aleatoria de anime. |
| `!nsfw` | `!nsfw` | Muestra las categorías NSFW disponibles. |
| Categorías NSFW | `!4k`, `!anal`, `!ass`, `!blowjob`, `!boobs`, `!feet`, `!gonewild`, `!hass`, `!hboobs`, `!hentai`, `!hentaianal`, `!hkitsune`, `!hmidriff`, `!htigh`, `!hyuri`, `!kanna`, `!lewd`, `!lewdneko`, `!paizuri`, `!pgif`, `!pussy`, `!tentacle`, `!thigh`, `!yaoi` | Solicita una imagen de la categoría configurada. |

Los comandos NSFW tienen un límite de una solicitud por chat cada 10 segundos. Se pueden desactivar con `NSFW_ENABLED=false`, bloquear chats privados con `NSFW_ALLOW_PRIVATE_CHATS=false` y restringir grupos con `NSFW_ALLOWED_GROUPS`.

### Videos y proveedores

| Comando | Uso | Función y requisitos |
|---|---|---|
| `!video` | `!video`<br>`!video <URL directa>`<br>`!video <URL de página>` | Sin argumentos, envía un video aleatorio de `VIDEO_URLS`, `VIDEO_SOURCE_URL` o `VIDEO_API_URL`. Con una URL directa, descarga un video HTTP(S) público. Con una página, extrae el reproductor o recurso; requiere Playwright/Kali si depende de JavaScript. |
| `!apify` | `!apify <URL pública>` | Consulta el actor configurado de Apify; requiere `APIFY_API_TOKEN`. |
| `!phub` | `!phub <URL pública>` | Descarga mediante la biblioteca local PHUB; requiere `PHUB_ENABLED=true`, Python, PHUB y normalmente `ffmpeg`. |

Ejemplos:

```text
!video https://cdn.example.com/video.mp4
!video https://dominio.com/pagina-con-reproductor
!apify https://www.pornhub.com/view_video.php?viewkey=...
!phub https://www.pornhub.com/view_video.php?viewkey=...
```

El bot limita los videos enviados a 25 MB. SaveHub está configurado como adaptador opcional para URLs públicas estándar de Pornhub mediante `VIDEO_SAVEHUB_ENABLED=true`. Los proveedores no acceden a contenido privado, premium, DRM o CAPTCHA. Usa estas funciones únicamente con contenido que tengas derecho a guardar.

### Configuración de nombres personalizados

```env
COMMAND_ALIASES=ayudame=ayuda,video2=video,ia2=ai
```

El alias se escribe a la izquierda y el comando real a la derecha. Solo se aceptan nombres alfanuméricos y guion bajo; no se puede reemplazar directamente un comando original.

## Deploy en Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/guianpierrcastillolazo-rgb/infoplayerleft)

[Deploy directo en Heroku](https://heroku.com/deploy?template=https://github.com/guianpierrcastillolazo-rgb/infoplayerleft)

El proceso utilizado es `worker`. Después del despliegue, configura las variables en **Settings → Config Vars** y revisa los logs para vincular WhatsApp.

```text
worker: npm start
```

Heroku utiliza almacenamiento efímero. La sesión `auth_info/`, `watchlist.json` y `ai-memory.json` pueden desaparecer después de un reinicio o redeploy. Para un uso permanente, utiliza almacenamiento persistente o Railway con un volumen.

## Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?template=https://github.com/guianpierrcastillolazo-rgb/infoplayerleft)

- [Deploy directo en Railway](https://railway.com/new/template?template=https://github.com/guianpierrcastillolazo-rgb/infoplayerleft)
- [Crear proyecto desde GitHub](https://railway.com/new)
- [Panel de Railway](https://railway.com/dashboard)
- [Precios y plan gratuito](https://railway.com/pricing)
- [Documentación oficial](https://docs.railway.com/)
- [Configuración del proyecto](railway.json)

El repositorio ya incluye `railway.json` con `npm ci`, `npm start` y reinicio automático. Para conservar la sesión, crea un volumen montado en `/app/data` y configura:

```env
AUTH_DIR=/app/data/auth_info
AI_MEMORY_FILE=/app/data/ai-memory.json
WATCH_STATE_FILE=/app/data/watchlist.json
OFFICIAL_ADDRESSES_FILE=/app/data/l4d2-official-addresses.txt
STEAM_KEY_FILE=/app/data/.steam_key
```

Railway ofrece una prueba de $5 durante 30 días y después $1 mensual de crédito en el plan gratuito; no es gratuito ilimitado.

## Enlaces directos para crear APIs y claves

| Servicio | Enlace directo | Variable |
|---|---|---|
| Steam Web API | [Crear Steam API Key](https://steamcommunity.com/dev/apikey) | `STEAM_API_KEY` |
| Groq | [Crear Groq API Key](https://console.groq.com/keys) | `GROQ_API_KEY` |
| Google Gemini | [Crear Gemini API Key](https://aistudio.google.com/app/apikey) | `GEMINI_API_KEY` |
| Mistral | [Crear Mistral API Key](https://console.mistral.ai/api-keys) | `MISTRAL_API_KEY` |
| OpenRouter | [Crear OpenRouter API Key](https://openrouter.ai/keys) | `OPENROUTER_API_KEY` |
| Hugging Face | [Crear Hugging Face Token](https://huggingface.co/settings/tokens) | `AI_API_KEY` |
| Ollama Cloud | [Crear Ollama API Key](https://ollama.com/settings/keys) | `OLLAMA_API_KEY` |
| Apify | [Crear Apify API Token](https://console.apify.com/account/integrations) | `APIFY_API_TOKEN` |
| RapidAPI | [Crear RapidAPI Key](https://rapidapi.com/developer/security) | `RAPIDAPI_KEY` |

Servicios sin token del bot: SaveHub usa [su página pública](https://savehub.cc/es/) y `VIDEO_SAVEHUB_URL=https://savehub.cc/d/`; PHUB se instala localmente con `python3 -m pip install phub` y no usa una API key. El comando `!apify` utiliza `APIFY_API_TOKEN`; el comando `!phub` utiliza la instalación local de PHUB. RapidAPI está documentado como alternativa, pero el comando actual no lo usa automáticamente.

Backends locales sin clave: [Ollama](https://ollama.com/download), [llama.cpp](https://github.com/ggml-org/llama.cpp) y [LocalAI](https://github.com/mudler/LocalAI). Las claves reales deben guardarse en `.env` o en las variables del hosting, nunca en el código, el README ni GitHub.

### Configuración rápida de tokens

Después de crear una clave, añádela a tu `.env` sin compartirla:

```env
STEAM_API_KEY=tu_clave
APIFY_API_TOKEN=tu_token
GROQ_API_KEY=tu_clave
GEMINI_API_KEY=tu_clave
MISTRAL_API_KEY=tu_clave
OPENROUTER_API_KEY=tu_clave
OLLAMA_API_KEY=tu_clave
```

No pegues tokens en comandos de WhatsApp ni en capturas de pantalla. Si una clave se filtra, revócala desde el enlace del proveedor y genera otra.

## Imágenes para adultos en WhatsApp

La función está activa por defecto y funciona en todos los grupos y chats privados. Las URLs externas también están habilitadas por defecto. Para desactivarla usa `NSFW_ENABLED=false`; para limitar el acceso, configura los ID numéricos de los grupos separados por comas o cambia `NSFW_ALLOW_PRIVATE_CHATS=false` para bloquear chats privados:

```env
NSFW_ENABLED=true
NSFW_API_URL=https://nekobot.xyz/api/image
NSFW_API_URLS=
NSFW_API_TIMEOUT_MS=20000
NSFW_IMAGE_TIMEOUT_MS=60000
NSFW_DIRECT_URL=true
NSFW_ALLOWED_GROUPS=
NSFW_ALLOW_EXTERNAL_URLS=true
NSFW_ALLOW_PRIVATE_CHATS=true
```

Usa `!nsfw` para ver las categorías disponibles o escribe directamente una categoría como `!hentai`, `!boobs`, `!ass`, `!feet`, `!lewd`, `!yaoi` o `!4k`. Con `NSFW_ALLOWED_GROUPS` vacío se permiten todos los grupos; `NSFW_ALLOW_PRIVATE_CHATS=true` permite chats privados; `NSFW_ALLOW_EXTERNAL_URLS=true` acepta URLs externas HTTP/HTTPS. También limita una solicitud por chat cada 10 segundos. Si no responde ningún comando, comprueba que `GROUPS_ENABLED=true`, `REPLY_IN_PRIVATE=true` y que `ALLOWED_GROUPS` esté vacío o contenga el ID numérico correcto. `NSFW_DIRECT_URL=true` envía la URL a WhatsApp directamente y es el modo rápido; usa `false` para que el bot descargue y valide el archivo con Axios antes de enviarlo. `NSFW_API_URLS` acepta varias APIs separadas por comas; el bot reintenta errores transitorios como HTTP 522 y timeouts, y prueba la siguiente API si la primera no responde. No pongas claves ni cookies en esa variable. Usa esta función solo con personas que tengan la edad y el consentimiento necesarios.

## Enviar videos por URL

Usa `!video` sin argumentos para enviar un video aleatorio, o seguido de una URL pública directa al archivo de video:

```text
!video
!video https://dominio.com/video.mp4
!video https://dominio.com/pagina-con-reproductor
```

Configura el origen de los videos aleatorios en `.env` usando una lista de URLs directas separadas por comas:

```env
VIDEO_URLS=https://cdn.example.com/a.mp4,https://cdn.example.com/b.mp4
```

`!video <URL>` acepta tanto un archivo directo como una página HTML. Para una página, con Playwright activo en Kali el bot ejecuta JavaScript, conserva la cookie configurada, revisa `<video>`, `<source>`, metadatos `og:video` y recursos de red de video, y después envía el archivo detectado. Reconoce respuestas `video/*`, MP4/M4V/MOV, WebM/Matroska, AVI, OGG/OGV, 3GP, MPEG-TS y enlaces con esas extensiones. HLS/DASH segmentado, `blob:`, DRM, CAPTCHA y verificaciones humanas requieren un reproductor o conversor específico y no se pueden convertir siempre en un archivo de WhatsApp.

También puedes configurar una página HTML pública que contenga enlaces directos a videos. El bot revisa los atributos `src`, `href`, `data-src` y `data-video`, resuelve enlaces relativos y escoge uno al azar:

```env
VIDEO_SOURCE_URL=https://ejemplo.com/videos/
```

Si defines `VIDEO_URLS`, esa lista tiene prioridad; después se consulta `VIDEO_SOURCE_URL`, y por último `VIDEO_API_URL`.

Si la página requiere una sesión, puedes proporcionar la cookie completa en una variable privada del entorno, sin escribirla en el código ni compartirla:

```env
VIDEO_SOURCE_COOKIE=session=tu_valor; otra_cookie=otro_valor
VIDEO_USER_AGENT=Mozilla/5.0
VIDEO_ACCEPT_LANGUAGE=es-ES,es;q=0.9,en;q=0.8
```

La cookie se envía tanto al consultar la página como al descargar el video. Esto no resuelve CAPTCHAs, desafíos anti-bot ni renovaciones de sesión; cuando la cookie caduque debes reemplazarla manualmente.

Para páginas que crean el reproductor mediante JavaScript, el ejemplo de configuración usa esta fuente por defecto:

```env
VIDEO_SOURCE_URL=https://it.pornhub.com/
```

Activa opcionalmente el modo de navegador automatizado. Debes instalar Chromium por separado y señalar su ejecutable; `playwright-core` no descarga un navegador automáticamente:

```env
VIDEO_BROWSER_EXECUTABLE_PATH=/ruta/al/ejecutable/chromium
VIDEO_BROWSER_WAIT_MS=3000
VIDEO_SAVEHUB_ENABLED=true
VIDEO_SAVEHUB_URL=https://savehub.cc/d/
```

También puedes conectar un navegador Chromium ya iniciado mediante Chrome DevTools Protocol:

```env
VIDEO_BROWSER_CDP_URL=http://127.0.0.1:9222
```

Si configuras `VIDEO_BROWSER_EXECUTABLE_PATH` o `VIDEO_BROWSER_CDP_URL`, `!video` abre `VIDEO_SOURCE_URL`, espera el tiempo indicado y busca las etiquetas `video`/`source` o metadatos `og:video`. El navegador conserva cookies y envía `Referer`, `Accept-Language` y `User-Agent`, que son cabeceras habituales detrás de OpenResty/Nginx. OpenResty no requiere una integración especial: la compatibilidad depende de que el servidor entregue un recurso de video accesible a la sesión autorizada. No intenta saltar CAPTCHA, DRM, controles de acceso ni verificaciones humanas. Si el reproductor usa una URL `blob:` o segmentos protegidos, no podrá convertirlos en un archivo descargable.

En Android/Termux, Node identifica la plataforma como `android` y Playwright no puede iniciarse directamente allí. En ese entorno el módulo se carga de forma diferida para que el bot siga arrancando; el modo navegador requiere ejecutar el bot dentro de un Linux compatible (por ejemplo Kali mediante `proot-distro`) o usar una API/fuente directa.

Para URLs públicas de videos de Pornhub se usa el adaptador de SaveHub:

```env
VIDEO_SAVEHUB_ENABLED=true
VIDEO_SAVEHUB_URL=https://savehub.cc/d/
```

El adaptador usa únicamente el endpoint público que SaveHub muestra en su página (`GET /d/?url=...`), busca los enlaces de descarga MP4 que devuelve y luego los procesa con el límite normal de 25 MB. Está habilitado en el ejemplo de configuración y solo se aplica a URLs públicas estándar de Pornhub; no funciona para videos privados, premium, DRM o CAPTCHA. Guarda únicamente contenido que tengas derecho a descargar y respeta los términos del servicio.

### Proveedores independientes: `!apify` y `!phub`

También existen dos comandos separados para probar proveedores alternativos con una URL pública:

```text
!apify https://www.pornhub.com/view_video.php?viewkey=...
!phub https://www.pornhub.com/view_video.php?viewkey=...
```

`!apify` requiere un token privado de Apify y usa el actor configurado para obtener una URL de video. Configúralo sin subirlo al repositorio:

```env
APIFY_API_TOKEN=tu_token_privado
APIFY_ACTOR_ID=pintxuki/pornhub-video-downloader
```

`!phub` está desactivado por defecto. Es una integración local opcional con la biblioteca Python PHUB y requiere Python, `phub` y normalmente `ffmpeg` dentro del entorno donde corre el bot:

```bash
python3 -m pip install phub
```

```env
PHUB_ENABLED=true
PHUB_PYTHON=python3
PHUB_SCRIPT=scripts/phub_download.py
PHUB_TIMEOUT_MS=180000
```

La documentación de PHUB advierte que su uso puede contradecir los términos del sitio. Ambos comandos aceptan solo URLs HTTP(S) públicas; no intentan acceder a contenido privado, premium, DRM o CAPTCHA. El límite de envío sigue siendo 25 MB.

También puedes configurar `VIDEO_API_URL` si tienes una API que devuelve JSON con una URL en `url`, `video`, `message`, `result.url` o `data.url`:

```env
VIDEO_API_URL=https://tu-api.example/videos/random
```

El bot descarga el archivo mediante Axios y lo envía a WhatsApp. Acepta HTTP/HTTPS público, limita el tamaño a 25 MB y requiere un enlace directo que devuelva video (por ejemplo `.mp4`, `.webm` o `.mov`). La página configurada debe publicar esos enlaces; no convierte páginas de YouTube, TikTok o Facebook en archivos de video.

## Instalación en Termux

```bash
pkg update && pkg upgrade
pkg install nodejs-lts git
termux-setup-storage
git clone https://github.com/guianpierrcastillolazo-rgb/infoplayerleft.git
cd infoplayerleft
npm ci
cp .env.example .env
nano .env
npm run start:termux
```

Para mantener el bot activo:

```bash
pkg install tmux
tmux new -s infoplayerleft
npm start
```

## Ejecutar el bot dentro de Kali en Termux

Usa este modo cuando `VIDEO_SOURCE_URL` dependa de JavaScript y necesites el Chromium instalado dentro de Kali. El proyecto y su `.env` permanecen en el almacenamiento de Termux, pero Node.js, npm, Playwright y Chromium se ejecutan dentro del contenedor Linux.

Desde Termux, instala Kali si todavía no existe y prepara sus paquetes:

```bash
pkg update -y
pkg install -y proot-distro
proot-distro list
proot-distro install kali-rolling
proot-distro login kali-rolling
```

Ya dentro de Kali, instala Node.js, npm y las herramientas necesarias:

```bash
apt update
apt install -y nodejs npm ca-certificates
cd /data/data/com.termux/files/home/infoplayerleft
npm ci --ignore-scripts
/usr/lib/chromium/chromium --version
node -v
```

El lanzador requiere **Node.js 20 o superior**. Si `node -v` muestra una versión menor, actualiza Node dentro de Kali antes de continuar; no uses el Node de Termux para el modo Playwright.

Si Chromium todavía no existe dentro de Kali:

```bash
apt install -y chromium
```

Configura el `.env` compartido desde Kali, sin reemplazar las claves existentes:

```bash
nano /data/data/com.termux/files/home/infoplayerleft/.env
```

Añade o ajusta únicamente estas variables:

```env
VIDEO_SOURCE_URL=https://it.pornhub.com/
VIDEO_BROWSER_EXECUTABLE_PATH=/usr/lib/chromium/chromium
VIDEO_BROWSER_WAIT_MS=5000
```

Si tienes una cookie autorizada para esa fuente, mantenla solo en `.env`:

```env
VIDEO_SOURCE_COOKIE=nombre=valor; otra_cookie=valor
```

Inicia el bot dentro de Kali:

```bash
cd /data/data/com.termux/files/home/infoplayerleft
npm start
```

### Inicio manual dentro de Kali, sin el script

Si ya ves un prompt de Kali parecido a `root㉿localhost`, no uses `cd ~/infoplayerleft`: dentro de Kali `~` significa `/root`. El proyecto compartido está en `/data/data/com.termux/files/home/infoplayerleft`. Ejecuta esta secuencia exactamente:

```bash
# Dentro de Kali
cd /data/data/com.termux/files/home/infoplayerleft || exit 1
pwd
git pull --ff-only origin main
npm ci --ignore-scripts

# Comprueba el entorno Linux y el navegador
uname -s
node -v
npm -v
/usr/lib/chromium/chromium --version

# Configura el .env compartido sin borrar las claves existentes
nano /data/data/com.termux/files/home/infoplayerleft/.env

# Arranca el bot dentro de Kali
export VIDEO_BROWSER_EXECUTABLE_PATH=/usr/lib/chromium/chromium
export VIDEO_BROWSER_WAIT_MS=5000
npm start
```

Para detener el bot, pulsa `Ctrl+C`. Para salir de Kali después de detenerlo, ejecuta `exit`. En una nueva sesión, entra otra vez desde Termux y repite el inicio manual:

```bash
# En Termux
proot-distro login kali-rolling

# Ya dentro de Kali
cd /data/data/com.termux/files/home/infoplayerleft || exit 1
export VIDEO_BROWSER_EXECUTABLE_PATH=/usr/lib/chromium/chromium
export VIDEO_BROWSER_WAIT_MS=5000
npm start
```

No ejecutes `git pull`, `npm ci` ni `npm start` desde `~` en Kali: primero debes entrar en la ruta compartida del proyecto. Si `/usr/lib/chromium/chromium` no existe, instala el navegador dentro de Kali con `apt update && apt install -y chromium`.

Para salir de Kali sin detener procesos en primer plano, pulsa `Ctrl+D` solo cuando el bot no esté ejecutándose; para detener el bot usa `Ctrl+C`. En una nueva sesión de Termux puedes volver a iniciarlo con:

```bash
cd ~/infoplayerleft
sh scripts/start-kali.sh
```

El script comprueba automáticamente que esté dentro de Linux, valida Node 20+, localiza Chromium en `/usr/lib/chromium/chromium` o `/usr/bin/chromium`, exporta `VIDEO_BROWSER_EXECUTABLE_PATH` para esa ejecución y arranca el bot. Si falla una comprobación, muestra el comando de instalación correspondiente.

El script acepta otro nombre de distribución o ruta del proyecto si lo necesitas:

```bash
KALI_DISTRO=kali-rolling PROJECT_DIR="$HOME/infoplayerleft" sh scripts/start-kali.sh
```

No ejecutes `npm start` directamente desde Termux cuando quieras el modo Playwright: allí Node informa `process.platform=android`, mientras que dentro de Kali informa `linux`. El modo navegador tampoco supera CAPTCHA, DRM ni verificaciones humanas.

## Ollama en Termux

Ollama no ofrece un paquete Android/Termux oficial. En Termux puedes ejecutarlo dentro de Debian mediante `proot-distro`. Abre una sesión de Termux y ejecuta:

```bash
pkg update -y
pkg install proot-distro -y
proot-distro install debian
proot-distro login debian
apt update && apt install -y curl ca-certificates
curl -fsSL https://ollama.com/install.sh | sh
ollama serve > "$HOME/ollama.log" 2>&1 &
sleep 3
ollama pull llama3.2:3b
```

Deja esa sesión abierta para mantener Ollama activo. En otra sesión de Termux, configura el bot sin reemplazar tus claves actuales:

```bash
cd ~/infoplayerleft
touch .env

agregar_si_falta() {
  clave="$1"
  valor="$2"
  if ! grep -qE "^${clave}=" .env; then
    printf "\n%s=%s\n" "$clave" "$valor" >> .env
  fi
}

agregar_si_falta AI_PROVIDER ollama
agregar_si_falta AI_MODEL llama3.2:3b
agregar_si_falta OLLAMA_URL http://127.0.0.1:11434/v1/chat/completions

npm start
```

Para comprobar que Ollama responde desde Termux:

```bash
curl http://127.0.0.1:11434/api/tags
```

En teléfonos con poca memoria, usa un modelo pequeño como `llama3.2:1b`. El rendimiento y la disponibilidad dependen del dispositivo; si Ollama no inicia dentro de `proot-distro`, ejecútalo en un ordenador o servidor y cambia `OLLAMA_URL` por la dirección accesible de ese equipo.

Para volver a vincular WhatsApp:

```bash
npm run relink
```

## Variables mínimas

```env
STEAM_API_KEY=tu_clave
AI_PROVIDER=ollama
AI_MODEL=gpt-oss:20b
OLLAMA_URL=http://127.0.0.1:11434/v1/chat/completions
OLLAMA_API_KEY=ollama
PAIRING_CODE=false
GROUPS_ENABLED=true
REPLY_IN_PRIVATE=true
```

[Repositorio privado](https://github.com/guianpierrcastillolazo-rgb/infoplayerleft)
