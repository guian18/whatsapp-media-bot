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
import { startWebServer, setQr, setConectado, setPairingCode, setPairingRequester } from "./src/web.js";

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
let sockActual = null;
let cerrandoManual = false;
// Solicitud de código pendiente: { numero, resolve, reject }
let pairingPendiente = null;

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function borrarSesion() {
  if (existsSync(AUTH_DIR)) {
    rmSync(AUTH_DIR, { recursive: true, force: true });
    console.log(`Sesión borrada (${AUTH_DIR}).`);
  }
}

function cerrarSocket() {
  if (!sockActual) return;
  cerrandoManual = true;
  try {
    sockActual.end(new Error("reinicio para pedir un código nuevo"));
  } catch {
    /* el socket ya estaba cerrado */
  }
  sockActual = null;
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

// WhatsApp espera el número en formato internacional sin "+" ni "00" delante.
function normalizarNumero(value) {
  let numero = onlyDigits(value);
  if (numero.startsWith("00")) numero = numero.slice(2);
  return numero;
}

const ENV_NUMBER = normalizarNumero(process.env.WHATSAPP_NUMBER);
// Por defecto se pregunta el número en la terminal al vincular; PAIRING_CODE=false lo desactiva.
const WANTS_PAIRING_CODE = process.env.PAIRING_CODE !== "false";

async function askPhoneNumber() {
  if (!process.stdin.isTTY) return "";
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question("Número con código de país (ej. 51987654321): ");
    return normalizarNumero(answer);
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

// Espera a que el socket termine el handshake con WhatsApp.
// Pedir el código antes de eso devuelve un código que el celular rechaza.
function esperarSocketListo(sock, timeoutMs = 25000) {
  return new Promise((resolve) => {
    let terminado = false;
    const finalizar = (ok) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(temporizador);
      try {
        sock.ev.off("connection.update", handler);
      } catch {
        /* ignorar */
      }
      resolve(ok);
    };
    const handler = ({ qr, connection }) => {
      // El primer QR (o la conexión abierta) significa que el socket ya está operativo.
      if (qr || connection === "open") finalizar(true);
      if (connection === "close") finalizar(false);
    };
    const temporizador = setTimeout(() => finalizar(false), timeoutMs);
    sock.ev.on("connection.update", handler);
  });
}

/**
 * Pide un código de 8 dígitos SIEMPRE con una sesión nueva.
 * Reutilizar credenciales a medio vincular es la causa típica de
 * "no se pudo vincular el dispositivo / revisa el número".
 */
async function solicitarCodigo(numeroCrudo) {
  const numero = normalizarNumero(numeroCrudo);
  if (!/^\d{8,15}$/.test(numero)) {
    throw new Error(
      "Número inválido. Escribe el código de país + tu número, solo dígitos (ej. 51987654321).",
    );
  }

  if (pairingPendiente) {
    pairingPendiente.reject(new Error("Se pidió otro código."));
    pairingPendiente = null;
  }

  setPairingCode("");
  cerrarSocket();
  borrarSesion();

  const promesa = new Promise((resolve, reject) => {
    pairingPendiente = { numero, resolve, reject };
  });

  reiniciar(500);
  return promesa;
}

async function atenderPairing(sock) {
  const solicitud = pairingPendiente;
  if (!solicitud) return;
  try {
    const listo = await esperarSocketListo(sock);
    if (!listo) throw new Error("WhatsApp no respondió a tiempo. Vuelve a pedir el código.");
    await esperar(1500);
    const code = await sock.requestPairingCode(solicitud.numero);
    const pretty = code?.match(/.{1,4}/g)?.join("-") || code;
    console.log("\n==============================================");
    console.log(` Código de vinculación: ${pretty}`);
    console.log("==============================================");
    console.log("En el celular: WhatsApp > Dispositivos vinculados >");
    console.log("Vincular un dispositivo > Vincular con número de teléfono.");
    console.log("El código dura ~1 minuto; si expira, pide otro.\n");
    setPairingCode(code);
    solicitud.resolve(code);
  } catch (err) {
    console.error("No se pudo generar el código de vinculación:", err?.message || err);
    solicitud.reject(err instanceof Error ? err : new Error(String(err)));
  } finally {
    if (pairingPendiente === solicitud) pairingPendiente = null;
  }
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
  let usePairingCode = WANTS_PAIRING_CODE && !alreadyRegistered && !pairingPendiente;

  if (usePairingCode && !phoneNumber) {
    if (process.stdin.isTTY) {
      console.log("\nPara vincular con CÓDIGO escribe tu número de celular.");
      console.log("Si prefieres el código QR, pulsa Enter sin escribir nada.");
      phoneNumber = await askPhoneNumber();
    }
    if (!phoneNumber) {
      console.log("Sin número; se usará el código QR.");
      usePairingCode = false;
    }
  }

  const sock = makeWASocket({
    version,
    auth: state,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    browser: Browsers.ubuntu("Chrome"),
  });
  sockActual = sock;

  sock.ev.on("creds.update", saveCreds);

  // Código pedido desde la web (/qr) o por WHATSAPP_NUMBER en el arranque.
  if (!alreadyRegistered) {
    if (!pairingPendiente && usePairingCode && phoneNumber) {
      pairingPendiente = {
        numero: phoneNumber,
        resolve: () => {},
        reject: (err) =>
          console.error("Revisa el número (con código de país) o usa el QR:", err?.message || err),
      };
    }
    if (pairingPendiente) void atenderPairing(sock);
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr && !pairingPendiente && !usePairingCode) {
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
      if (cerrandoManual) {
        cerrandoManual = false;
        return; // cierre provocado por nosotros para pedir un código nuevo
      }
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

// La página /qr puede pedir el código en cualquier momento.
setPairingRequester(solicitarCodigo);

// Healthcheck + página /qr cuando la plataforma define PORT (Railway, Render...).
startWebServer();

start().catch((err) => {
  console.error("No se pudo iniciar el bot:", err);
  process.exit(1);
});
