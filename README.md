# InfoPlayer Left

Bot de WhatsApp para consultar perfiles de Steam, buscar jugadores y consultar servidores públicos de **Left 4 Dead 2** mediante Steam Web API y consultas A2S.

Funciona en Linux, macOS, Windows y Termux con Node.js 20 o superior. El proyecto se ejecuta localmente; no incluye hosting, panel web ni despliegue remoto.

## Características

- Consulta de perfiles mediante Steam Web API.
- Consulta de información y jugadores de servidores L4D2.
- Búsqueda de jugadores en servidores públicos.
- Vigilancia de jugadores y avisos cuando cambian de servidor.
- Integración opcional con DuckDuckGo y varios proveedores de IA.
- Soporte para código QR o código de vinculación de WhatsApp.
- Compatible con grupos y conversaciones privadas según la configuración elegida.

## Requisitos

- Node.js 20 o superior.
- Git.
- Un teléfono con WhatsApp para vincular la sesión.
- Conexión a Internet.
- Una Steam Web API Key para las funciones de Steam.
- Una clave del proveedor de IA elegido para usar `!ai`.

## Instalación rápida

```bash
git clone https://github.com/guianpierrcastillolazo-rgb/infoplayerleft.git
cd infoplayerleft
npm ci
cp .env.example .env
nano .env
npm start
```

En Windows PowerShell, sustituye la copia del archivo de entorno por:

```powershell
Copy-Item .env.example .env
npm ci
npm start
```

### Termux

Instala Termux desde [F-Droid][1] y ejecuta:

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

Para mantener el proceso activo dentro de Termux:

```bash
pkg install tmux
tmux new -s infoplayerleft
npm start
```

Pulsa `Ctrl+B` y después `D` para salir de la sesión sin detener el bot. Para volver a abrirla:

```bash
tmux attach -t infoplayerleft
```

## Configuración

Copia `.env.example` como `.env` y completa las variables necesarias. Nunca compartas ese archivo.

### Configuración mínima

```env
STEAM_API_KEY=tu_steam_api_key
AI_PROVIDER=groq
AI_MODEL=openai/gpt-oss-20b
GROQ_API_KEY=tu_clave_de_groq
SEARCH_PROVIDERS=duckduckgo
WHATSAPP_NUMBER=
PAIRING_CODE=false
```

El bot también acepta una clave genérica mediante `AI_API_KEY`. Si usas varias claves, es preferible configurar la variable específica de cada proveedor, como `GROQ_API_KEY` o `OPENAI_API_KEY`.

### Opciones frecuentes

| Variable | Descripción | Valor habitual |
|---|---|---|
| `STEAM_API_KEY` | Clave para perfiles y funciones de Steam. | Vacío hasta configurarla |
| `AI_PROVIDER` | Proveedor usado por `!ai`. | `groq` |
| `AI_MODEL` | Modelo usado por el proveedor. | `openai/gpt-oss-20b` |
| `SEARCH_PROVIDERS` | Proveedor de búsqueda web. | `duckduckgo` |
| `WHATSAPP_NUMBER` | Número para vinculación directa, solo dígitos y código de país. | Vacío para usar QR |
| `PAIRING_CODE` | Activa el código de vinculación cuando corresponde. | `false` |
| `GROUPS_ENABLED` | Permite responder en grupos. | `true` |
| `ALLOWED_GROUPS` | IDs de grupos permitidos, separados por comas. | Vacío para permitir todos |
| `REPLY_IN_PRIVATE` | Permite respuestas en chats privados. | `true` |
| `AUTH_DIR` | Carpeta de la sesión de WhatsApp. | `auth_info` |
| `ALLOW_PRIVATE_SERVERS` | Permite consultar servidores locales, privados y públicos. Usa `false` para bloquear los locales. | `true` |
| `WATCH_INTERVAL_SECONDS` | Intervalo del escaneo de vigilancia; nunca es inferior a 50 segundos. | `50` |
| `WATCH_MAX_SERVERS` | Número máximo de servidores revisados. | `200` |
| `WATCH_STATE_FILE` | Archivo donde se guarda la lista de vigilancia. | `watchlist.json` |
| `OFFICIAL_ADDRESSES_FILE` | Ruta opcional del archivo de direcciones oficiales completas. | Descargas de Termux |

## APIs y enlaces directos

### Steam y búsqueda web

- [Crear Steam Web API Key][2] — variable `STEAM_API_KEY`.
- DuckDuckGo funciona sin clave mediante `SEARCH_PROVIDERS=duckduckgo`.

### Proveedores de IA

Elige un proveedor, crea la clave desde su enlace oficial y configura la variable correspondiente. También puedes cambiar el proveedor desde WhatsApp con `!proveedor <nombre>`.

