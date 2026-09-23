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
SFW_PROVIDER=nekobot

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

Para consultar o cambiar el proveedor de imágenes SFW de anime:

```text
!sfwproveedor list
!sfwproveedor nekosbest
!anime
```

`nekobot` usa el endpoint SFW documentado en [NekoBot Docs](https://docs.nekobot.xyz/), mientras que `nekosbest` usa la API de [Nekos.best](https://nekos.best/). Ambos son proveedores SFW separados de los proveedores NSFW.

- `!ayuda` — muestra la ayuda.
- `!ping` — comprueba si el bot responde.
- `!anime` o `!gatus` — envía una imagen SFW de anime.
- `!nsfw` — muestra las categorías NSFW disponibles.
- `!nsfwproveedor list` — muestra proveedores multimedia NSFW.
- `!nsfwproveedor <nombre>` — selecciona un proveedor NSFW.
- `!ass`, `!feet` y otras categorías permitidas — solicitan contenido si NSFW está habilitado.

## Proveedores NSFW

La configuración predeterminada utiliza `nekobot` como proveedor SFW principal. Su API no requiere token para la mayoría de endpoints; consulta la [documentación oficial de Nekobot](https://docs.nekobot.xyz/) y respeta sus límites y disponibilidad. `nswfparse` queda como proveedor NSFW predeterminado.

```env
NSWFPARSE_ENABLED=true
NSWFPARSE_CATEGORIES=ass,feet,gonewild,blowjob,pussy,thigh,hyuri,lesbian,bdsm
NSWFPARSE_HENTAI_SUBREDDITS=hentai,MonsterGirl,HentaiPetgirls,saohentai,thick_hentai,JerkOffToAnime
```

El comando `!hentai` está disponible con `nswfparse` y usa únicamente la lista explícita de subreddits configurada en `NSWFPARSE_HENTAI_SUBREDDITS`. No utiliza la lista amplia de categorías del paquete, porque esa lista incluye fuentes que no son adecuadas para una configuración general. Puedes ajustar la lista a tus fuentes de ficción permitidas, respetando las reglas de Reddit y la legalidad aplicable.

También se pueden configurar proveedores alternativos si tienes sus credenciales:

```env
NSFW_API_URLS=nswfparse,reddit,rule34,waifuim,safebooru,konachan,hypnohub
NSFW_PROVIDER=reddit
```

Los proveedores nuevos con API documentada son `safebooru`, `konachan` e `hypnohub`. Se consultan mediante GET, usan límites internos, validan el rating y descartan etiquetas de riesgo. Ejemplos:

```env
# Usa una sola fuente manualmente:
NSFW_API_URLS=konachan
NSFW_PROVIDER=konachan

# O selecciona desde WhatsApp:
!nsfwproveedor safebooru
!nsfwproveedor hypnohub
```

`ThePornDude` no publica una API oficial para obtener multimedia; `Booru.org` tampoco documenta una API usable. `Xbooru` documenta endpoints de listado, pero sus términos prohíben procesos automatizados para recuperar o indexar su contenido salvo excepciones concretas. Por eso esos tres sitios **no se integran mediante scraping ni endpoints no documentados**. Para añadirlos legalmente haría falta autorización escrita del operador y una especificación oficial.

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

## Enlaces directos para APIs, claves y tokens

No pongas tokens reales en el repositorio ni en el README. Guárdalos únicamente en `.env` o en las variables privadas de Railway. Estas son las páginas oficiales o de referencia directa para obtener las credenciales que el bot puede utilizar:

| Servicio | Variables | Enlace directo | ¿Necesita token? |
| --- | --- | --- | --- |
| Reddit | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_REFRESH_TOKEN` | [Crear aplicación en Reddit](https://www.reddit.com/prefs/apps) · [Documentación API/OAuth](https://www.reddit.com/dev/api/oauth) · [Reglas de acceso](https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki) | Sí |
| Rule34 | `RULE34_USER_ID`, `RULE34_API_KEY` | [Documentación de la API](https://api.rule34.xxx/docs) · [Sitio de Rule34](https://rule34.xxx/) | Sí, según el endpoint |
| NSWFparse | Ninguna | [Paquete npm](https://www.npmjs.com/package/nswfparse) · [Código fuente](https://github.com/zachey01/NSWFparse) | No; consulta fuentes públicas y debes cumplir sus reglas |
| Waifu.im | Ninguna | [Documentación](https://docs.waifu.im/) · [Referencia de la API](https://docs.waifu.im/docs/api/) | No |
| Nekobot | Ninguna | [API](https://nekobot.xyz/api) | No |
| Nekos.best | Ninguna | [Sitio y documentación](https://nekos.best/) | No |
| Safebooru | Ninguna | [DAPI oficial](https://safebooru.org/index.php?page=help&topic=dapi) | No |
| Konachan | Ninguna | [API oficial](https://konachan.com/help/api) | No para lectura pública |
| HypnoHub | Ninguna | [DAPI oficial](https://hypnohub.net/index.php?page=help&topic=dapi) | No para lectura pública |
| ThePornDude | No disponible | [Sitio](https://theporndude.com) | No hay API pública documentada |
| Booru.org | No disponible | [Sitio y términos](https://booru.org/tos) | No hay API pública documentada |
| Xbooru | No usado | [DAPI](https://xbooru.com/index.php?page=help&topic=dapi) · [Términos](https://xbooru.com/tos.php) | No documentado; automatización restringida |
| WhatsApp/Baileys | Ninguna | [Baileys en GitHub](https://github.com/WhiskeySockets/Baileys) | No; se vincula mediante QR o código |
| Railway | Variables privadas del servicio | [Documentación de variables](https://docs.railway.com/variables) · [Volúmenes](https://docs.railway.com/volumes) | No es una API del bot; es el hosting |

### Cómo obtener las credenciales de Reddit

1. Inicia sesión en [Reddit Apps](https://www.reddit.com/prefs/apps).
2. Pulsa **Create App** o **Create Another App**.
3. Selecciona el tipo **script** para el uso personal del bot.
4. Usa un nombre descriptivo y un `redirect uri`, por ejemplo `http://localhost:8080` si Reddit lo exige.
5. El texto corto que aparece bajo el nombre de la aplicación es `REDDIT_CLIENT_ID`.
6. El campo **secret** es `REDDIT_CLIENT_SECRET`.
7. El `REDDIT_REFRESH_TOKEN` se obtiene mediante el flujo OAuth de Reddit; consulta la [documentación OAuth](https://www.reddit.com/dev/api/oauth) y no lo confundas con un access token temporal.

Configuración mínima:

```env
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
REDDIT_REFRESH_TOKEN=...
REDDIT_USER_AGENT=whatsapp-media-bot/1.0 por/u/TU_USUARIO
```

Si Reddit no aprueba o limita el acceso de tu aplicación, no intentes evadir esos límites. Revisa las [políticas actuales de acceso](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy) y utiliza únicamente contenido que tengas derecho a consultar y redistribuir.

### Credenciales de Rule34

Consulta primero la [documentación de la API de Rule34](https://api.rule34.xxx/docs). Si tu cuenta o el endpoint requiere autenticación, copia el `user id` y la `api key` en las variables privadas:

```env
RULE34_USER_ID=...
RULE34_API_KEY=...
```

NSWFparse, Waifu.im, Nekobot y Nekos.best no requieren una clave en esta configuración. Eso no elimina sus límites, términos de uso ni la obligación de respetar derechos de autor, privacidad y consentimiento.

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
SFW_PROVIDER=nekobot
NSFW_ENABLED=true
NSFW_ALLOW_PRIVATE_CHATS=true
NSFW_ALLOWED_GROUPS=
NSFW_API_URLS=nswfparse
NSFW_PROVIDER=nswfparse
NSWFPARSE_ENABLED=true
NSWFPARSE_CATEGORIES=ass,feet,gonewild,blowjob,pussy,thigh,hyuri,lesbian,bdsm,hentai
NSWFPARSE_HENTAI_SUBREDDITS=hentai,MonsterGirl,HentaiPetgirls,saohentai,thick_hentai,JerkOffToAnime
NSFW_API_TIMEOUT_MS=10000
NSFW_IMAGE_TIMEOUT_MS=30000
NSFW_API_RETRIES=1
NSFW_IMAGE_RETRIES=1
NSFW_DIRECT_URL=false
NSFW_ALLOW_EXTERNAL_URLS=true
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
