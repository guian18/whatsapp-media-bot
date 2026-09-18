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
responde solo a mensajes que empiezan por `!`, así que no molesta en la
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

Requiere Node.js 18 o superior.

```bash
npm install
cp .env.example .env     # pon tu STEAM_API_KEY
npm start
```

La primera vez hay que vincular el bot con una cuenta de WhatsApp. Hay dos formas:

### Opción A — código con tu número de celular (sin QR)

Pon tu número con código de país (solo dígitos) en `.env`:

```
WHATSAPP_NUMBER=51987654321
```

Al arrancar, la terminal muestra un **código de 8 dígitos**. En el celular:
WhatsApp → **Dispositivos vinculados** → *Vincular un dispositivo* →
**Vincular con número de teléfono** → escribe el código.

Si prefieres escribir el número al arrancar en vez de guardarlo, usa
`PAIRING_CODE=true` y el bot lo preguntará por consola.

### Opción B — código QR

Sin `WHATSAPP_NUMBER` ni `PAIRING_CODE`, aparece un **código QR** en la terminal.
Escanéalo desde WhatsApp → **Dispositivos vinculados** → *Vincular un dispositivo*.

La sesión queda guardada en la carpeta `auth_info/`, así que no hace falta
volver a vincular en los siguientes arranques.

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
  8 dígitos es mucho más cómodo que escanear un QR en la misma pantalla.
- Para que Android no mate el proceso: `pkg install termux-api` y arranca con
  `npm run start:termux` (activa el wake lock). También conviene desactivar la
  optimización de batería para Termux.
- Para dejarlo corriendo aunque cierres la terminal: `pkg install tmux`, luego
  `tmux new -s bot` y dentro `npm start`. Se sale con `Ctrl+B` y `D`, y se vuelve
  con `tmux attach -t bot`.
- No hace falta compilar nada nativo: `.npmrc` ya omite las dependencias
  opcionales que fallan en Android.

## 👥 Usarlo en un grupo

Poner el bot a trabajar en un grupo toma un minuto:

1. Vincula el bot con el número de WhatsApp que quieras usar (código o QR).
2. Añade ese número al grupo (o usa una cuenta que ya esté dentro).
3. Escribe cualquier comando en el grupo, por ejemplo `!ayuda`.

El bot responde citando el mensaje y solo reacciona a textos que empiezan por `!`,
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
QR o el código en cada redespliegue.

## 📝 Notas

- Ya no se usa `DISCORD_TOKEN` ni intents de Discord; la vinculación es por código
  de celular o por QR.
- `auth_info/` y `.env` están en `.gitignore`: nunca los subas al repositorio,
  la sesión de WhatsApp da acceso a tu cuenta.
- Esta conexión usa la librería no oficial Baileys. Un uso abusivo (spam, muchos
  mensajes automáticos) puede provocar el bloqueo del número por parte de WhatsApp.

## 🚂 Despliegue en Railway

1. En Railway: **New Project → Deploy from GitHub repo** y elige `infoplayerleft`.
2. En **Variables** añade `STEAM_API_KEY` (y `WHATSAPP_NUMBER` si quieres vincular
   con código de 8 dígitos en vez de QR).
3. En **Settings → Volumes** crea un volumen montado en `/data`. El bot detecta
   esa carpeta y guarda ahí la sesión (`/data/auth_info`), así no hay que volver
   a vincular en cada despliegue.
4. En **Settings → Networking** pulsa *Generate Domain*. Abre ese dominio en
   `/qr`: verás el **código QR** o el **código de vinculación** para conectar
   WhatsApp desde el navegador, sin depender de los logs.
5. Cuando aparezca `Conectado a WhatsApp ✅` en los logs, escribe `!ayuda` en tu
   grupo.

Notas:
- El arranque es `node bot.js` (definido en `railway.json` y en el `Procfile`).
- La ruta `/` responde al healthcheck (`ok` cuando el bot está conectado).
- Railway no tiene terminal interactiva: la clave de Steam debe ir sí o sí en las
  variables de entorno, y la vinculación se hace por `/qr`.