| Proveedor | Enlace oficial | Configuración predeterminada | Variable |
|---|---|---|---|
| Groq | [Crear API key][3] | `groq` / `openai/gpt-oss-20b` | `GROQ_API_KEY` |
| Google Gemini | [Crear API key][4] | `gemini` / `gemini-2.5-flash` | `GEMINI_API_KEY` |
| OpenAI | [Crear API key][5] | `openai` / `gpt-4o-mini` | `OPENAI_API_KEY` |
| xAI | [Crear API key][6] | `xai` / `grok-4.6` | `XAI_API_KEY` |
| DeepSeek | [Crear API key][7] | `deepseek` / `deepseek-chat` | `DEEPSEEK_API_KEY` |
| Mistral | [Crear API key][8] | `mistral` / `mistral-small-4-0-26-03` | `MISTRAL_API_KEY` |
| OpenRouter | [Crear API key][9] | `openrouter` / `openrouter/auto` | `OPENROUTER_API_KEY` |

Las cuotas, precios y límites dependen de cada proveedor. Comprueba sus condiciones antes de usar una clave de pago.

### Proxy opcional de OpenRouter

El repositorio incluye `api/chat.js`, una función compatible con el proxy público de [proxy-openrouter](https://github.com/dexter-666/proxy-openrouter). Recibe peticiones `POST` y reenvía el cuerpo a OpenRouter usando `OPENROUTER_API_KEY`, sin enviar la clave al cliente. También admite estas variables opcionales:

```env
OPENROUTER_SITE_URL=https://tu-dominio.example
OPENROUTER_APP_NAME=InfoPlayer Left
```

Este archivo no modifica el arranque de WhatsApp. Si lo despliegas como función serverless, configura `OPENROUTER_API_KEY` como secreto del proveedor y limita el acceso del endpoint para evitar que terceros consuman tu saldo. No se añadió el `vercel.json` original porque sus rutas globales reemplazarían el funcionamiento normal de este bot.

## Vincular WhatsApp

### Código QR

Deja vacías estas variables:

```env
WHATSAPP_NUMBER=
PAIRING_CODE=false
```

Ejecuta `npm start` y escanea el código QR desde **WhatsApp → Dispositivos vinculados**.

### Código de vinculación

Configura el número con código de país, solo dígitos:

```env
WHATSAPP_NUMBER=51987654321
PAIRING_CODE=false
```

Ejecuta `npm start` y sigue las instrucciones mostradas en la terminal. El código lo entrega WhatsApp; el bot no genera códigos ficticios.

## Comandos

| Comando | Función |
|---|---|
| `!ping` | Comprueba que el bot responde. |
| `!ayuda` | Muestra la ayuda disponible. |
| `!info <SteamID, vanity o URL>` | Consulta un perfil de Steam. |
| `!buscar <nickname>` | Busca un jugador en servidores públicos de L4D2. |
| `!servidor <IP:puerto>` | Consulta un servidor. |
| `!jugadores <IP:puerto>` | Consulta los jugadores conectados. |
| `!vigilar <nick, SteamID o URL>` | Crea una vigilancia en el chat actual. |
| `!novigilar <nick, SteamID o URL>` | Cancela una vigilancia. |
| `!lista` | Muestra las vigilancias del chat. |
| `!escaneo` | Muestra las vigilancias numeradas para elegir una y recibir información inmediata. |
| `!ai <pregunta>` | Busca contexto web y responde con IA. |
| `!tono <estilo>` | Cambia el tono de la IA. |
| `!idioma <código o país>` | Cambia el idioma de la IA. |
| `!proveedor <nombre>` | Cambia el proveedor y el modelo de IA. |
| `!anime` | Envía una imagen SFW de anime; no requiere API key. |

Los estilos disponibles incluyen `tranquilo`, `agresivo`, `insultos`, `formal`, `divertido`, `sarcastico`, `breve` y `amable`. Usa `!tono lista`, `!idioma lista` o `!proveedor lista` para ver las opciones disponibles.

### Imágenes SFW de anime

El comando `!anime` envía una imagen de anime apta para todo público usando [Nekos.best](https://nekos.best/). La fuente indica que sus imágenes son SFW y no requiere autenticación ni API key. Si la API no responde, el bot muestra un error y no envía contenido alternativo.

## Consultas A2S

Los comandos `!servidor` y `!jugadores` requieren siempre una dirección con este formato:

```text
IP_o_dominio:puerto
```

Ejemplo:

```text
!servidor 1.2.3.4:27015
!jugadores 1.2.3.4:27015
```

El puerto debe ser un número entero entre `1` y `65535`. Si falta o no es válido, la consulta se rechaza antes de abrir el socket UDP para evitar `ERR_SOCKET_BAD_PORT`.

El bot puede consultar servidores oficiales, públicos, locales y privados. Esto permite usar direcciones como `localhost:27015`, `127.0.0.1:27015` o `192.168.1.20:27015`, además de IP públicas y dominios oficiales.

```env
ALLOW_PRIVATE_SERVERS=true
```

Si quieres bloquear las consultas locales o privadas, configura:

```env
ALLOW_PRIVATE_SERVERS=false
```

### Guardado automático de direcciones oficiales

El bot consulta el Master Server de Steam automáticamente al iniciar, al ejecutar `!info`, al ejecutar `!vigilar` y después de cada ciclo de vigilancia. Guarda únicamente las direcciones públicas oficiales de L4D2 en formato `IP:puerto`, una por línea. No incluye `0.0.0.0:0000`, que es el marcador de fin de la respuesta, ni dominios, `localhost` o direcciones privadas.

En Termux, el archivo se guarda por defecto en:

```text
~/storage/downloads/l4d2-official-addresses.txt
```

Antes de utilizar el comando en Termux, concede acceso al almacenamiento una sola vez:

```bash
termux-setup-storage
```

No necesitas enviar ningún comando de WhatsApp. Puedes cambiar la ubicación mediante `OFFICIAL_ADDRESSES_FILE`. Por ejemplo:

```env
OFFICIAL_ADDRESSES_FILE=/sdcard/Download/l4d2-official-addresses.txt
```

## Vigilancia de jugadores

`!vigilar` acepta un nickname, SteamID64, vanity o URL de perfil. Al enviar `!escaneo`, el bot muestra las vigilancias de ese chat con números. Responde después con un número, por ejemplo `1`, para recibir información inmediata del objetivo elegido. La selección usa exactamente los datos registrados por `!vigilar`. El escaneo manual envía la información aunque ya se haya enviado antes y no cambia el comportamiento de los avisos automáticos. El bot consulta la Steam Web API y usa la dirección de servidor que devuelve Steam; si no está disponible, busca el jugador en el Master Server de Steam y consulta A2S como respaldo. El estado se guarda en `watchlist.json`, que no debe publicarse.

La vigilancia automática se ejecuta cada 50 segundos como mínimo. Puedes aumentar el intervalo con `WATCH_INTERVAL_SECONDS`, pero no reducirlo por debajo de 50 segundos.

### Escaneo manual inmediato

`!escaneo` no activa una vigilancia nueva ni espera al siguiente ciclo automático. Primero muestra una lista numerada basada en `!vigilar`; después debes responder con el número correspondiente. Ejecuta una consulta en ese momento y envía la información actual del jugador y del servidor, incluso si ya se había enviado un aviso anteriormente.

Para iniciar la selección:

```text
!escaneo
```

El bot responderá, por ejemplo:

```text
1. NombreDelJugador
2. 76561198000000000
```

Responde con el número elegido:

```text
1
```

También puedes escribir directamente `!escaneo 1`; el bot usará la primera vigilancia actual del chat aunque no hayas enviado antes `!escaneo`.

El número debe corresponder a una vigilancia creada previamente con `!vigilar`. Si no hay vigilancias en el chat, el bot lo informa sin crear una nueva.

La vigilancia puede consumir batería, datos y CPU, especialmente con muchos servidores y un intervalo corto. En Termux, aumenta `WATCH_INTERVAL_SECONDS` si el teléfono se calienta o consume demasiados datos.

## Sesión y reinicio

La sesión de WhatsApp se guarda en `auth_info/`. Para eliminarla y volver a vincular el bot:

```bash
npm run reset
```

Para eliminar la sesión y arrancar inmediatamente:

```bash
npm run relink
```

## Pruebas y scripts

Ejecuta la suite con:

```bash
npm ci
npm test
```

Scripts disponibles:

```text
npm start              Inicia el bot.
npm run start:termux   Inicia el bot con el bloqueo de suspensión de Termux.
npm test               Ejecuta las pruebas.
npm run reset          Elimina la sesión local.
npm run relink         Elimina la sesión y vuelve a iniciar.
```

## Seguridad

- No compartas códigos de vinculación ni sesiones de WhatsApp.
- No publiques `.env`, `.steam_key`, claves de API, `auth_info/` ni `watchlist.json`.
- Mantén `ALLOW_PRIVATE_SERVERS=true` si necesitas consultar servidores locales o privados; usa `false` para bloquearlos.
- Revisa los permisos y límites del proveedor antes de usar una API de pago.
- Baileys no es una librería oficial de WhatsApp.

## Licencia

Consulta el historial del repositorio para conocer los cambios y las condiciones de uso definidas por el propietario.

## Referencias

[1]: https://f-droid.org/packages/com.termux/ "Termux en F-Droid"
[2]: https://steamcommunity.com/dev/apikey "Steam Web API Key"
[3]: https://console.groq.com/keys "Groq API Keys"
[4]: https://aistudio.google.com/apikey "Google AI Studio API Keys"
[5]: https://platform.openai.com/api-keys "OpenAI API Keys"
[6]: https://console.x.ai/team/default/api-keys "xAI API Keys"
[7]: https://platform.deepseek.com/api_keys "DeepSeek API Keys"
[8]: https://console.mistral.ai/api-keys/ "Mistral API Keys"
[9]: https://openrouter.ai/keys "OpenRouter API Keys"
