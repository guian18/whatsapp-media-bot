# InfoPlayer Left

Bot de WhatsApp para consultar perfiles de Steam, buscar jugadores y consultar servidores de **Left 4 Dead 2** mediante Steam Web API y consultas A2S. También incluye IA opcional, vigilancia de jugadores, una app móvil de control y funciones de entretenimiento.

Funciona con Node.js 20 o superior en Linux, macOS, Windows, Termux y Heroku.

## Funciones

- Perfiles de Steam y búsqueda de jugadores en servidores públicos.
- Información A2S de servidores públicos, oficiales, locales y privados.
- Vigilancia de jugadores con avisos automáticos y consultas manuales.
- IA configurable con proveedor local, Groq, Gemini, Mistral u OpenRouter.
- Memoria privada por chat, tono e idioma configurables.
- Imágenes de anime SFW.
- Funciones de entretenimiento sin dependencias externas.
- App móvil Expo para controlar el bot mediante el Control API.
- Despliegue en Heroku como proceso `worker`.

## Requisitos

- Node.js 20 o superior.
- Git.
- Un teléfono con WhatsApp para vincular la sesión.
- Una Steam Web API Key para las funciones de Steam.
- Una clave del proveedor de IA elegido si se usará IA remota.

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

El proveedor `local` requiere un servidor compatible con OpenAI, como `llama.cpp`. Para un proveedor remoto, por ejemplo:

```env
AI_PROVIDER=groq
AI_MODEL=openai/gpt-oss-20b
GROQ_API_KEY=tu_clave
```

Las claves disponibles son `GROQ_API_KEY`, `GEMINI_API_KEY`, `MISTRAL_API_KEY` y `OPENROUTER_API_KEY`. También se acepta `AI_API_KEY` como clave genérica.

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

La suite principal contiene 26 pruebas. La app móvil se valida desde `control-app` con `pnpm run check`, `pnpm run build` y `pnpm test`.

## Seguridad

- No compartas códigos de vinculación, sesiones, `.env`, `.steam_key`, claves API ni `auth_info/`.
- No publiques `watchlist.json` ni `ai-memory.json`.
- El Control API está pensado para una red local de confianza.
- Usa `ALLOW_PRIVATE_SERVERS=false` si quieres bloquear consultas a direcciones locales o privadas.
- Revisa los límites del proveedor antes de usar una API remota.
- Baileys no es una librería oficial de WhatsApp.

## Referencias

[1]: https://steamcommunity.com/dev/apikey "Steam Web API Key"
[2]: https://github.com/ggml-org/llama.cpp "llama.cpp"
[3]: https://f-droid.org/packages/com.termux/ "Termux en F-Droid"
[4]: https://heroku.com/deploy?template=https://github.com/guianpierrcastillolazo-rgb/infoplayerleft "Desplegar InfoPlayer Left en Heroku"
