# InfoPlayer Left

Bot de WhatsApp para consultar perfiles de Steam, buscar jugadores y consultar servidores públicos de **Left 4 Dead 2** mediante Steam Web API y consultas A2S.

Funciona en Linux, macOS, Windows y Termux con Node.js 20 o superior. El proyecto se ejecuta localmente; no incluye hosting, panel web ni despliegue remoto.

## Novedades incluidas

- Soporte para un proveedor local sin API key mediante `llama.cpp`, además de Groq, Gemini, Mistral y OpenRouter con sus modalidades gratuitas.
- Memoria conversacional privada por chat para `!ai`, configurable con `AI_MEMORY_FILE` y excluida de Git.
- Detección básica de frases asociadas a crisis emocionales, con una respuesta de apoyo que no requiere consultar una API.
- Comando `!anime` para enviar imágenes de anime **SFW** desde Nekos.best, sin API key y sin fuentes NSFW.
- Proxy opcional de OpenRouter en `api/chat.js`, separado del arranque normal de WhatsApp.
- `!escaneo` manual e inmediato basado en la lista creada con `!vigilar`, con selección numérica.
- Vigilancia automática con un intervalo mínimo de 50 segundos.
- Guardado automático de direcciones oficiales completas en formato `IP:puerto` para Termux.
- Consultas A2S con validación de host y puerto, compatibles con servidores públicos, oficiales, locales y privados.

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
- Una clave del proveedor de IA elegido para usar `!ai`, excepto cuando se utiliza el proveedor local.

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

### Actualización segura en Termux

Este procedimiento actualiza el código y las dependencias sin reemplazar `.env`, las API keys, `.steam_key`, `auth_info` ni los archivos de vigilancia. No borres el directorio del proyecto ni ejecutes `git clean -fd`.

```bash
cd ~/infoplayerleft
mkdir -p ~/.infoplayerleft-backups
cp -p .env ~/.infoplayerleft-backups/env-$(date +%Y%m%d-%H%M%S).bak 2>/dev/null || true
tar -czf ~/.infoplayerleft-backups/auth-$(date +%Y%m%d-%H%M%S).tar.gz auth_info 2>/dev/null || true
pkg update
pkg upgrade -y
pkg install nodejs-lts git -y
git pull --rebase origin main
npm ci
npm test
```

`npm ci` puede reconstruir `node_modules`, que es una carpeta de dependencias descartable; no modifica `.env` ni la sesión de WhatsApp. Las advertencias de npm sobre scripts bloqueados no son un error si las 19 pruebas pasan. No ejecutes `npm audit fix` como parte de esta actualización porque puede cambiar versiones y romper el bot.

### Configuración mínima

```env
STEAM_API_KEY=tu_steam_api_key
AI_PROVIDER=local
AI_MODEL=local-model
AI_LOCAL_URL=http://127.0.0.1:8080/v1/chat/completions
AI_LOCAL_TIMEOUT_MS=120000
CONTROL_API_TOKEN=cambia-este-token-largo
CONTROL_API_HOST=0.0.0.0
CONTROL_API_PORT=8787
SEARCH_PROVIDERS=duckduckgo
WHATSAPP_NUMBER=
PAIRING_CODE=false
```

El bot también acepta una clave genérica mediante `AI_API_KEY`. Si usas varias claves, es preferible configurar la variable específica del proveedor seleccionado, como `GROQ_API_KEY`, `GEMINI_API_KEY`, `MISTRAL_API_KEY` u `OPENROUTER_API_KEY`. El proveedor `local` no necesita clave y se conecta a `AI_LOCAL_URL`.

La lista principal de esta guía contiene solo proveedores con modalidad gratuita verificada. El código mantiene compatibilidad opcional con otros proveedores, pero no se incluyen aquí como alternativas sin coste.

### Opciones frecuentes

| Variable | Descripción | Valor habitual |
|---|---|---|
| `STEAM_API_KEY` | Clave para perfiles y funciones de Steam. | Vacío hasta configurarla |
| `AI_PROVIDER` | Proveedor usado por `!ai`. | `local` |
| `AI_MODEL` | Modelo usado por el proveedor. | `local-model` |
| `AI_LOCAL_URL` | Endpoint OpenAI-compatible del servidor local `llama.cpp`. | `http://127.0.0.1:8080/v1/chat/completions` |
| `AI_LOCAL_API_KEY` | Clave opcional si el servidor local está protegido. | Vacío |
| `AI_TIMEOUT_MS` | Tiempo máximo para una API de IA remota. | `15000` |
| `AI_LOCAL_TIMEOUT_MS` | Tiempo máximo para que responda `llama.cpp`; se recomienda más margen al ejecutarlo en un teléfono. | `120000` |
| `AI_SEARCH_TIMEOUT_MS` | Tiempo máximo de la búsqueda web opcional; si falla, la IA continúa sin fuentes. | `8000` |
| `AI_LOCAL_SKIP_SEARCH` | Evita la búsqueda web antes de consultar el modelo local, para reducir la latencia. Usa `false` si quieres buscar fuentes con `!ai`. | `true` |
| `AI_LOCAL_FAST` | Usa un prompt y una memoria más cortos para acelerar las respuestas locales. | `true` |
| `AI_MAX_TOKENS` | Límite de longitud de la respuesta; un valor menor responde más rápido en teléfonos. | `256` |
| `CONTROL_API_TOKEN` | Token obligatorio para que la app móvil controle el bot. No lo compartas. | Vacío: API desactivada |
| `CONTROL_API_HOST` | Interfaz donde escucha la API de control. | `127.0.0.1` |
| `CONTROL_API_PORT` | Puerto de la API de control. | `8787` |
| `AI_MEMORY_FILE` | Archivo privado con las últimas interacciones de `!ai` por chat. | `ai-memory.json` |
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

