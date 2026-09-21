# InfoPlayer Left

Bot de WhatsApp para consultar perfiles de Steam, buscar jugadores y consultar servidores de **Left 4 Dead 2** mediante Steam Web API y consultas A2S. También incluye IA opcional, vigilancia de jugadores y una app móvil de control.

Funciona con Node.js 20 o superior en Linux, macOS, Windows, Termux y Heroku.

## Funciones

- Perfiles de Steam y búsqueda de jugadores en servidores públicos.
- Información A2S de servidores públicos, oficiales, locales y privados.
- Vigilancia de jugadores con avisos automáticos y consultas manuales.
- IA configurable con Ollama, llama.cpp, LocalAI, Groq, Gemini, Mistral u OpenRouter.
- Ollama local con API compatible con OpenAI.
- Memoria privada por chat, tono e idioma configurables.
- Imágenes de anime SFW.
- App móvil Expo para controlar el bot mediante el Control API.
- Despliegue en Heroku como proceso `worker`.

## Requisitos

- Node.js 20 o superior.
- Git.
- Un teléfono con WhatsApp para vincular la sesión.
- Una Steam Web API Key para las funciones de Steam.
- Una clave del proveedor de IA elegido si se usará IA remota.

## Enlaces directos

### Steam y Left 4 Dead 2

