# InfoPlayer Left — Bot de WhatsApp para Left 4 Dead 2

> Consulta desde WhatsApp quién está jugando Left 4 Dead 2, en qué servidor está y qué jugadores hay conectados.

InfoPlayer Left es un bot de WhatsApp basado en [Baileys](https://github.com/WhiskeySockets/Baileys) que consulta perfiles de Steam, servidores públicos de Left 4 Dead 2 y jugadores conectados. Funciona localmente en Linux, macOS, Windows y Termux con Node.js. Usa el paquete publicado `@whiskeysockets/baileys@7.0.0-rc14`; las protecciones de pairing y reconexión están implementadas en este repositorio.

El bot responde únicamente a mensajes que comienzan con `!`, funciona en grupos y chats privados, y no necesita una base de datos externa. La sesión de WhatsApp se guarda en disco para evitar repetir la vinculación después de cada reinicio.

## Funciones

| Comando | Descripción |
|---|---|
| `!info <steamid64\|vanity\|url>` | Muestra el perfil de Steam, indica si está jugando L4D2 y consulta su servidor actual. |
| `!buscar <nickname>` | Busca un nickname en servidores públicos de L4D2 mediante A2S. |
| `!servidor <ip:puerto>` | Muestra información detallada de un servidor. |
| `!jugadores <ip:puerto>` | Muestra el servidor y su lista de jugadores conectados. |
| `!ping` | Comprueba que el bot responde. |
| `!ai <pregunta>` | Busca información reciente en Internet y la resume con IA. Requiere `AI_API_KEY`. El tono se configura en `.env`. |
| `!ayuda` | Muestra la lista de comandos. |

Las consultas de Steam requieren una clave de Steam Web API. `!ping` y `!ayuda` funcionan sin ella.

`!ai` es opcional. Configura en `.env` una clave de una API compatible con OpenAI Chat Completions:

```env
AI_API_KEY=tu_clave_de_ia
AI_MODEL=gpt-4o-mini
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_DEFAULT_STYLE=tranquilo
AI_TIMEOUT_MS=15000
AI_MIN_INTERVAL_MS=4000
```

El comando realiza una búsqueda web breve, envía los resultados al modelo y muestra las fuentes. La clave nunca se publica en WhatsApp. Si no configuras `AI_API_KEY`, el resto de los comandos continúa funcionando normalmente.

El único comando de IA es `!ai <pregunta>`. El tono se configura en `.env` con `AI_DEFAULT_STYLE`: `tranquilo`, `agresivo`, `insultos`, `formal`, `divertido`, `sarcastico` o `breve`. El tono `insultos` permite palabrotas e insultos genéricos dirigidos a errores, ideas o situaciones; no debe generar amenazas, insultos discriminatorios, slurs ni acoso dirigido a una persona identificable.

### Dónde obtener las claves de API

- **Steam Web API:** crea la clave en el [formulario oficial de Steam](https://steamcommunity.com/dev/apikey). Consulta la [documentación oficial de Steam Web API](https://steamcommunity.com/dev) y sus [términos de uso](https://steamcommunity.com/dev/apiterms). La clave debe tener 32 caracteres hexadecimales.
- **OpenAI para `!ai`:** crea una clave en [OpenAI API Keys](https://platform.openai.com/settings/organization/api-keys). Consulta la [guía oficial de inicio rápido](https://developers.openai.com/api/docs/quickstart) y la [referencia oficial de la API](https://developers.openai.com/api/reference/overview/). El uso de la API puede estar sujeto a facturación y límites de la cuenta.

Guarda las claves únicamente en `.env` o en variables de entorno. No las publiques en GitHub, grupos de WhatsApp, capturas de pantalla ni en el código fuente.

## Requisitos

- Node.js 20 o superior.
- Conexión a Internet.
- Una cuenta de WhatsApp para vincular como dispositivo adicional.
- Una Steam Web API key para los comandos que consultan Steam.
- Almacenamiento local para conservar `auth_info/` entre reinicios.

## Cambios incluidos

- Se añadió el comando único `!ai <pregunta>`, que realiza una búsqueda web breve, consulta una API compatible con OpenAI y devuelve una respuesta en español con fuentes. El tono se controla con `AI_DEFAULT_STYLE`.
- La IA es opcional: sin `AI_API_KEY`, `!ping`, `!ayuda`, los comandos de Steam y las consultas A2S continúan funcionando.
- Se añadieron límites de longitud, tiempo de espera, consultas simultáneas y frecuencia para proteger el bot y controlar el consumo de la API.
- La vinculación por código usa únicamente códigos reales entregados por WhatsApp; el bot no inventa códigos.
- Se estabilizaron la reconexión después de aceptar un código, el guardado de credenciales y la deduplicación de mensajes.
- La sesión se guarda en `AUTH_DIR` y, por defecto, en `auth_info/`. `npm run reset` elimina exactamente esa carpeta para volver a vincular.
- La vinculación se realiza exclusivamente desde la terminal mediante QR o código real de WhatsApp; no se incluye panel web ni servidor de hosting.
- Se reforzaron las validaciones de Steam, las consultas A2S y los límites de búsqueda de servidores.
- Se añadieron pruebas automatizadas para comandos, configuración, pairing y validaciones locales.

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

# IA opcional para !ai; OpenAI o cualquier API compatible con Chat Completions
AI_API_KEY=tu_clave_de_ia
AI_MODEL=gpt-4o-mini
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_DEFAULT_STYLE=tranquilo
# Opcionales: tiempo máximo y espera mínima entre consultas
AI_TIMEOUT_MS=15000
AI_MIN_INTERVAL_MS=4000

# Número internacional, solo dígitos y código de país; sin +, espacios ni guiones
WHATSAPP_NUMBER=51987654321

# true: solicita un número por consola si WHATSAPP_NUMBER está vacío
# false: usa QR cuando no exista una sesión vinculada
PAIRING_CODE=false

# IDs de grupos permitidos, separados por comas. Vacío = todos los grupos
ALLOWED_GROUPS=

# false: ignora chats privados
REPLY_IN_PRIVATE=false

# Directorio persistente de la sesión
AUTH_DIR=auth_info

# false: ignora comandos enviados por la propia cuenta vinculada
ALLOW_SELF=false

# false: no elimina automáticamente una sesión inválida
AUTO_RESET=false
```

No subas `.env`, `.steam_key` ni `auth_info/` a GitHub. Ya están incluidos en `.gitignore` porque contienen credenciales o la sesión de WhatsApp.

### Probar `!ai`

Después de guardar `.env`, reinicia el bot y envía desde WhatsApp:

```text
!ai ¿Cuál es la versión más reciente de Left 4 Dead 2?
```

Si responde que la IA no está configurada, comprueba que `AI_API_KEY` no esté vacío y que hayas reiniciado el proceso después de editar `.env`. Si aparece un error de cuota, autenticación o modelo, revisa la cuenta y la documentación del proveedor de IA. El comando no inventa una clave ni usa la clave de Steam para la IA.

## Vincular WhatsApp

La vinculación se realiza como un dispositivo adicional de WhatsApp. Hay dos opciones desde la terminal.

### Opción A: código de vinculación en la terminal

Esta opción es recomendable en Termux y equipos donde prefieras vincular sin escanear un QR.

1. Configura `WHATSAPP_NUMBER` con código de país, solo dígitos:

   ```env
   WHATSAPP_NUMBER=51987654321
   PAIRING_CODE=false
   ```

2. Inicia el bot desde la terminal.
3. En WhatsApp, abre **Dispositivos vinculados → Vincular un dispositivo → Vincular con el número de teléfono**.
4. Introduce el código mostrado por el bot.

El código lo entrega WhatsApp mediante `requestPairingCode`; el bot no genera códigos localmente. Es un código real de 8 caracteres y puede contener letras y números, por ejemplo `BXCN-KFNJ`. Debe introducirse inmediatamente porque caduca aproximadamente en un minuto. El bot usa un descriptor de plataforma canónico (`Chrome (Mac OS)`) para evitar rechazos de WhatsApp durante `companion_hello`.

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
- Vinculación y persistencia desde la terminal.

Scripts disponibles:

| Script | Descripción |
|---|---|
| `npm start` | Inicia el bot. |
| `npm run start:termux` | Arranca el bot en Termux. |
| `npm test` | Ejecuta las pruebas automatizadas. |
| `npm run reset` | Elimina la sesión configurada en `AUTH_DIR`. |
| `npm run relink` | Elimina la sesión y vuelve a iniciar el bot. |

Para forzar una nueva solicitud de Steam API key:

```bash
STEAM_ASK_ALWAYS=true npm start
```

## Seguridad y notas

- `auth_info/` contiene la sesión de WhatsApp. Trátala como credencial privada.
- No publiques ni compartas los códigos de vinculación mientras estén activos.
- No subas `.env`, `.steam_key` ni archivos de sesión a GitHub.
- Baileys es una librería no oficial. El uso abusivo, el spam o demasiadas solicitudes pueden provocar restricciones de WhatsApp.
- El bot consulta servidores A2S directamente; algunos servidores pueden no responder, estar protegidos o limitar consultas.

## Licencia y estado del proyecto

Este repositorio es privado por configuración del propietario. Consulta el historial de Git para ver las correcciones y cambios desplegados.
