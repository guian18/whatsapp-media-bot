# 🧟 InfoPlayer Left — Bot de WhatsApp para Left 4 Dead 2

> Pregunta quién está jugando L4D2 ahora mismo, directamente desde WhatsApp.

**InfoPlayer Left** es un bot de WhatsApp que consulta información de jugadores y
servidores de **Left 4 Dead 2**: perfiles de Steam, servidores donde está
conectado un jugador, listas de jugadores en vivo y búsquedas por nickname en
servidores públicos.

Todo funciona con la **Steam Web API** y con consultas **A2S** directas al
Master Server de Steam, sin servidores intermedios ni bases de datos: si la
terminal tiene internet y Node.js, el bot funciona.

Es un portado de la versión original para Discord, adaptado para WhatsApp:
funciona dentro de grupos (y también en chats privados, si lo permites) y
responde solo a mensajes que empiecen por `!`, así que no molesta en la
conversación normal.

## ✨ Qué puede hacer

| Comando | Descripción |
|---|---|
| `!info <steamid64 \| vanity \| url>` | Perfil de Steam, si juega L4D2 y su servidor actual |
| `!buscar <nickname>` | Busca un nickname en servidores públicos vía A2S |
| `!servidor <ip:puerto>` | Información detallada de un servidor |
| `!jugadores <ip:puerto>` | Servidor + lista de jugadores conectados |
| `!ping` | Comprueba que el bot responde |
| `!ayuda` | Lista de comandos |

## 🚀 Instalación

Requiere Node.js 20 o superior.

```bash
npm install
npm start
```

### Comprobar la instalación

Antes de vincular una cuenta, puedes ejecutar las pruebas locales del bot:

```bash
npm test
```

Estas verifican el procesamiento de comandos, la carga de `.env`, las validaciones
y las rutas web de estado y vinculación.

### Scripts útiles

| Script | Para qué sirve |
|---|---|
| `npm start` | Arranca el bot normalmente. Pide la Steam API key en Termux/terminal si no está guardada y luego vincula WhatsApp. |
| `npm run start:termux` | Igual que `start` pero activa un *wake lock* para que Android no mate el proceso. |
| `npm run reset` | Borra la sesión guardada (`auth_info/`) y reinicia desde cero. Úsalo si la vinculación falla. |
| `npm run relink` | Alias rñpido para `npm run reset`. |

## 🔑 Steam API key

La primera vez (o siempre que no tengas una clave guardada), el bot te pide la
**Steam API key** en la terminal. Consìguela gratis en
https://steamcommunity.com/dev/apikey.

- Valida que tenga 32 caracteres hexadecimales.
- Te da 3 intentos si la escribes mal.
- Puedes guardarla en el archivo `.steam_key` para que no vuelva a pedirla.
- Si ya existe una clave válida, te avisa de dónde la cargó (archivo, variable
  de entorno o previamente guardada).

Para forzar que pregunte aunque haya una clave guardada, arranca con:

```bash
STEAM_ASK_ALWAYS=true npm start
```

En plataformas sin terminal interactiva (Railway, Render, VPS) configura la
variable de entorno `STEAM_API_KEY` directamente.

## 📲 Vincular WhatsApp

La primera vez hay que vincular el bot con una cuenta de WhatsApp. Hay tres
formas:

### Opción A — código con tu número de celular (recomendada en Termux)

Pon tu número con código de país (solo dígitos, sin `+` ni `00`) en `.env`:

```
WHATSAPP_NUMBER=51987654321
```

Al arrancar, la terminal muestra un **código de vinculación de 8 caracteres**. En el celular:
WhatsApp → **Dispositivos vinculados** → *Vincular un dispositivo* →
**Vincular con número de teléfono** → escribe el código.

El código se forma en dos grupos de 4 caracteres para leerlo más fácil, por ejemplo
`ABCD-1234`. WhatsApp puede mezclar letras y números.

Si prefieres escribir el número al arrancar en vez de guardarlo, usa
`PAIRING_CODE=true` y el bot lo preguntará por consola.

> **Nota:** cada vez que pides un código nuevo se borra cualquier sesjón a
> medio vincular y se reinicia limpio, evitando el error clásico de "verifica
> que sea el número correcto".

### Opción B — código QR en la terminal

Sin `WHATSAPP_NUMBER` ni `PAIRING_CODE`, aparece un **código QR** en la terminal.
Escánalo desde WhatsApp → **Dispositivos vinculados** → *Vincular un dispositivo*.

### Opción C — página web `/qr` (Railway, Render, VPS)

Si despliegas el bot en la nube, abre el dominio que te dé la plataforma y
añade `/qr`. La página muestra:

- El **código QR** como imagen.
- El **código de 8 dígitos** si pusiste `WHATSAPP_NUMBER`.
- El estado de conexión (`Conectado ✅` o `Esperando vinculación…`).

La página se actualiza sola cada 3 segundos, así que puedes dejarla abierta
hasta que aparezca el QR o el código.

La sesión queda guardada en la carpeta `auth_info/` (o en `/data/auth_info` si
Railway tiene un volumen en `/data`), así que no hace falta volver a vincular
en los siguientes arranques.

## 📱 Instalación en Termux (Android)

