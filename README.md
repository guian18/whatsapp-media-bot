# WhatsApp Media Bot

Bot de WhatsApp para imágenes, vídeos, GIFs, anime SFW y proveedores multimedia NSFW configurables.

## Requisitos

- Node.js 20 o superior.
- Git.
- Una cuenta de WhatsApp para vincular el bot.

## Instalación en Termux

```bash
pkg update -y && pkg upgrade -y
pkg install -y nodejs-lts git
termux-setup-storage
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

Copia `.env.example` como `.env`. Nunca publiques `.env` ni compartas las credenciales de APIs.

```env
WHATSAPP_NUMBER=
PAIRING_CODE=false
GROUPS_ENABLED=true
ALLOWED_GROUPS=
REPLY_IN_PRIVATE=true
ALLOW_SELF=true
AUTO_RESET=true

NSFW_ENABLED=true
NSFW_ALLOW_PRIVATE_CHATS=true
NSFW_ALLOWED_GROUPS=
NSFW_API_URLS=nswfparse
NSFW_PROVIDER=nswfparse
NSWFPARSE_ENABLED=true
NSWFPARSE_CATEGORIES=ass,feet,gonewild,blowjob,pussy,thigh,hyuri,lesbian,bdsm
NSFW_API_TIMEOUT_MS=10000
NSFW_IMAGE_TIMEOUT_MS=30000
NSFW_API_RETRIES=1
NSFW_IMAGE_RETRIES=1
NSFW_DIRECT_URL=false
NSFW_ALLOW_EXTERNAL_URLS=true

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
- `!nsfw` — muestra las categorías NSFW disponibles.
- `!nsfwproveedor list` — muestra proveedores multimedia NSFW.
- `!nsfwproveedor <nombre>` — selecciona un proveedor NSFW.
- `!ass`, `!feet` y otras categorías permitidas — solicitan contenido si NSFW está habilitado.

## Proveedores NSFW

La configuración predeterminada utiliza `nswfparse` para categorías reales de Reddit. Requiere autorización para consultar y redistribuir el contenido, además del cumplimiento de las reglas de Reddit y la legislación aplicable.

```env
NSWFPARSE_ENABLED=true
NSWFPARSE_CATEGORIES=ass,feet,gonewild,blowjob,pussy,thigh,hyuri,lesbian,bdsm
```

También se pueden configurar proveedores alternativos si tienes sus credenciales:

```env
NSFW_API_URLS=reddit,rule34,nekobot,waifuim
NSFW_PROVIDER=reddit
```

Reddit requiere:

```env
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_REFRESH_TOKEN=
REDDIT_USER_AGENT=whatsapp-media-bot/1.0
```

Rule34 requiere:

```env
RULE34_USER_ID=
RULE34_API_KEY=
```

El proveedor seleccionado se usa de forma exclusiva. Las respuestas multimedia se envían como imágenes, GIFs o vídeos cuando el formato y el tamaño son compatibles.

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
REPLY_IN_PRIVATE=true
ALLOW_SELF=true
AUTO_RESET=true
NSFW_ENABLED=true
NSFW_ALLOW_PRIVATE_CHATS=true
NSFW_ALLOWED_GROUPS=
NSFW_API_URLS=nswfparse
NSFW_PROVIDER=nswfparse
NSWFPARSE_ENABLED=true
NSWFPARSE_CATEGORIES=ass,feet,gonewild,blowjob,pussy,thigh,hyuri,lesbian,bdsm
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
