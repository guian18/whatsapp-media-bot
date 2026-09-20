# InfoPlayer Left

Bot de WhatsApp para consultar jugadores y servidores de **Left 4 Dead 2**.

Funciona localmente en **Linux, macOS, Windows y Termux** con Node.js 20+. No incluye hosting, servidor web, panel web ni despliegue remoto.

## Requisitos

- Node.js 20 o superior.
- WhatsApp en un teléfono para vincular el bot.
- Conexión a Internet.
- Steam Web API Key para los comandos de Steam.
- API Key opcional del proveedor de IA elegido para `!ai`.

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
AI_LANGUAGE=es-ES
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
WATCH_INTERVAL_SECONDS=1
WATCH_MAX_SERVERS=200
WATCH_STATE_FILE=watchlist.json
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

### APIs y enlaces directos

- **Steam:** [crear Steam Web API Key](https://steamcommunity.com/dev/apikey) — `STEAM_API_KEY`
- **Groq:** [crear Groq API Key](https://console.groq.com/keys) — `AI_PROVIDER=groq`, `AI_MODEL=openai/gpt-oss-20b`, `GROQ_API_KEY`
- **Gemini:** [crear Gemini API Key](https://aistudio.google.com/apikey) — `AI_PROVIDER=gemini`, `AI_MODEL=gemini-2.5-flash`, `GEMINI_API_KEY`
- **ChatGPT/OpenAI:** [crear OpenAI API Key](https://platform.openai.com/api-keys) — `AI_PROVIDER=openai`, `AI_MODEL=gpt-4o-mini`, `OPENAI_API_KEY`
- **Grok/xAI:** [crear xAI API Key](https://console.x.ai/team/default/api-keys) — `AI_PROVIDER=xai`, `AI_MODEL=grok-4.6`, `XAI_API_KEY`
- **DeepSeek:** [crear DeepSeek API Key](https://platform.deepseek.com/api_keys) — `AI_PROVIDER=deepseek`, `AI_MODEL=deepseek-chat`, `DEEPSEEK_API_KEY`
- **Mistral:** [crear Mistral API Key](https://console.mistral.ai/api-keys/) — `AI_PROVIDER=mistral`, `AI_MODEL=mistral-small-4-0-26-03`, `MISTRAL_API_KEY`
- **OpenRouter:** [crear OpenRouter API Key](https://openrouter.ai/keys) — `AI_PROVIDER=openrouter`, `AI_MODEL=openrouter/auto`, `OPENROUTER_API_KEY`
- **Búsqueda web:** DuckDuckGo funciona sin API key mediante `SEARCH_PROVIDERS=duckduckgo`.

Groq y Gemini pueden ofrecer cuotas gratuitas, pero no son ilimitadas. Los demás proveedores tienen sus propios precios, créditos o límites.

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
| `!tono <estilo>` | Cambia y guarda el tono de la IA. |
| `!idioma <código>` | Cambia y guarda el idioma de la IA. |
| `!proveedor <nombre>` | Cambia y guarda el proveedor y el modelo de IA. |
| `!vigilar <nick|SteamID|URL>` | Avisa en este chat cuando el jugador se conecte a un servidor público de L4D2. |
| `!novigilar <nick|SteamID|URL>` | Cancela una vigilancia. |
| `!lista` | Muestra las vigilancias de este chat. |
| `!escaneo` | Fuerza un escaneo inmediato. |
| `!info <SteamID, vanity o URL>` | Consulta un perfil de Steam. |
| `!buscar <nickname>` | Busca un jugador en servidores públicos de L4D2. |
| `!servidor <IP:puerto>` | Consulta un servidor. |
| `!jugadores <IP:puerto>` | Consulta los jugadores de un servidor. |
| `!ai`, `!AI`, `!ia`, `!IA` `<pregunta>` | Busca información en Internet y responde con IA. |

`!ping` tiene tres resultados: 10% responde `Pong fallido: el bot falleció 💀`, 30% responde `El bot se tropezó y falló el Pong 🤕` y el 60% restante responde `Pong! 🏓`. Las probabilidades se pueden cambiar con `PING_DEAD_CHANCE` y `PING_TRIP_CHANCE`.

### Dirección de los servidores A2S

Los comandos `!servidor` y `!jugadores` requieren una dirección con el formato `IP_o_dominio:puerto`, por ejemplo:

```text
!servidor 1.2.3.4:27015
!jugadores 1.2.3.4:27015
```

El puerto es obligatorio y debe ser un número entre `1` y `65535`. Si falta el puerto o no es válido, el bot rechaza la consulta antes de abrir el socket UDP para evitar errores `ERR_SOCKET_BAD_PORT`. Por seguridad, las direcciones locales y privadas se bloquean por defecto; para habilitarlas explícitamente, configura `ALLOW_PRIVATE_SERVERS=true` en `.env`.

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

Para cambiarlo manualmente y guardarlo para los siguientes reinicios:

```text
!tono insultos
!tono tranquilo
!tono formal
!tono divertido
!tono sarcastico
!tono agresivo
!tono amable
!tono breve
```

Con `!tono lista` se muestran los estilos disponibles.

Para cambiar de proveedor sin editar `.env`:

```text
!proveedor lista
!proveedor groq
!proveedor gemini
!proveedor openai
!proveedor xai
!proveedor deepseek
!proveedor mistral
!proveedor openrouter
```

El comando cambia automáticamente el modelo y la URL predeterminados. Debes tener configurada la clave del proveedor seleccionado; el bot no comparte ni mueve las claves entre proveedores.

También puedes guardar varias claves a la vez usando `OPENAI_API_KEY`, `XAI_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `MISTRAL_API_KEY` y `OPENROUTER_API_KEY`. Al cambiar con `!proveedor`, el bot selecciona automáticamente la variable correspondiente.

## Notificaciones de jugadores conectados

El bot incorpora el notificador del ZIP proporcionado, adaptado de Discord a WhatsApp. Usa `!vigilar nick`, un SteamID64 o una URL de perfil de Steam. El bot escanea servidores públicos de Left 4 Dead 2 y envía un aviso al chat donde se creó la vigilancia cuando detecta una conexión nueva o un cambio de servidor. La lista y el último estado se guardan en `watchlist.json`, que está excluido de Git.

Ejemplo:

```text
!vigilar nombre_del_jugador
!lista
!escaneo
!novigilar nombre_del_jugador
```

El escaneo usa `STEAM_API_KEY` cuando está disponible y consulta el Master Server/A2S como respaldo. `WATCH_INTERVAL_SECONDS=1` revisa cada segundo como mínimo práctico; Steam no ofrece un evento público instantáneo, por lo que el aviso real depende del tiempo de respuesta del Master Server y de los servidores. El bot deduplica el mismo jugador y servidor, no repite avisos durante la misma conexión y permite avisar de nuevo después de detectar que el jugador salió. Escanear muchos servidores cada segundo puede consumir bastante batería, datos y CPU en Termux; reduce el valor si el teléfono se calienta.

Para cambiar manualmente el idioma:

```text
!idioma es-ES
!idioma es-MX
!idioma es-AR
!idioma en-US
!idioma en-GB
!idioma it-IT
!idioma pt-BR
!idioma pt-PT
!idioma fr-FR
!idioma de-DE
```

También puedes usar el nombre del país, por ejemplo `!idioma Italia`, `!idioma México`, `!idioma USA` o `!idioma Brasil`. Usa `!idioma lista` para mostrar los códigos disponibles. La selección se guarda en `.env` y se conserva al reiniciar.

La IA puede usar humor adulto, doble sentido y palabrotas entre amigos adultos cuando el contexto sea consensuado y amistoso. No permite sexualizar menores, coerción, amenazas, slurs, discriminación ni acoso dirigido.

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

La suite actual debe terminar con **7 tests passed**.

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
