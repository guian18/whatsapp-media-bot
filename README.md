# InfoPlayer Left

Bot de WhatsApp para Steam, servidores de Left 4 Dead 2, vigilancia e IA.

## Catálogo completo de comandos

Todos los comandos se escriben con `!`. Los nombres pueden personalizarse mediante `COMMAND_ALIASES`; por ejemplo, `COMMAND_ALIASES=ayudame=ayuda,ia2=ai`. El bot muestra los nombres activos con `!ayuda`.

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
| `!phub` | `!phub <URL pública>` | Descarga un video público con PHUB local. Requiere `PHUB_ENABLED=true`, Python, PHUB y ffmpeg. |
| Categorías NSFW | `!4k`, `!anal`, `!ass`, `!blowjob`, `!boobs`, `!feet`, `!gonewild`, `!hass`, `!hboobs`, `!hentai`, `!hentaianal`, `!hkitsune`, `!hmidriff`, `!htigh`, `!hyuri`, `!kanna`, `!lewd`, `!lewdneko`, `!paizuri`, `!pgif`, `!pussy`, `!tentacle`, `!thigh`, `!yaoi` | Solicita una imagen de la categoría configurada. |

Los comandos NSFW tienen un límite de una solicitud por chat cada 10 segundos. Se pueden desactivar con `NSFW_ENABLED=false`, bloquear chats privados con `NSFW_ALLOW_PRIVATE_CHATS=false` y restringir grupos con `NSFW_ALLOWED_GROUPS`.

### Configuración de nombres personalizados

```env
COMMAND_ALIASES=ayudame=ayuda,ia2=ai
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

Backends locales sin clave: [Ollama](https://ollama.com/download), [llama.cpp](https://github.com/ggml-org/llama.cpp) y [LocalAI](https://github.com/mudler/LocalAI). Las claves reales deben guardarse en `.env` o en las variables del hosting, nunca en el código, el README ni GitHub.

### Configuración rápida de tokens

Después de crear una clave, añádela a tu `.env` sin compartirla:

```env
STEAM_API_KEY=tu_clave
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

## Proveedor de video PHUB

El comando `!video` y el proveedor anterior fueron eliminados. Se conserva únicamente:

```text
!phub https://www.pornhub.com/view_video.php?viewkey=...
```

`!phub` está desactivado por defecto. Para activarlo, instala Python, PHUB y normalmente `ffmpeg` en el mismo entorno del bot:

```bash
python3 -m pip install phub
```

```env
PHUB_ENABLED=true
PHUB_PYTHON=python3
PHUB_SCRIPT=scripts/phub_download.py
PHUB_TIMEOUT_MS=180000
```

En Termux instala `ffmpeg` con `pkg install ffmpeg`; en Kali/Debian usa `apt install ffmpeg`. PHUB acepta únicamente URLs públicas HTTP(S) y conserva el límite de 25 MB. No accede a contenido privado, premium, DRM o CAPTCHA. Usa esta función solo con contenido que tengas derecho a guardar.

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
