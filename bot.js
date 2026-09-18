/**
 * Bot de WhatsApp — infoplayerleft
 * Consulta info de jugadores de Left 4 Dead 2 vía Steam Web API y A2S.
 * Vinculación por código QR o por CÓDIGO DE 8 DÍGITOS con tu número de celular.
 *
 * Variables de entorno (se leen de .env o del entorno del sistema):
 *   STEAM_API_KEY         (opcional; en terminal el bot la pide al arrancar)
 *   WHATSAPP_NUMBER       (opcional) número de celular con código de país, solo dígitos.
 *                         Si se define, la vinculación se hace por código en vez de QR.
 *   PAIRING_CODE          (opcional) "false" para no pedir el número por consola
 *   ALLOWED_GROUPS        (opcional) IDs de grupo separados por coma; si se define,
 *                         el bot solo responde en esos grupos
 *   REPLY_IN_PRIVATE      (opcional) "false" para ignorar chats privados
 *   AUTH_DIR              (opcional) carpeta donde se guarda la sesión (por defecto auth_info)
 *
 * Funciona en Node.js 18+ (Linux, Windows, macOS y Termux en Android).
 */
import "./src/env.js"; // carga .env antes de leer process.env

import makeWASocket, {
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import readline from "node:readline/promises";
import { rmSync, existsSync } from "node:fs";
import { Boom } from "@hapi/boom";
import { handleCommand } from "./src/commands.js";
import { ensureSteamApiKey } from "./src/steamkey.js";
import { startWebServer, setQr, setConectado, setPairingCode } from "./src/web.js";

const ALLOWED_GROUPS = (process.env.ALLOWED_GROUPS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const REPLY_IN_PRIVATE = process.env.REPLY_IN_PRIVATE !== "false";
// En Railway conviene montar un volumen en /data para no perder la sesión
// en cada despliegue. Si existe, se usa automáticamente.
const AUTH_DIR =
  process.env.AUTH_DIR || (existsSync("/data") ? "/data/auth_info" : "auth_info");
// Responder también a los comandos que escribes con tu propio número (ALLOW_SELF=false lo desactiva)
const ALLOW_SELF = process.env.ALLOW_SELF !== "false";
// Borrar la sesión automáticamente cuando queda inválida (AUTO_RESET=false lo desactiva)
const AUTO_RESET = process.env.AUTO_RESET !== "false";

let yaReseteado = false;
let reiniciando = false; // evita abrir varios sockets a la vez

function borrarSesion() {
  if (existsSync(AUTH_DIR)) {
    rmSync(AUTH_DIR, { recursive: true, force: true });
    console.log(`Sesión borrada (${AUTH_DIR}).`);
  }
}

function reiniciar(delayMs = 2000) {
  if (reiniciando) return;
  reiniciando = true;
  setTimeout(() => {
    reiniciando = false;
    start().catch((err) => {
      console.error("No se pudo reconectar:", err?.message || err);
    });
  }, delayMs);
}

function onlyDigits(value) {
  return (value || "").replace(/\D/g, "");
}

const ENV_NUMBER = onlyDigits(process.env.WHATSAPP_NUMBER);
// Por defecto se pregunta el número en la terminal al vincular; PAIRING_CODE=false lo desactiva.
const WANTS_PAIRING_CODE = process.env.PAIRING_CODE !== "false";

async function askPhoneNumber() {
  if (!process.stdin.isTTY) return "";
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question("Número con código de país (ej. 51987654321): ");
    return onlyDigits(answer);
  } finally {
    rl.close();
  }
}

function textFromMessage(msg) {
  const m = msg.message;
  if (!m) return "";
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ""
  );
}

