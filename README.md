# WhatsApp Media Bot

Bot de WhatsApp para imágenes de anime **SFW** y comandos de imágenes **NSFW** mediante Nekobot.

## Requisitos

- Node.js 20 o superior.
- Git.
- Una cuenta de WhatsApp para vincular el bot.

## Instalación en Termux

```bash
pkg update -y && pkg upgrade -y
pkg install -y nodejs-lts git
git clone https://github.com/guian18/whatsapp-media-bot.git
cd whatsapp-media-bot
npm ci
cp .env.example .env
nano .env
npm start
```

Para mantenerlo activo mientras Termux está abierto:

```bash
pkg install -y tmux
tmux new -s whatsapp-media-bot
npm run start:termux
```

Desconecta la sesión con `Ctrl+B` y después `D`. Para volver:

```bash
tmux attach -t whatsapp-media-bot
```

## Instalación en Linux, macOS o Windows

Instala Node.js LTS y Git, clona el repositorio y ejecuta:

```bash
npm ci
cp .env.example .env
npm start
```

En Windows, copia `.env.example` como `.env` manualmente antes de ejecutar el bot.

## Configuración de `.env`

Copia `.env.example` como `.env`. No publiques este archivo ni compartas las credenciales de sesión de WhatsApp.

```env
WHATSAPP_NUMBER=
PAIRING_CODE=false
GROUPS_ENABLED=true
ALLOWED_GROUPS=
REPLY_IN_PRIVATE=true
ALLOW_SELF=true
AUTO_RESET=true
AUTH_DIR=auth_info
```

Para vincular por código, usa el número internacional solo con dígitos:

```env
WHATSAPP_NUMBER=51987654321
PAIRING_CODE=false
```

Para usar QR, deja `WHATSAPP_NUMBER` vacío y `PAIRING_CODE=false`.

## Comandos

- `!ayuda` — muestra la ayuda.
- `!ping` — comprueba si el bot responde.
- `!anime` o `!gatus` — envía una imagen SFW de anime.
- `!nsfw` — muestra los comandos de imágenes NSFW.
- `!4k`, `!anal`, `!ass`, `!blowjob`, `!boobs`, `!feet`, `!gonewild`, `!hass`, `!hboobs`, `!hentai`, `!hentaianal`, `!hkitsune`, `!hmidriff`, `!htigh`, `!hyuri`, `!kanna`, `!lewd`, `!lewdneko`, `!paizuri`, `!pgif`, `!pussy`, `!tentacle`, `!thigh` y `!yaoi` — solicitan imágenes NSFW.

La fuente SFW y NSFW está fijada permanentemente en `nekobot`. Usa `!anime` o uno de los comandos NSFW para solicitar una imagen; no existe un comando para cambiarla. Cada chat tiene un intervalo de 10 segundos entre solicitudes NSFW.

Los comandos NSFW son una adaptación para WhatsApp/Baileys del proyecto [Nekros-dsc/Nsfw-Bot](https://github.com/Nekros-dsc/Nsfw-Bot). Se conserva la atribución solicitada por su README; la implementación original usa Discord y aquí se han reemplazado sus embeds y botones por mensajes multimedia de WhatsApp.

## Deploy en Railway

El repositorio incluye `railway.json` para ejecutar el bot como un servicio persistente:

```text
Start command: npm start
```

Crea un volumen Railway montado en `/app/data` y configura:

```env
AUTH_DIR=/app/data/auth_info
```

Variables recomendadas:

```env
WHATSAPP_NUMBER=TU_NUMERO_INTERNACIONAL
PAIRING_CODE=false
GROUPS_ENABLED=true
ALLOWED_GROUPS=
REPLY_IN_PRIVATE=true
ALLOW_SELF=true
AUTO_RESET=true
AUTH_DIR=/app/data/auth_info
```

No necesitas exponer un puerto HTTP: el bot funciona como worker de WhatsApp. Conserva el volumen para no perder la sesión al redeployar.

## Actualizar

```bash
git pull --ff-only origin main
npm ci
npm test
npm start
```

## Restablecer la sesión

```bash
npm run reset
npm start
```

Con `AUTO_RESET=true`, el bot elimina automáticamente una sesión que WhatsApp marque como inválida. Los cortes normales de Internet no deberían borrar una sesión válida.

## Pruebas

```bash
npm test
```
