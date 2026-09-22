/**
 * Bot de WhatsApp — WhatsApp Media Bot
 * Vinculación por código QR o por código de 8 caracteres con un número de celular.
 *
 * Variables de entorno (se leen de .env o del entorno del sistema):
 *   WHATSAPP_NUMBER       opcional; número internacional, solo dígitos.
 *   PAIRING_CODE          "true" para solicitar un número por consola.
 *   GROUPS_ENABLED        "false" para ignorar grupos.
 *   ALLOWED_GROUPS        opcional; IDs de grupo separados por comas.
 *   REPLY_IN_PRIVATE      "false" para ignorar chats privados.
 *   AUTH_DIR              opcional; directorio de la sesión de WhatsApp.
 *   ALLOW_SELF            "false" para ignorar comandos enviados por la propia cuenta.
 *   AUTO_RESET            "false" para no borrar automáticamente una sesión inválida.
 */
import "./src/env.js";

import makeWASocket, {
  Browsers,
  DisconnectReason,
  normalizeMessageContent,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import readline from "node:readline/promises";
import { rmSync, existsSync } from "node:fs";
import { Boom } from "@hapi/boom";
import { handleCommand } from "./src/commands.js";
import { cmdIA } from "./src/ai.js";
import { getAuthDir } from "./src/config.js";
import { startControlServer } from "./src/control-server.js";
import { formatSafeSettingsChange, normalizePrivateJid, ownPrivateJid } from "./src/owner-notifications.js";

const normalizeGroupId = (value) => String(value || "").trim().replace(/@g\.us$/i, "");
const ALLOWED_GROUPS = (process.env.ALLOWED_GROUPS || "")
  .split(",")
  .map(normalizeGroupId)
  .filter(Boolean);
const GROUPS_ENABLED = process.env.GROUPS_ENABLED !== "false";
// Se puede desactivar explícitamente con REPLY_IN_PRIVATE=false.
const REPLY_IN_PRIVATE = process.env.REPLY_IN_PRIVATE !== "false";
// La cuenta vinculada también puede probar comandos enviados desde sí misma.
const ALLOW_SELF = process.env.ALLOW_SELF === "true";
const AUTO_RESET = process.env.AUTO_RESET === "true";

const AUTH_DIR = getAuthDir();
const BOT_STARTED_AT = new Date().toISOString();

let yaReseteado = false;
let reiniciando = false;
let sockActual = null;
let cerrandoManual = false;
let pairingPendiente = null;
let pairingEnCurso = false;
let pairingReconnecting = false;
let guardarCredsPendiente = Promise.resolve();
let connectionState = "starting";
const mensajesProcesados = new Map();

async function notifyOwnerOfSettingsChange(changed) {
  const sock = sockActual;
  let jid = ownPrivateJid(sock);
  if (process.env.CONTROL_NOTIFY_JID) {
    try {
      jid = normalizePrivateJid(process.env.CONTROL_NOTIFY_JID);
    } catch {
      console.warn("CONTROL_NOTIFY_JID no es válido; se usará el chat privado de la cuenta vinculada.");
    }
  }
  if (!sock || !jid || connectionState !== "online") {
    console.warn("No se notificaron los cambios: WhatsApp aún no está conectado.");
    return;
  }
  const safeChanges = formatSafeSettingsChange(changed);
  if (!safeChanges) return;
  await sock.sendMessage(jid, {
    text: `⚙️ Cambios guardados desde la app:\n${safeChanges}`,
  });
}

startControlServer({
  getStatus: () => ({
    ok: true,
    whatsapp: connectionState === "online" ? "online" : connectionState,
    provider: process.env.AI_PROVIDER || "local",
    model: process.env.AI_MODEL || "local-model",
    pid: process.pid,
    startedAt: BOT_STARTED_AT,
    uptimeSeconds: Math.floor(process.uptime()),
    controlApi: true,
  }),
  testAI: (question) => cmdIA(question),
  notifySettingsChange: notifyOwnerOfSettingsChange,
});

function borrarSesion() {
  if (existsSync(AUTH_DIR)) {
    rmSync(AUTH_DIR, { recursive: true, force: true });
    console.log(`Sesión borrada (${AUTH_DIR}).`);
  }
}

function cerrarSocket() {
  const sock = sockActual;
  if (!sock) return Promise.resolve();
  sockActual = null;
  cerrandoManual = true;
  const cerrado = new Promise((resolve) => {
    const timer = setTimeout(resolve, 5000);
    const onUpdate = ({ connection }) => {
      if (connection !== "close") return;
      clearTimeout(timer);
      try { sock.ev.off("connection.update", onUpdate); } catch {}
      resolve();
    };
    sock.ev.on("connection.update", onUpdate);
  });
  try {
    sock.end(new Error("reinicio para pedir un código nuevo"));
  } catch {
    // El socket ya estaba cerrado.
  }
  return cerrado;
}

function reiniciar(delayMs = 2000) {
  if (reiniciando) return;
  reiniciando = true;
  setTimeout(() => {
    guardarCredsPendiente
      .catch(() => {})
      .finally(() => {
        reiniciando = false;
        start().catch((err) => {
          console.error("No se pudo reconectar:", err?.message || err);
          reiniciar(Math.min(delayMs * 2, 30_000));
        });
      });
  }, delayMs);
}

function normalizarNumero(value) {
  let numero = (value || "").replace(/\D/g, "");
  if (numero.startsWith("00")) numero = numero.slice(2);
  return numero;
}

// Baileys usa el alfabeto Crockford para los códigos reales de WhatsApp.
// No se debe sustituir por un código generado localmente.
function esCodigoPairingValido(code) {
  return typeof code === "string" && /^[123456789ABCDEFGHJKLMNPQRSTVWXYZ]{8}$/.test(code);
}

const ENV_NUMBER = normalizarNumero(process.env.WHATSAPP_NUMBER);
// El QR es el comportamiento predeterminado. Un número configurado solicita
// directamente el código; PAIRING_CODE=true permite escribirlo por consola.
const WANTS_PAIRING_CODE = Boolean(ENV_NUMBER) || process.env.PAIRING_CODE === "true";

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
  const m = normalizeMessageContent(msg.message) || {};
  if (!m) return "";
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ""
  );
}

