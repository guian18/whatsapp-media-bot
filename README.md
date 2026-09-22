# InfoPlayer Left

Bot de WhatsApp para Steam, servidores de Left 4 Dead 2, vigilancia e IA.

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

Backends locales sin clave: [Ollama](https://ollama.com/download), [llama.cpp](https://github.com/ggml-org/llama.cpp) y [LocalAI](https://github.com/mudler/LocalAI). Las claves reales deben guardarse en las variables del hosting, nunca en el código ni en el README.

## Imágenes para adultos en WhatsApp

La función está activa por defecto y funciona en todos los grupos y chats privados. Las URLs externas también están habilitadas por defecto. Para desactivarla usa `NSFW_ENABLED=false`; para limitar el acceso, configura los ID numéricos de los grupos separados por comas o cambia `NSFW_ALLOW_PRIVATE_CHATS=false` para bloquear chats privados:

```env
NSFW_ENABLED=true
NSFW_API_URL=https://nekobot.xyz/api/image
NSFW_ALLOWED_GROUPS=
NSFW_ALLOW_EXTERNAL_URLS=true
NSFW_ALLOW_PRIVATE_CHATS=true
```

Usa `!nsfw` para ver las categorías disponibles o escribe directamente una categoría como `!hentai`, `!boobs`, `!ass`, `!feet`, `!lewd`, `!yaoi` o `!4k`. Con `NSFW_ALLOWED_GROUPS` vacío se permiten todos los grupos; `NSFW_ALLOW_PRIVATE_CHATS=true` permite chats privados; `NSFW_ALLOW_EXTERNAL_URLS=true` acepta URLs externas HTTP/HTTPS. También limita una solicitud por chat cada 10 segundos. Si no responde ningún comando, comprueba que `GROUPS_ENABLED=true`, `REPLY_IN_PRIVATE=true` y que `ALLOWED_GROUPS` esté vacío o contenga el ID numérico correcto. Usa esta función solo con personas que tengan la edad y el consentimiento necesarios.

## Enviar videos por URL

Usa `!video` sin argumentos para enviar un video aleatorio, o seguido de una URL pública directa al archivo de video:

```text
!video
!video https://dominio.com/video.mp4
```

Configura el origen de los videos aleatorios en `.env` usando una lista de URLs directas separadas por comas:

```env
VIDEO_URLS=https://cdn.example.com/a.mp4,https://cdn.example.com/b.mp4
```

También puedes configurar una página HTML pública que contenga enlaces directos a videos. El bot revisa los atributos `src`, `href`, `data-src` y `data-video`, resuelve enlaces relativos y escoge uno al azar:

```env
VIDEO_SOURCE_URL=https://ejemplo.com/videos/
```

`VIDEO_PAGE_URL` es un alias compatible para la misma función. Si defines `VIDEO_URLS`, esa lista tiene prioridad; después se consulta `VIDEO_SOURCE_URL`/`VIDEO_PAGE_URL`, y por último `VIDEO_API_URL`.

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
