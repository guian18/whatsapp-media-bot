# InfoPlayer Left — Bot de WhatsApp para Left 4 Dead 2

> Consulta desde WhatsApp quién está jugando Left 4 Dead 2, en qué servidor está y qué jugadores hay conectados.

InfoPlayer Left es un bot de WhatsApp basado en [Baileys](https://github.com/WhiskeySockets/Baileys) que consulta perfiles de Steam, servidores públicos de Left 4 Dead 2 y jugadores conectados. Funciona en Termux, Railway, Render y VPS con Node.js.

El bot responde únicamente a mensajes que comienzan con `!`, funciona en grupos y chats privados, y no necesita una base de datos externa. La sesión de WhatsApp se guarda en disco para evitar repetir la vinculación después de cada reinicio.

## Funciones

| Comando | Descripción |
|---|---|
| `!info <steamid64\|vanity\|url>` | Muestra el perfil de Steam, indica si está jugando L4D2 y consulta su servidor actual. |
| `!buscar <nickname>` | Busca un nickname en servidores públicos de L4D2 mediante A2S. |
| `!servidor <ip:puerto>` | Muestra información detallada de un servidor. |
| `!jugadores <ip:puerto>` | Muestra el servidor y su lista de jugadores conectados. |
| `!ping` | Comprueba que el bot responde. |
| `!ayuda` | Muestra la lista de comandos. |

Las consultas de Steam requieren una clave de Steam Web API. `!ping` y `!ayuda` funcionan sin ella.

## Requisitos

- Node.js 20 o superior.
- Conexión a Internet.
- Una cuenta de WhatsApp para vincular como dispositivo adicional.
- Una Steam Web API key para los comandos que consultan Steam.
- Para Railway, Render u otro hosting: un proceso persistente y almacenamiento persistente para `auth_info/`.

## Instalación local en Linux, macOS o Windows

Clona el repositorio e instala las dependencias:

```bash
git clone https://github.com/guianpierrcastillolazo-rgb/infoplayerleft.git
cd infoplayerleft
npm install
```

Copia la plantilla de configuración:

```bash
cp .env.example .env
```

Edita `.env` con tus valores. La variable `STEAM_API_KEY` puede omitirse si solo quieres probar `!ping` y `!ayuda`.

Inicia el bot:

```bash
npm start
```

En el primer arranque, si no existe una clave válida, el bot puede solicitar la Steam API key en una terminal interactiva. La clave se valida como una cadena hexadecimal de 32 caracteres y puede guardarse en `.steam_key`.

## Configuración de variables de entorno

Ejemplo completo para un equipo local:

```env
# Steam Web API: https://steamcommunity.com/dev/apikey
STEAM_API_KEY=0123456789abcdef0123456789abcdef

# Número internacional, solo dígitos y código de país; sin +, espacios ni guiones
WHATSAPP_NUMBER=51987654321

# true: solicita un número por consola si WHATSAPP_NUMBER está vacío
# false: usa QR cuando no exista una sesión vinculada
PAIRING_CODE=false

# IDs de grupos permitidos, separados por comas. Vacío = todos los grupos
ALLOWED_GROUPS=

# false: ignora chats privados
REPLY_IN_PRIVATE=true

# Directorio persistente de la sesión
AUTH_DIR=auth_info

# false: ignora comandos enviados por la propia cuenta vinculada
ALLOW_SELF=true

# false: no elimina automáticamente una sesión inválida
AUTO_RESET=true
```

No subas `.env`, `.steam_key` ni `auth_info/` a GitHub. Ya están incluidos en `.gitignore` porque contienen credenciales o la sesión de WhatsApp.

## Vincular WhatsApp

La vinculación se realiza como un dispositivo adicional de WhatsApp. Hay tres opciones.

### Opción A: código de vinculación

Esta opción es recomendable en Termux y hosting sin terminal interactiva.

1. Configura `WHATSAPP_NUMBER` con código de país, solo dígitos:

   ```env
   WHATSAPP_NUMBER=51987654321
   PAIRING_CODE=false
   ```

2. Inicia el bot o abre la página `/qr` en el hosting.
3. En WhatsApp, abre **Dispositivos vinculados → Vincular un dispositivo → Vincular con el número de teléfono**.
4. Introduce el código mostrado por el bot.

El código lo entrega WhatsApp mediante `requestPairingCode`; el bot no genera códigos localmente. Es un código real de 8 caracteres y puede contener letras y números, por ejemplo `BXCN-KFNJ`. Debe introducirse inmediatamente porque caduca aproximadamente en un minuto.

Si quieres escribir el número al arrancar en una terminal, deja `WHATSAPP_NUMBER` vacío y usa:

```env
PAIRING_CODE=true
```

El bot pedirá el número por consola.

### Opción B: código QR en la terminal

Si no configuras `WHATSAPP_NUMBER` y `PAIRING_CODE=false`, el bot mostrará un QR en la terminal:

```bash
npm start
```

Escanéalo desde **WhatsApp → Dispositivos vinculados → Vincular un dispositivo**.

### Opción C: página web `/qr`

Cuando existe la variable `PORT`, el bot inicia un servidor HTTP con estas rutas:

| Ruta | Uso |
|---|---|
| `/` | Página de estado y vinculación. |
| `/qr` | Página para ver el QR o solicitar un código. |
| `/status` | Estado JSON del QR, código y conexión. |
| `/pair` | Endpoint `POST` usado para solicitar el código. |
| `/health` | Healthcheck del servicio; devuelve `{"ok":true}`. |

En Railway, abre:

```text
https://TU-DOMINIO.up.railway.app/qr
```

La página se actualiza automáticamente cada tres segundos. Si WhatsApp acepta el código, espera hasta que aparezca `Conectado a WhatsApp ✅` en la página o en los logs.

## Instalación en Termux

Instala Termux desde [F-Droid](https://f-droid.org/packages/com.termux/) y no desde Google Play, ya que la versión de Play Store puede estar desactualizada.

```bash
pkg update && pkg upgrade
pkg install nodejs-lts git

git clone https://github.com/guianpierrcastillolazo-rgb/infoplayerleft.git
cd infoplayerleft
npm install
cp .env.example .env
nano .env
npm start
```

Para mantener el proceso activo y reducir la suspensión de Android:

```bash
pkg install termux-api tmux
npm run start:termux
```

Para usar `tmux`:

```bash
tmux new -s infoplayerleft
npm start
```

Pulsa `Ctrl+B` y después `D` para salir sin detener el bot. Para volver a la sesión:

```bash
tmux attach -t infoplayerleft
```

Recomendaciones para Termux:

- Desactiva la optimización de batería para Termux.
- Usa `WHATSAPP_NUMBER` si prefieres copiar un código en vez de escanear un QR desde el mismo teléfono.
- La sesión se guarda en `auth_info/` por defecto.
- Para volver a vincular desde cero, ejecuta `npm run reset`.

## Despliegue en Railway

Railway debe ejecutar el proyecto como un servicio persistente de Node.js.

### 1. Crear el servicio

En Railway selecciona **New Project → Deploy from GitHub repo** y elige `infoplayerleft`. El repositorio ya incluye `railway.json` y `Procfile`; el comando de arranque es:

```bash
node bot.js
```

### 2. Configurar el puerto y el dominio

En **Settings → Networking**:

1. Configura el puerto `8080` si Railway no lo asigna automáticamente.
2. Pulsa **Generate Domain**.
3. Railway definirá `PORT=8080` para el servicio.

No es necesario fijar el puerto dentro del código: el bot utiliza `process.env.PORT`.

### 3. Crear el volumen persistente

En el servicio de Railway:

1. Abre **Settings → Volumes** y pulsa **Add Volume**.
2. Si tu interfaz lo muestra en el lienzo del proyecto, usa **+ New → Volume** y conéctalo al servicio `infoplayerleft`.
3. Configura el punto de montaje:

   ```text
   /data
   ```

Un volumen pequeño es suficiente para la sesión. El bot guardará automáticamente las credenciales en `/data/auth_info`.

### 4. Configurar Variables

En **Variables**, añade:

```env
STEAM_API_KEY=tu_clave_de_steam
WHATSAPP_NUMBER=51987654321
PAIRING_CODE=false
AUTH_DIR=/data/auth_info
REPLY_IN_PRIVATE=true
ALLOW_SELF=true
AUTO_RESET=true
```

`WHATSAPP_NUMBER` debe contener únicamente dígitos con código de país. No escribas `+`, espacios ni guiones.

### 5. Vincular y verificar

Después de guardar la configuración y hacer redeploy:

1. Abre `https://TU-DOMINIO.up.railway.app/health` y confirma que responde `{"ok":true}`.
2. Abre `https://TU-DOMINIO.up.railway.app/qr`.
3. Solicita un código nuevo.
4. Introduce el código inmediatamente en WhatsApp.
5. Revisa los logs hasta ver:

   ```text
   Conectado a WhatsApp ✅
   ```

La sesión quedará en:

```text
/data/auth_info
```

No elimines el volumen ni esa carpeta después de vincular el dispositivo. En los siguientes reinicios Railway podrá reutilizar la sesión sin pedir otro código.

### Problemas frecuentes en Railway

- **El servicio no responde:** confirma que el puerto configurado sea `8080`, que exista un dominio generado y que el proceso esté activo.
- **Se pierde la sesión después de un redeploy:** falta un volumen persistente o el volumen no está montado en `/data`.
- **El código no funciona:** solicita un código nuevo y úsalo inmediatamente. No reutilices un código anterior.
- **La clave de Steam no funciona:** revisa que `STEAM_API_KEY` tenga 32 caracteres hexadecimales y que esté configurada como variable del servicio.
- **No se muestra el QR o el código:** espera unos segundos, actualiza `/qr` y revisa los logs.

## Render y VPS

En Render, VPS u otro hosting compatible con Node.js:

- Usa el comando `node bot.js`.
- Configura `STEAM_API_KEY` y `WHATSAPP_NUMBER` como variables de entorno.
- Usa el `PORT` proporcionado por la plataforma.
- Monta almacenamiento persistente y configura `AUTH_DIR` con una ruta dentro de ese almacenamiento.
- Abre `/qr` para vincular y `/health` para comprobar el servicio.

Los servicios serverless que suspenden o destruyen continuamente el proceso no son adecuados para un bot de WhatsApp persistente.

## Pruebas y mantenimiento

Instala exactamente las dependencias del lockfile:

```bash
npm ci
```

Ejecuta la suite de pruebas:

```bash
npm test
```

Las pruebas comprueban:

- Procesamiento de `!ping`, `!ayuda` y comandos desconocidos.
- Validación de direcciones de servidores.
- Validación de Steam API keys.
- Carga de variables desde `.env`.
- Rutas web `/health`, `/status`, `/qr` y `/pair`.
- Rechazo de códigos falsos en la interfaz web.

Scripts disponibles:

| Script | Descripción |
|---|---|
| `npm start` | Inicia el bot. |
| `npm run start:termux` | Activa `termux-wake-lock` y arranca el bot. |
| `npm test` | Ejecuta las pruebas automatizadas. |
| `npm run reset` | Elimina la sesión configurada en `AUTH_DIR`. |
| `npm run relink` | Elimina la sesión y vuelve a iniciar el bot. |

Para forzar una nueva solicitud de Steam API key:

```bash
STEAM_ASK_ALWAYS=true npm start
```

## Seguridad y notas

- `auth_info/` y `/data/auth_info` contienen la sesión de WhatsApp. Trátalos como credenciales privadas.
- No publiques códigos de vinculación ni compartas la URL `/qr` mientras esté activa.
- No subas `.env`, `.steam_key` ni archivos de sesión a GitHub.
- Baileys es una librería no oficial. El uso abusivo, el spam o demasiadas solicitudes pueden provocar restricciones de WhatsApp.
- El bot consulta servidores A2S directamente; algunos servidores pueden no responder, estar protegidos o limitar consultas.

## Licencia y estado del proyecto

Este repositorio es privado por configuración del propietario. Consulta el historial de Git para ver las correcciones y cambios desplegados.