// Solicitar el código antes de completar el handshake genera códigos que el
// cliente de WhatsApp puede rechazar.
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
        // Compatibilidad con versiones de Baileys que no exponen off().
      }
      resolve(ok);
    };
    const handler = ({ qr, connection }) => {
      if (qr || connection === "open") finalizar(true);
      if (connection === "close") finalizar(false);
    };
    const temporizador = setTimeout(() => finalizar(false), timeoutMs);
    sock.ev.on("connection.update", handler);
  });
}

/**
 * Pide un código de vinculación siempre con credenciales nuevas. Reutilizar
 * credenciales que quedaron a medio vincular provoca rechazos de WhatsApp.
 */
async function atenderPairing(sock) {
  const solicitud = pairingPendiente;
  if (!solicitud) return;

  try {
    const listo = await esperarSocketListo(sock);
    if (!listo) throw new Error("WhatsApp no respondió a tiempo. Vuelve a pedir el código.");
    const code = await sock.requestPairingCode(solicitud.numero);
    if (!esCodigoPairingValido(code)) {
      throw new Error("WhatsApp devolvió un código de vinculación inválido. Pide uno nuevo.");
    }
    const pretty = code.match(/.{1,4}/g).join("-");
    console.log("\n==============================================");
    console.log(` Código de vinculación: ${pretty}`);
    console.log("==============================================");
    console.log("En el celular: WhatsApp > Dispositivos vinculados >");
    console.log("Vincular un dispositivo > Vincular con número de teléfono.");
    console.log("El código dura ~1 minuto; si expira, pide otro.\n");
    pairingEnCurso = true;
    solicitud.resolve(code);
  } catch (err) {
    console.error("No se pudo generar el código de vinculación:", err?.message || err);
    solicitud.reject(err instanceof Error ? err : new Error(String(err)));
  } finally {
    if (pairingPendiente === solicitud) pairingPendiente = null;
  }
}

