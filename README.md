# whatsapp bot — infoplayerleft

Bot de **WhatsApp** que consulta información de jugadores de **Left 4 Dead 2**
usando la Steam Web API y consultas A2S al Master Server de Steam.

Portado desde la versión original de Discord. Funciona dentro de grupos de WhatsApp
(y también en chats privados, si lo permites).

## Comandos

| Comando | Descripción |
|---|---|
| `!info <steamid64 \| vanity \| url>` | Perfil de Steam, si juega L4D2 y su servidor actual |
| `!buscar <nickname>` | Busca un nickname en servidores públicos vía A2S |
| `!servidor <ip:puerto>` | Información detallada de un servidor |
| `!jugadores <ip:puerto>` | Servidor + lista de jugadores conectados |
| `!ping` | Comprueba que el bot responde |
| `!ayuda` | Lista de comandos |

## Instalación

Requiere Node.js 20 o superior.

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

## Usarlo en un grupo

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

## Despliegue (Render / Railway / VPS)

Tipo de servicio: **Worker**. Comando de inicio: `node bot.js`.
Configura `STEAM_API_KEY` como variable de entorno (y `WHATSAPP_NUMBER` si
quieres vincular por código en vez de QR).

Importante: la carpeta `auth_info/` guarda la sesión de WhatsApp. En plataformas
con disco efímero necesitas un **disco persistente**, o tendrás que escanear el
QR o el código en cada redespliegue.

## Notas

- Ya no se usa `DISCORD_TOKEN` ni intents de Discord; la vinculación es por código
  de celular o por QR.
- `auth_info/` y `.env` están en `.gitignore`: nunca los subas al repositorio,
  la sesión de WhatsApp da acceso a tu cuenta.
- Esta conexión usa la librería no oficial Baileys. Un uso abusivo (spam, muchos
  mensajes automáticos) puede provocar el bloqueo del número por parte de WhatsApp.