| Recurso | Enlace |
|---|---|
| Crear o consultar la Steam Web API Key | [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) |
| Documentación de Steam Web API | [developer.valvesoftware.com/wiki/Steam_Web_API](https://developer.valvesoftware.com/wiki/Steam_Web_API) |
| Documentación de consultas A2S | [developer.valvesoftware.com/wiki/Server_queries](https://developer.valvesoftware.com/wiki/Server_queries) |
| Wiki oficial de Left 4 Dead 2 | [developer.valvesoftware.com/wiki/Left_4_Dead_2](https://developer.valvesoftware.com/wiki/Left_4_Dead_2) |
| Comunidad de Steam | [steamcommunity.com](https://steamcommunity.com/) |

### Proveedores de IA

| Proveedor | Crear clave | Documentación |
|---|---|---|
| Groq | [console.groq.com/keys](https://console.groq.com/keys) | [console.groq.com/docs](https://console.groq.com/docs) |
| Gemini | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | [ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs) |
| Mistral | [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys) | [docs.mistral.ai/api](https://docs.mistral.ai/api/) |
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) | [openrouter.ai/docs](https://openrouter.ai/docs/quickstart) |
| Ollama local | No requiere clave para el servidor local | [ollama.com/download](https://ollama.com/download) · [docs.ollama.com/api/openai-compatibility](https://docs.ollama.com/api/openai-compatibility) · [último release](https://github.com/ollama/ollama/releases/latest) |
| llama.cpp local | No requiere clave remota | [github.com/ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) |
| LocalAI local | No requiere clave en una instalación local | [github.com/mudler/LocalAI](https://github.com/mudler/LocalAI) · [compatibilidad OpenAI](https://localai.io/features/openai-compatibility/) |

### WhatsApp, app y despliegue

| Recurso | Enlace |
|---|---|
| Dispositivos vinculados de WhatsApp | [faq.whatsapp.com/1310471976070758](https://faq.whatsapp.com/1310471976070758/) |
| Baileys | [github.com/WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys) |
| Documentación de Expo | [docs.expo.dev](https://docs.expo.dev/) |
| Panel de Heroku | [dashboard.heroku.com/apps](https://dashboard.heroku.com/apps) |
| Heroku CLI | [devcenter.heroku.com/articles/heroku-cli](https://devcenter.heroku.com/articles/heroku-cli) |
| Termux en F-Droid | [f-droid.org/packages/com.termux](https://f-droid.org/packages/com.termux/) |
| Termux en GitHub | [github.com/termux/termux-app](https://github.com/termux/termux-app) |

### Proyecto

| Recurso | Enlace |
|---|---|
| Repositorio privado | [github.com/guianpierrcastillolazo-rgb/infoplayerleft](https://github.com/guianpierrcastillolazo-rgb/infoplayerleft) |
| Plantilla de variables de entorno | [.env.example](.env.example) |
| Guía de backends locales | [services/README.md](services/README.md) |

## Instalación local

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

Copia `.env.example` como `.env` y configura, como mínimo:

```env
STEAM_API_KEY=tu_steam_api_key
AI_PROVIDER=local
AI_MODEL=local-model
AI_LOCAL_URL=http://127.0.0.1:8080/v1/chat/completions
GROUPS_ENABLED=true
REPLY_IN_PRIVATE=true
PAIRING_CODE=false
```

Puedes seleccionar `ollama`, `llama_cpp` o `localai` para usar un backend local gratuito con API HTTP compatible con OpenAI. Para un proveedor remoto, por ejemplo:

La release estable verificada al actualizar este repositorio es **v0.34.2** ([release oficial](https://github.com/ollama/ollama/releases/tag/v0.34.2)). Para usar la versión actual de Ollama, instala desde su sitio oficial y descarga un modelo:

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gpt-oss:20b
ollama serve
```

También puedes usar el instalador del repositorio:

```bash
bash scripts/setup-ollama.sh
```

La API local de Ollama escucha en `http://127.0.0.1:11434`. Configura el bot así:

```env
AI_PROVIDER=ollama
AI_MODEL=gpt-oss:20b
OLLAMA_URL=http://127.0.0.1:11434/v1/chat/completions
OLLAMA_API_KEY=ollama
AI_LOCAL_TIMEOUT_MS=120000
```

La clave local `ollama` es un valor ignorado por el servidor local y solo se envía para compatibilidad con la API OpenAI. Para modelos cloud de Ollama usa la autenticación indicada en la [documentación oficial](https://docs.ollama.com/api/authentication).

```env
AI_PROVIDER=groq
AI_MODEL=openai/gpt-oss-20b
GROQ_API_KEY=tu_clave
```

Las claves disponibles son `GROQ_API_KEY`, `GEMINI_API_KEY`, `MISTRAL_API_KEY` y `OPENROUTER_API_KEY`. También se acepta `AI_API_KEY` como clave genérica. Los backends locales no requieren una clave para uso en `127.0.0.1`.

Para llama.cpp:

```env
AI_PROVIDER=llama_cpp
AI_MODEL=nombre-del-modelo-gguf
LLAMA_CPP_URL=http://127.0.0.1:8080/v1/chat/completions
LLAMA_CPP_API_KEY=
```

Para LocalAI con Docker:

```bash
docker run -p 8081:8080 --name local-ai -ti localai/localai:latest
```

```env
AI_PROVIDER=localai
AI_MODEL=nombre-del-modelo
LOCALAI_URL=http://127.0.0.1:8081/v1/chat/completions
LOCALAI_API_KEY=
```

## Vincular WhatsApp

### Código QR

Deja vacías `WHATSAPP_NUMBER` y usa `PAIRING_CODE=false`:

```env
WHATSAPP_NUMBER=
PAIRING_CODE=false
```

Ejecuta `npm start` y escanea el QR desde **WhatsApp → Dispositivos vinculados**.

### Código de vinculación

Configura el número internacional solo con dígitos:

```env
WHATSAPP_NUMBER=51987654321
PAIRING_CODE=true
```

Ejecuta `npm start`, copia el código mostrado y escríbelo en **WhatsApp → Dispositivos vinculados → Vincular con número de teléfono**. Después cambia `PAIRING_CODE=false`.

## Servidores A2S

Las consultas A2S requieren una dirección con formato `IP_o_dominio:puerto`:

```text
IP_o_dominio:27015
```

El puerto debe estar entre `1` y `65535`. Las direcciones locales y privadas están permitidas por defecto. Para bloquearlas:

```env
ALLOW_PRIVATE_SERVERS=false
```

El bot guarda las direcciones públicas oficiales de L4D2 en formato `IP:puerto`. En Termux, la ubicación predeterminada es `~/storage/downloads/l4d2-official-addresses.txt`.

## Vigilancia

La vigilancia acepta un nickname, SteamID64, vanity o URL de perfil. Permite consultar una vigilancia en el momento y envía avisos automáticos. El intervalo nunca es inferior a 50 segundos; puedes aumentarlo con `WATCH_INTERVAL_SECONDS`.

Los datos se guardan en `watchlist.json`. Este archivo no debe publicarse ni compartirse.

## Control API y app móvil

El Control API permite consultar el estado del bot, probar la IA y guardar ajustes desde `control-app`. Para activarlo localmente:

```env
CONTROL_API_TOKEN=genera-un-token-largo
CONTROL_API_HOST=0.0.0.0
CONTROL_API_PORT=8787
```

La app móvil se conecta a la URL del equipo donde corre el bot, por ejemplo `http://192.168.1.25:8787`, y utiliza el mismo token. No añadas `/api/control` a la URL: la app agrega las rutas automáticamente.

La app está dentro de `control-app` y está escrita completamente en JavaScript:

```bash
cd control-app
pnpm install
pnpm run check
pnpm run build
pnpm test
```

## Heroku

El repositorio incluye `Procfile` y `app.json`. El proceso correcto es `worker`, no `web`:

```text
worker: npm start
```

### Desde Heroku CLI

```bash
heroku login
heroku create nombre-de-tu-app
heroku config:set STEAM_API_KEY=TU_CLAVE --app nombre-de-tu-app
heroku config:set AI_PROVIDER=groq GROQ_API_KEY=TU_CLAVE --app nombre-de-tu-app
git push heroku main
heroku ps:scale worker=1 --app nombre-de-tu-app
heroku logs --tail --app nombre-de-tu-app
```

También puedes conectar el repositorio desde el panel de Heroku y activar un proceso `worker` en **Resources**.

Para la primera vinculación, configura temporalmente `WHATSAPP_NUMBER` y `PAIRING_CODE=true`. El código aparecerá en los logs. Después de vincular, cambia `PAIRING_CODE=false`.

**Importante:** Heroku utiliza almacenamiento efímero. `auth_info/`, `watchlist.json` y `ai-memory.json` pueden desaparecer al reiniciar o redeployar el dyno. Es posible que debas volver a vincular WhatsApp. No actives `CONTROL_API_TOKEN` públicamente en Heroku sin una protección adicional.

## Backends locales de IA

El bot admite backends locales gratuitos mediante APIs HTTP: Ollama, llama.cpp server y LocalAI. El software del runtime puede ser gratuito, pero los modelos tienen licencias propias y el equipo sigue consumiendo CPU, RAM, disco y energía. Mantén los servidores enlazados a `127.0.0.1` si no necesitas acceso remoto y no incluyas claves en el repositorio.

## Termux

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

Para mantenerlo activo, puedes usar `tmux`:

```bash
pkg install tmux
tmux new -s infoplayerleft
npm start
```

## Sesión y reinicio

La sesión se guarda en `auth_info/`. Para volver a vincular:

```bash
npm run reset
```

Para borrar la sesión y arrancar de nuevo:

```bash
npm run relink
```

## Pruebas

Bot principal:

```bash
npm ci
npm test
```

La suite principal contiene 28 pruebas. La app móvil se valida desde `control-app` con `pnpm run check`, `pnpm run build` y `pnpm test`.

## Seguridad

- No compartas códigos de vinculación, sesiones, `.env`, `.steam_key`, claves API ni `auth_info/`.
- No publiques `watchlist.json` ni `ai-memory.json`.
- El Control API está pensado para una red local de confianza.
- Usa `ALLOW_PRIVATE_SERVERS=false` si quieres bloquear consultas a direcciones locales o privadas.
- Revisa los límites del proveedor antes de usar una API remota.
- Baileys no es una librería oficial de WhatsApp.

## Referencias

- [Desplegar InfoPlayer Left en Heroku](https://heroku.com/deploy?template=https://github.com/guianpierrcastillolazo-rgb/infoplayerleft)
