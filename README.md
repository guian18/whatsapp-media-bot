# InfoPlayer Left

Bot de WhatsApp para consultar jugadores y servidores de **Left 4 Dead 2**.

Funciona localmente en **Linux, macOS, Windows y Termux** con Node.js 20+. No incluye hosting, servidor web, panel web ni despliegue remoto.

## Requisitos

- Node.js 20 o superior.
- WhatsApp en un teléfono para vincular el bot.
- Conexión a Internet.
- Steam Web API Key para los comandos de Steam.
- OpenAI API Key opcional para `!ai`.

## Instalación en PC

```bash
git clone https://github.com/guianpierrcastillolazo-rgb/infoplayerleft.git
cd infoplayerleft
npm install
cp .env.example .env
npm start
```

En Windows, copia `.env.example` como `.env` manualmente si no tienes `cp`:

```powershell
Copy-Item .env.example .env
npm install
npm start
```

## Instalación en Termux

Instala [Termux desde F-Droid](https://f-droid.org/packages/com.termux/), abre Termux y ejecuta:

```bash
pkg update && pkg upgrade
pkg install nodejs-lts git
git clone https://github.com/guianpierrcastillolazo-rgb/infoplayerleft.git
cd infoplayerleft
npm install
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

Pulsa `Ctrl+B`, después `D` para salir sin cerrar el bot. Para volver:

```bash
tmux attach -t infoplayerleft
```

## Configuración `.env`

Configuración mínima:

```env
STEAM_API_KEY=tu_steam_api_key
AI_API_KEY=tu_clave_groq_o_gemini
AI_PROVIDER=groq
AI_MODEL=openai/gpt-oss-20b
AI_API_URL=
AI_DEFAULT_STYLE=insultos
SEARCH_PROVIDERS=duckduckgo
PING_DEAD_CHANCE=0.10
PING_TRIP_CHANCE=0.30
WHATSAPP_NUMBER=
PAIRING_CODE=false
GROUPS_ENABLED=true
REPLY_IN_PRIVATE=true
ALLOW_SELF=true
ALLOWED_GROUPS=
AUTH_DIR=auth_info
AUTO_RESET=false
```

Para ver todas las opciones comentadas en Termux, vuelve a copiar la plantilla solo si todavía no tienes datos propios:

```bash
cp .env.example .env
nano .env
```

Si ya tienes un `.env` con claves, no lo sobrescribas: abre `nano .env` y copia únicamente las líneas de proveedor que necesites desde `.env.example`.

El bot responde en grupos privados cuando `GROUPS_ENABLED=true`. Deja `ALLOWED_GROUPS=` vacío para permitir todos los grupos; si escribes IDs separados por comas, responderá únicamente en esos grupos.

## APIs y opciones de configuración

### Opciones sin pagar

No necesitas crear ninguna API de búsqueda. Deja esta configuración:

```env
SEARCH_PROVIDERS=duckduckgo
```

DuckDuckGo se consulta sin clave ni suscripción. Puede tener límites o cambiar su HTML, pero es la opción integrada sin coste. La [Steam Web API Key](https://steamcommunity.com/dev/apikey) también se obtiene gratuitamente para consultar perfiles públicos.

Para `!ai` sin pagar, usa uno de estos niveles gratuitos oficiales:

| Proveedor | Enlace para crear la clave | Configuración |
|---|---|---|
| Groq Free tier | [Crear Groq API Key](https://console.groq.com/keys) | `AI_PROVIDER=groq` y `AI_MODEL=openai/gpt-oss-20b` |
| Google Gemini Free tier | [Crear Gemini API Key](https://aistudio.google.com/apikey) | `AI_PROVIDER=gemini` y `AI_MODEL=gemini-2.5-flash` |

Google y Groq publican cuotas gratuitas, no ilimitadas. Sus límites pueden cambiar por modelo, cuenta y día. No se necesita añadir Google Custom Search ni Brave: las búsquedas del bot siguen usando DuckDuckGo sin API.

### Enlaces gratuitos

| Servicio | Enlace directo | Variable `.env` |
|---|---|---|
| Steam | [Crear Steam Web API Key](https://steamcommunity.com/dev/apikey) | `STEAM_API_KEY` |
| Groq | [Crear Groq API Key](https://console.groq.com/keys) | `AI_API_KEY` |
| Gemini | [Crear Gemini API Key](https://aistudio.google.com/apikey) | `AI_API_KEY` |

Documentación oficial: [Steam Web API](https://steamcommunity.com/dev), [DuckDuckGo](https://duckduckgo.com/), [Groq Quickstart](https://console.groq.com/docs/quickstart), [Groq límites](https://console.groq.com/docs/rate-limits), [Gemini OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai), [Gemini precios](https://ai.google.dev/gemini-api/docs/pricing) y [Gemini límites](https://ai.google.dev/gemini-api/docs/rate-limits).

Nunca publiques `.env`, `.steam_key` ni `auth_info/`.

## Vincular WhatsApp

### Código de vinculación

1. Configura el número con código de país, solo dígitos:

   ```env
   WHATSAPP_NUMBER=51987654321
   PAIRING_CODE=false
   ```

2. Ejecuta `npm start`.
3. En WhatsApp abre **Dispositivos vinculados → Vincular un dispositivo → Vincular con el número de teléfono**.
4. Introduce el código real mostrado en la terminal.

El código lo entrega WhatsApp. El bot no genera códigos falsos.

### Código QR

Deja estas variables vacías o en `false`:

```env
WHATSAPP_NUMBER=
PAIRING_CODE=false
```

Ejecuta:

```bash
npm start
```

Escanea el QR mostrado en la terminal desde **WhatsApp → Dispositivos vinculados**.

## Comandos de WhatsApp

| Comando | Función |
|---|---|
| `!ping` | Comprueba que el bot responde. |
| `!ayuda` | Muestra los comandos. |
| `!info <SteamID, vanity o URL>` | Consulta un perfil de Steam. |
| `!buscar <nickname>` | Busca un jugador en servidores públicos de L4D2. |
| `!servidor <IP:puerto>` | Consulta un servidor. |
| `!jugadores <IP:puerto>` | Consulta los jugadores de un servidor. |
| `!ai`, `!AI`, `!ia`, `!IA` `<pregunta>` | Busca información en Internet y responde con IA. |

`!ping` tiene tres resultados: 10% responde `Pong fallido: el bot falleció 💀`, 30% responde `El bot se tropezó y falló el Pong 🤕` y el 60% restante responde `Pong! 🏓`. Las probabilidades se pueden cambiar con `PING_DEAD_CHANCE` y `PING_TRIP_CHANCE`.

## Comando `!ai`

Ejemplo:

```text
!ai ¿Cuál es la versión más reciente de Left 4 Dead 2?
```

El tono se configura en `.env`:

```env
AI_DEFAULT_STYLE=insultos
```

Tonos disponibles:

- `tranquilo`
- `agresivo`
- `insultos`
- `formal`
- `divertido`
- `sarcastico`
- `breve`
- `amable`

El tono `insultos` permite lenguaje vulgar e insultos genéricos dirigidos a errores, ideas o situaciones. No genera amenazas, discriminación, slurs ni acoso dirigido.

La IA detecta el tono de cada pregunta y procura responder en el mismo estilo: formal, amable, divertido, sarcástico, agresivo, vulgar o breve. Si el mensaje no da una señal clara, utiliza `AI_DEFAULT_STYLE=insultos` como respaldo. También reconoce frases como “usa el tono de insulto”.

Puede usar humor adulto, doble sentido y palabrotas entre amigos adultos cuando el contexto sea consensuado y amistoso. No permite sexualizar menores, coerción, amenazas, slurs, discriminación ni acoso dirigido.

`ALLOW_SELF` está activado permanentemente para que puedas probar el bot desde la misma cuenta vinculada. Si no quieres usar una API de IA, deja `AI_API_KEY` vacío; las búsquedas y los demás comandos seguirán funcionando.

### Búsqueda web

`!ai` consulta DuckDuckGo sin una API de búsqueda de pago. Para generar la respuesta, configura Groq o Gemini con su nivel gratuito. Si dejas `AI_API_KEY` vacía, `!ai` mostrará que la IA no está configurada.

Tor no es un buscador ni un navegador que el bot pueda invocar por nombre: es una red/proxy. El bot no incluye un proxy Tor automático. Si necesitas Tor, debes ejecutar un servicio Tor local y configurar una integración de proxy compatible; las búsquedas normales no lo requieren.

## Sesión y reinicio

La sesión se guarda en `auth_info/`. Para volver a vincular desde cero:

```bash
npm run reset
```

Para borrar la sesión y arrancar de nuevo:

```bash
npm run relink
```

## Pruebas

```bash
npm ci
npm test
```

La suite actual debe terminar con **3 tests passed**.

## Scripts

```text
npm start              Inicia el bot.
npm run start:termux   Inicia el bot en Termux.
npm test               Ejecuta las pruebas.
npm run reset          Borra la sesión local.
npm run relink         Borra la sesión y vuelve a iniciar.
```

## Seguridad

- No compartas códigos de vinculación.
- No publiques tus API Keys.
- No subas `.env`, `.steam_key` ni `auth_info/`.
- Usa `REPLY_IN_PRIVATE=false` solo si no quieres responder en chats privados.
- Baileys no es una librería oficial de WhatsApp.

## Licencia

Repositorio privado del propietario. Consulta el historial de Git para ver los cambios.
