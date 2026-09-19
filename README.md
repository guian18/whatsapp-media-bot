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
AI_API_KEY=tu_openai_api_key
AI_MODEL=gpt-4o-mini
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_DEFAULT_STYLE=tranquilo
SEARCH_PROVIDERS=duckduckgo
WHATSAPP_NUMBER=
PAIRING_CODE=false
REPLY_IN_PRIVATE=true
ALLOW_SELF=false
ALLOWED_GROUPS=
AUTH_DIR=auth_info
AUTO_RESET=false
```

## APIs y opciones de configuración

### Opciones sin pagar

No necesitas crear ninguna API de búsqueda. Deja esta configuración:

```env
SEARCH_PROVIDERS=duckduckgo
```

DuckDuckGo se consulta sin clave ni suscripción. Puede tener límites o cambiar su HTML, pero es la opción integrada sin coste. La [Steam Web API Key](https://steamcommunity.com/dev/apikey) también se obtiene gratuitamente para consultar perfiles públicos.

### Enlaces gratuitos

| Servicio | Enlace directo | Variable `.env` |
|---|---|---|
| Steam | [Crear Steam Web API Key](https://steamcommunity.com/dev/apikey) | `STEAM_API_KEY` |

Documentación oficial: [Steam Web API](https://steamcommunity.com/dev) y [DuckDuckGo](https://duckduckgo.com/).

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
| `!ai <pregunta>` | Busca información en Internet y responde con IA. |

## Comando `!ai`

Ejemplo:

```text
!ai ¿Cuál es la versión más reciente de Left 4 Dead 2?
```

El tono se configura en `.env`:

```env
AI_DEFAULT_STYLE=tranquilo
```

Tonos disponibles:

- `tranquilo`
- `agresivo`
- `insultos`
- `formal`
- `divertido`
- `sarcastico`
- `breve`

El tono `insultos` permite lenguaje vulgar e insultos genéricos dirigidos a errores, ideas o situaciones. No genera amenazas, discriminación, slurs ni acoso dirigido.

Si no quieres usar una API de IA de pago, deja `AI_API_KEY` vacío. Las búsquedas y los demás comandos seguirán funcionando; `!ai` necesitará una API compatible configurada para generar la respuesta.

### Búsqueda web

`!ai` consulta DuckDuckGo sin una API de búsqueda de pago. La generación de la respuesta de IA sigue necesitando una `AI_API_KEY` compatible; si la dejas vacía, `!ai` mostrará que la IA no está configurada.

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