async function start() {
  // "npm start -- --reset" borra la sesión antes de arrancar (solo la primera vez)
  if (!yaReseteado && process.argv.includes("--reset")) {
    yaReseteado = true;
    borrarSesion();
  }
  // Pide la Steam API key en la terminal si no está configurada.
  await ensureSteamApiKey();

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const alreadyRegistered = Boolean(state.creds?.registered);
  let phoneNumber = ENV_NUMBER;
  let usePairingCode = WANTS_PAIRING_CODE && !alreadyRegistered;

  if (usePairingCode && !phoneNumber) {
    console.log("\nPara vincular con CÓDIGO escribe tu número de celular.");
    console.log("Si prefieres el código QR, pulsa Enter sin escribir nada.");
    phoneNumber = await askPhoneNumber();
    if (!phoneNumber) {
      console.log("Sin número; se usará el código QR.");
      usePairingCode = false;
    }
  }

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    browser: Browsers.ubuntu("Chrome"),
  });

  if (usePairingCode && phoneNumber) {
    // Pequeña espera para que el socket esté listo antes de pedir el código.
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber);
        const pretty = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log("\n==============================================");
        console.log(` Código de vinculación: ${pretty}`);
        console.log("==============================================");
        console.log("En el celular: WhatsApp > Dispositivos vinculados >");
        console.log("Vincular un dispositivo > Vincular con número de teléfono.");
        console.log("Escribe ese código antes de que expire.\n");
        setPairingCode(code);
      } catch (err) {
        console.error("No se pudo generar el código de vinculación:", err?.message || err);
        console.error("Revisa el número (código de país incluido) o usa el QR.");
      }
    }, 3000);
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr && !usePairingCode) {
      console.log("\nEscanea este QR con WhatsApp > Dispositivos vinculados:\n");
      qrcode.generate(qr, { small: true });
      setQr(qr);
    }
    if (connection === "open") {
      console.log("Conectado a WhatsApp ✅");
      setConectado(true);
    }
    if (connection === "close") {
      setConectado(false);
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const sesionInvalida =
        code === DisconnectReason.loggedOut ||
        code === DisconnectReason.badSession ||
        code === 401 ||
        code === 403;
      if (sesionInvalida) {
        if (AUTO_RESET) {
          console.log("Sesión inválida: borrando la sesión automáticamente...");
          borrarSesion();
          console.log("Listo, vuelve a vincular ahora.\n");
          reiniciar(1000);
          return;
        }
        console.log(
          `Sesión cerrada. Ejecuta "npm run reset" para borrar ${AUTH_DIR} y vincular de nuevo.`,
        );
        process.exit(1);
      }
      console.log("Conexión perdida, reconectando...");
      reiniciar();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      const jid = msg.key.remoteJid;
      if (!jid) continue;

      const isGroup = jid.endsWith("@g.us");
      if (!isGroup && !REPLY_IN_PRIVATE) continue;
      if (isGroup && ALLOWED_GROUPS.length && !ALLOWED_GROUPS.includes(jid)) continue;

      const text = textFromMessage(msg).trim();
      if (!text.startsWith("!")) continue;

      // Los comandos escritos desde tu propio número también funcionan
      // (así puedes probar el bot en cualquier chat), salvo que ALLOW_SELF=false.
      if (msg.key.fromMe && !ALLOW_SELF) continue;

      console.log(
        `[${isGroup ? "grupo" : "privado"} ${jid}${msg.key.fromMe ? " (yo)" : ""}] ${text}`,
      );

      try {
        await sock.sendPresenceUpdate("composing", jid);
        const reply = await handleCommand(text);
        if (reply) {
          await sock.sendMessage(jid, { text: reply }, { quoted: msg });
        }
      } catch (err) {
        console.error("Error procesando comando:", err);
        await sock.sendMessage(jid, { text: `❌ Error: ${err.message}` }, { quoted: msg });
      } finally {
        await sock.sendPresenceUpdate("paused", jid);
      }
    }
  });
}

// Healthcheck + página /qr cuando la plataforma define PORT (Railway, Render...).
startWebServer();

start().catch((err) => {
  console.error("No se pudo iniciar el bot:", err);
  process.exit(1);
});