### Conectar la app móvil al bot

La aplicación móvil se conecta directamente al **Control API** del bot. La URL no es una URL de GitHub ni de Expo: es la dirección local del teléfono o equipo donde se está ejecutando Node.js, seguida del puerto configurado. Por ejemplo, si la IP local del teléfono es `192.168.1.25` y el puerto es `8787`, introduce en la app:

```text
http://192.168.1.25:8787
```

No añadas `/api/control` al final; la app agrega automáticamente las rutas como `/api/control/status` y `/api/control/test-ai`.

Para obtener la IP en Termux, con el teléfono conectado a la misma red Wi-Fi que el dispositivo desde el que usarás la app, ejecuta:

```bash
ip -4 addr show wlan0 | awk '/inet / {print $2}'
```

Usa la dirección antes de `/24`, por ejemplo `192.168.1.25`. Si `wlan0` no aparece, consulta todas las interfaces con `ip -4 addr` y utiliza la dirección privada de la interfaz Wi-Fi. La app y el bot deben estar en la misma red, y el router no debe aislar los dispositivos Wi-Fi.

El token se define en el archivo `.env` del bot mediante `CONTROL_API_TOKEN`. No se puede recuperar desde la app ni desde el API, porque nunca se devuelve en las respuestas. En Termux, genera el token con Node.js, que ya es necesario para ejecutar el bot:

```bash
cd ~/infoplayerleft
TOKEN=$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")
test -n "$TOKEN" || { echo 'No se pudo generar el token'; exit 1; }
if grep -q '^CONTROL_API_TOKEN=' .env; then
  sed -i "s|^CONTROL_API_TOKEN=.*|CONTROL_API_TOKEN=$TOKEN|" .env
else
  printf '\nCONTROL_API_TOKEN=%s\n' "$TOKEN" >> .env
fi
printf 'Guarda este token en un lugar seguro; no lo publiques:\n%s\n' "$TOKEN"
```

Este comando solo reemplaza o añade `CONTROL_API_TOKEN`; conserva las demás claves. Si ya tienes un token funcional, no lo regeneres: comprueba que no esté vacío con `grep -n '^CONTROL_API_TOKEN=' .env | sed 's/=.*/=<configurado>/'`. Después reinicia el bot para que lea el token:

```bash
npm start
```

En `.env`, la configuración para permitir conexiones desde otros dispositivos de la red local es:

```env
CONTROL_API_HOST=0.0.0.0
CONTROL_API_PORT=8787
```

En la app, abre la pantalla de control, introduce la URL base en **URL de la API del bot** y el mismo valor de `CONTROL_API_TOKEN` en **Token de control**. Pulsa **Guardar** y después **Comprobar conexión**. El token se guarda en el llavero seguro del teléfono.

Puedes verificar el API desde otro dispositivo de la misma red sin mostrar el token en la URL:

```bash
curl -H "Authorization: Bearer TU_TOKEN" \
  http://192.168.1.25:8787/api/control/health
```

La respuesta esperada es `{"ok":true,"service":"infoplayerleft-control"}`. Si aparece `401`, la URL funciona pero el token no coincide. Si aparece `Connection refused` o hay timeout, revisa que el bot esté iniciado, que `CONTROL_API_HOST` sea `0.0.0.0`, que el puerto sea el mismo y que ambos dispositivos estén en la misma red.

Por seguridad, este API está pensado para una red local de confianza. No expongas el puerto `8787` directamente a Internet ni publiques el token en GitHub, capturas de pantalla, mensajes o archivos `.env`. Para acceso fuera de casa, usa una VPN como Tailscale/WireGuard o un proxy HTTPS con autenticación adicional.

### Rutas del Control API