¿No tienes PC a mano? El bot corre entero en un celular Android con
[Termux](https://termux.dev) (instálalo desde F-Droid, no desde Play Store):

```bash
pkg update && pkg upgrade
pkg install nodejs-lts git
git clone https://github.com/guianpierrcastillolazo-rgb/infoplayerleft
cd infoplayerleft
npm install
cp .env.example .env    # edita con: nano .env
npm start
```

Consejos para Termux:

- Vincula con **tu número de celular** (`WHATSAPP_NUMBER`): copiar el código de
  8 dígitos es mucho más címodo que escanear un QR en la misma pantalla.
- Para que Android no mate el proceso: `pkg install termux-api` y arranca con
  `npm run start:termux` (activa el wake lock). También conviene desactivar la
  optimización de batería para Termux.
- Para dejarlo corriendo aunque cierres la terminal: `pkg install tmux`, luego
  `tmux new -s bot` y dentro `npm start`. Se sale con `Ctrl+B` y `D`, y se vuelve
  con `tmux attach -t bot`.
- No hace falta compilar nada nativo: `.npmrc` ya omite las dependencias
  opcionales que fallan en Android.
- Si la Steam API key no te aparece, asegúrate de no tener `STEAM_API_KEY`
  puesta en `.env`; bórrala y vuelve a arrancar, o usa
  `STEAM_ASK_ALWAYS=true npm start`.

## 👥 Usarlo en un grupo

Poner el bot a trabajar en un grupo toma un minuto:

1. Vincula el bot con el número de WhatsApp que quieras usar (código o QR).
2. Añade ese número al grupo (o usa una cuenta que ya esté dentro).
3. Escribe cualquier comando en el grupo, por ejemplo `!ayuda`.

El bot responde citando el mensaje y solo reacciona a textos que empiecen por `!`,
así que no molesta en la conversación normal.

### Limitar el bot a grupos concretos

Por defecto responde en todos los grupos donde esté. Para restringirlo, pon los
IDs de grupo en `ALLOWED_GROUPS` (separados por coma). Los IDs terminan en
`@g.us` y aparecen en la consola cada vez que llega un comando:

```
ALLOWED_GROUPS=1203630xxxxxxxxx@g.us,1203631xxxxxxxxx@g.us
```

Para ignorar los mensajes privados: `REPLY_IN_PRIVATE=false`.

## ☁️ Despliegue (Render / Railway / VPS)

Si prefieres tenerlo encendido 24/7, cualquier plataforma con Node.js sirve.

Tipo de servicio: **Worker**. Comando de inicio: `node bot.js`.
Configura `STEAM_API_KEY` como variable de entorno (y `WHATSAPP_NUMBER` si
quieres vincular por código en vez de QR).

Importante: la carpeta `auth_info/` guarda la sesión de WhatsApp. En plataformas
con disco efímero necesitas un **disco persistente**, o tendrás que escanear el
QR o pedir el código en cada redespliegue.

## 🚂 Despliegue en Railway

1. En Railway: **New Project → Deploy from GitHub repo** y elige `infoplayerleft`.
2. En **Variables** añade `STEAM_API_KEY` (y `WHATSAPP_NUMBER` si quieres vincular
   con código de 8 dígitos en vez de QR).
3. En **Settings → Volumes** crea un volumen montado en `/data`. El bot detecta
   esa carpeta y guarda ahí la sesión (`/data/auth_info`), así no hay que volver
   a vincular en cada despliegue.
4. En **Settings → Networking** pulsa *Generate Domain*. Abre ese dominio en
   `/qr`: verás el **código QR** como imagen y el **código de vinculación**
   (si configuraste `WHATSAPP_NUMBER`) para conectar WhatsApp desde el navegador,
   sin depender de los logs. La página se recarga sola cada 3 segundos.
5. Cuando aparezca `Conectado a WhatsApp ✅` en la página o en los logs, escribe
   `!ayuda` yn tu grupo.

Notas:
- El arranque es `node bot.js` (definido en `railway.json` y en el `Procfile`).
- La ruta `/` responde al healthcheck (`ok` cuando el bot está conectado).
- Railway no tiene terminal interactiva: la clave de Steam debe ir sí o sí en las
  variables de entorno.

## 🛠️ Cambios recientes

### Web `/qr`
- Muestra el **QR como imagen** en vez de solo texto.
- Muestra el **código de 8 dígitos** junto al QR si hay `WHATSAPP_NUMBER`.
- Se actualiza automáticamente cada 3 segundos.
- Avisa cuando el bot queda conectado.

### Vinculación por código de 8 dígitos
- Espera a que la conexión con WhatsApp esté lista antes de pedir el código.
- Borra la sesión vieja y reinicia limpio cada vez que se solicita un código,
  evitando sesiones a medio vincular.
- Normaliza los números: quita `+`, espacios y prefijos `00`.
- Si la sesión se invalida (`loggedOut`, `badSession`, `401`, `403`), se borra
  automáticamente y se vuelve a intentar vincular.

### Steam API key
- Ahora se pregunta **solo en la terminal** (Termux / PC). No se pide en la web.
- Validación de formato (32 caracteres hexadecimales) con 3 intentos.
- Opción de guardarla en `.steam_key` para no volver a pedirla.
- `STEAM_ASK_ALWAYS=true` fuerza la pregunta aunque ya exista una clave.

### Dependencias y scripts
- Actualizada la librería de WhatsApp (Baileys) a la última versión estable
  (`^6.7.24`) para corregir fallos conocidos de vinculación.
- Añadidas `qrcode` y `qrcode-terminal` para generar el QR de la web y de la
  terminal.
- Nuevos scripts: `start:termux`, `reset`, `relink`.

## 📝 Notas

- Ya no se usa `DISCORD_TOKEN` ni intents de Discord; la vinculación es por código
  de celular o por QR.
- `auth_info/`, `.steam_key`, `.env` y otros archivos de sesión están en
  `.gitignore`: nunca los subas al repositorio, la sesión de WhatsApp da acceso
  a tu cuenta.
- Esta conexión usa la librería no oficial Baileys. Un uso abusivo (spam, muchos
  mensajes automáticos) puede provocar el bloqueo del número por parte de WhatsApp.