async function start() {
  // npm start -- --reset borra la sesión antes de iniciar, una sola vez.
  if (!yaReseteado && process.argv.includes("--reset")) {
    yaReseteado = true;
    borrarSesion();
  }


  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch (err) {
    // El socket tiene una versión compatible por defecto; no debemos tumbar el proceso.
    console.warn("No se pudo consultar la versión más reciente de Baileys; se usará la predeterminada:", err?.message || err);
  }
  const alreadyRegistered = Boolean(state.creds?.registered);

  let phoneNumber = ENV_NUMBER;
  let usePairingCode =
    WANTS_PAIRING_CODE && !alreadyRegistered && !pairingPendiente && !pairingReconnecting;

  if (usePairingCode && !phoneNumber) {
    if (process.stdin.isTTY) {
      console.log("\nPara vincular con código escribe tu número de celular.");
      console.log("Si prefieres el código QR, pulsa Enter sin escribir nada.");
      phoneNumber = await askPhoneNumber();
    }
    if (!phoneNumber) {
      console.log("Sin número; se usará el código QR.");
      usePairingCode = false;
    }
  }

  const sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: state,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    // WhatsApp valida estrictamente este identificador durante companion_hello.
    // Chrome (Mac OS) es un descriptor canónico compatible con pairing code.
    browser: Browsers.macOS("Chrome"),
  });
  sockActual = sock;
  connectionState = "connecting";
  pairingReconnecting = false;

  sock.ev.on("creds.update", () => {
    guardarCredsPendiente = guardarCredsPendiente
      .then(() => saveCreds())
      .catch((err) => {
        console.error("No se pudieron guardar las credenciales:", err?.message || err);
      });
  });

  // Código pedido mediante WHATSAPP_NUMBER al arrancar.
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
    if (sock !== sockActual && !cerrandoManual) return;
    if (qr && !pairingPendiente && !usePairingCode) {
      console.log("\nEscanea este QR con WhatsApp > Dispositivos vinculados:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      connectionState = "online";
      console.log("Conectado a WhatsApp ✅");
      pairingEnCurso = false;
    }

    if (connection === "close") {
      connectionState = "offline";
      if (cerrandoManual) {
        cerrandoManual = false;
        return;
      }

      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const sesionInvalida =
        code === DisconnectReason.loggedOut ||
        code === DisconnectReason.badSession ||
        code === 401 ||
        code === 403;

      // WhatsApp cierra con 515 después de aceptar el código para que el
      // cliente reinicie y complete el registro con las credenciales nuevas.
      // Este cierre es esperado, no es un error de vinculación.
      if (pairingEnCurso && code === DisconnectReason.restartRequired) {
        pairingEnCurso = false;
        pairingReconnecting = true;
        console.log("Código aceptado; reiniciando para completar la vinculación...");
        reiniciar(500);
        return;
      }

      // Mientras el teléfono está aceptando el código, reconectar crea otro
      // socket y puede invalidar el código que el usuario acaba de introducir.
      // Solo detenemos el intento si WhatsApp cerró por otra razón.
      if (pairingEnCurso) {
        pairingEnCurso = false;
        console.error(
          `La vinculación no terminó (WhatsApp cerró la conexión${code ? `, código ${code}` : ""}). Pide un código nuevo.`,
        );
        return;
      }

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
      const messageId = msg.key.id;
      if (messageId) {
        const now = Date.now();
        for (const [id, at] of mensajesProcesados) if (now - at > 10 * 60_000) mensajesProcesados.delete(id);
        if (mensajesProcesados.has(messageId)) continue;
        mensajesProcesados.set(messageId, now);
      }

      const isGroup = jid.endsWith("@g.us");
      const isPrivate = jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid");
      if (isGroup) {
        if (!GROUPS_ENABLED) continue;
        if (ALLOWED_GROUPS.length && !ALLOWED_GROUPS.includes(normalizeGroupId(jid))) continue;
      } else if (!isPrivate || !REPLY_IN_PRIVATE) {
        continue;
      }

      const text = textFromMessage(msg).trim();
      if (!text.startsWith("!")) continue;
      if (text.length > 500) continue;
      if (msg.key.fromMe && !ALLOW_SELF) continue;

      console.log(
        `[${isGroup ? "grupo" : "privado"} ${jid}${msg.key.fromMe ? " (yo)" : ""}] ${text}`,
      );

      try {
        await sock.sendPresenceUpdate("composing", jid);
        const reply = await handleCommand(text, {
          jid,
          isGroup,
          sendMessage: (targetJid, payload) => sock.sendMessage(targetJid, payload),
        });
        if (reply) {
          await sock.sendMessage(jid, { text: reply }, { quoted: msg });
        }
      } catch (err) {
        console.error("Error procesando comando:", err?.stack || err);
        try {
          await sock.sendMessage(jid, { text: "❌ No pude completar ese comando. Inténtalo de nuevo más tarde." }, { quoted: msg });
        } catch (sendErr) {
          console.error("No se pudo enviar el error al chat:", sendErr?.message || sendErr);
        }
      } finally {
        try {
          await sock.sendPresenceUpdate("paused", jid);
        } catch (presenceErr) {
          console.error("No se pudo actualizar la presencia:", presenceErr?.message || presenceErr);
        }
      }
    }
  });
}

function iniciarConReintentos(delayMs = 1000) {
  start().catch((err) => {
    console.error("No se pudo iniciar el bot; se reintentará:", err?.message || err);
    setTimeout(() => iniciarConReintentos(Math.min(delayMs * 2, 30_000)), delayMs);
  });
}

async function shutdown(signal) {
  console.log(`Recibida señal ${signal}; cerrando el bot...`);
  cerrandoManual = true;
  try { await cerrarSocket(); } catch (error) { console.error("Error cerrando WhatsApp:", error?.message || error); }
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (error) => console.error("Promesa no controlada:", error?.stack || error));
process.on("uncaughtException", (error) => {
  console.error("Excepción no controlada; el proceso se cerrará para que el supervisor lo reinicie:", error?.stack || error);
  process.exit(1);
});

iniciarConReintentos();