Todas las rutas requieren el encabezado `Authorization: Bearer TU_TOKEN`:

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/control/health` | Comprueba que el API responde. |
| `GET` | `/api/control/status` | Muestra estado del bot, WhatsApp y proveedor sin devolver claves. |
| `POST` | `/api/control/settings` | Guarda los ajustes permitidos desde la app. |
| `POST` | `/api/control/test-ai` | Ejecuta una prueba del proveedor de IA configurado. |

## APIs y enlaces directos

### Steam y búsqueda web

- [Crear Steam Web API Key][2] — variable `STEAM_API_KEY`.
- DuckDuckGo funciona sin clave mediante `SEARCH_PROVIDERS=duckduckgo`.

### Proveedores de IA gratuitos y local

Elige un proveedor gratuito, crea la clave desde su enlace oficial y configura la variable correspondiente. También puedes cambiar el proveedor desde WhatsApp con `!proveedor <nombre>`. Las cuotas y los modelos gratuitos pueden cambiar; revisa siempre la página oficial antes de usar el bot. Para evitar cuotas y API keys, usa `!proveedor local` después de iniciar un servidor `llama.cpp` en el teléfono o en el mismo equipo.

| Proveedor | Enlace oficial | Configuración predeterminada | Variable |
|---|---|---|---|
| Local `llama.cpp` | [Documentación Android/Termux](https://github.com/ggml-org/llama.cpp/blob/master/docs/android.md) · [modelos GGUF](https://huggingface.co/models?library=gguf) | `local` / `local-model` | `AI_LOCAL_URL` |
| Groq | [Crear API key](https://console.groq.com/keys) · [límites gratuitos](https://console.groq.com/docs/rate-limits) | `groq` / `openai/gpt-oss-20b` | `GROQ_API_KEY` |
| Google Gemini | [Crear API key](https://aistudio.google.com/apikey) · [cuotas Free](https://ai.google.dev/gemini-api/docs/rate-limits) | `gemini` / `gemini-2.5-flash` | `GEMINI_API_KEY` |
| Mistral | [Mistral Docs](https://docs.mistral.ai/) · [uso y límites](https://docs.mistral.ai/admin/billing-usage/usage-limits) | `mistral` / `mistral-small-4-0-26-03` | `MISTRAL_API_KEY` |
| OpenRouter | [Crear API key](https://openrouter.ai/keys) · [modelos gratuitos](https://openrouter.ai/docs/guides/overview/models) | `openrouter` / selecciona un modelo `:free` | `OPENROUTER_API_KEY` |

OpenRouter tiene modelos gratuitos concretos, no todo su catálogo es gratuito. En Mistral, activa el modo gratuito de Studio si está disponible para tu cuenta. Ninguna modalidad gratuita garantiza disponibilidad ilimitada.

#### Configurar IA local en Termux

La opción local ejecuta el modelo en tu propio dispositivo. No envía la conversación a Groq, Venice u otro proveedor y no consume una API key. Necesitas un modelo en formato GGUF; el tamaño debe ajustarse a la memoria disponible del teléfono.

Comprueba si tu versión de Termux incluye el paquete de `llama.cpp`:

```bash
pkg update
pkg search llama-cpp
```

Si aparece `llama-cpp`, instálalo con `pkg install llama-cpp`. Si no aparece, sigue la [guía oficial de compilación para Android](https://github.com/ggml-org/llama.cpp/blob/master/docs/android.md). Después inicia el servidor con un modelo GGUF descargado de una fuente confiable:

```bash
llama-server \
  -m ~/models/modelo.gguf \
  --host 127.0.0.1 \
  --port 8080 \
  -c 4096
```

En otra sesión de Termux, configura:

```env
AI_PROVIDER=local
AI_MODEL=local-model
AI_LOCAL_URL=http://127.0.0.1:8080/v1/chat/completions
AI_LOCAL_API_KEY=
AI_LOCAL_TIMEOUT_MS=120000
```

También puedes cambiarlo desde WhatsApp con `!proveedor local`. Si aparece un error de conexión, comprueba primero que `llama-server` siga ejecutándose en el puerto `8080`. El servidor local no garantiza ausencia total de restricciones: el comportamiento depende del modelo GGUF, su licencia y el prompt utilizado.


### Proxy opcional de OpenRouter

El repositorio incluye `api/chat.js`, una función compatible con el proxy público de [proxy-openrouter](https://github.com/dexter-666/proxy-openrouter). Recibe peticiones `POST` y reenvía el cuerpo a OpenRouter usando `OPENROUTER_API_KEY`, sin enviar la clave al cliente. También admite estas variables opcionales:

```env
OPENROUTER_SITE_URL=https://tu-dominio.example
OPENROUTER_APP_NAME=InfoPlayer Left
```

Este archivo no modifica el arranque de WhatsApp. Si lo despliegas como función serverless, configura `OPENROUTER_API_KEY` como secreto del proveedor y limita el acceso del endpoint para evitar que terceros consuman tu saldo. No se añadió el `vercel.json` original porque sus rutas globales reemplazarían el funcionamiento normal de este bot.

### Funciones de IA adaptadas

`!ai` usa el proveedor configurado mediante `AI_PROVIDER`, recuerda las últimas interacciones de cada chat en `AI_MEMORY_FILE`, aplica los estilos configurables con `!tono` y responde con una advertencia de apoyo cuando detecta frases asociadas a una posible crisis. La memoria se guarda localmente y se excluye de Git mediante `.gitignore`.


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

La lista se basa en las vigilancias activas del chat. Si eliges `1`, `2`, etc., el bot consulta en ese momento la información del objetivo correspondiente y no espera al ciclo automático.

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
