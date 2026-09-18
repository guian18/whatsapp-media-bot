/**
 * Bot de WhatsApp — infoplayerleft
 * Consulta info de jugadores de Left 4 Dead 2 vía Steam Web API y A2S.
 * Conexión por código QR (Baileys), funciona en grupos y en chats privados.
 *
 * Variables de entorno:
 *   STEAM_API_KEY        (recomendada)
 *   ALLOWED_GROUPS       (opcional) IDs de grupo separados por coma; si se define,
 *                        el bot solo responde en esos grupos
 *   REPLY_IN_PRIVATE     (opcional) "false" para ignorar chats privados
 */
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { handleCommand } from "./src/commands.js";

const ALLOWED_GROUPS = (process.env.ALLOWED_GROUPS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const REPLY_IN_PRIVATE = process.env.REPLY_IN_PRIVATE !== "false";

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
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      // 🔒 Ocultado por seguridad en Railway.
      console.log("⚠️ Nuevo código QR generado. Vincula tu cuenta de forma local antes de desplegar.");
    }
    if (connection === "open") {
      console.log("Conectado a WhatsApp ✅");
    }
    if (connection === "close") {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log("Sesión cerrada. Borra la carpeta auth_info y vuelve a escanear el QR.");
        process.exit(1);
      }
      console.log("Conexión perdida, reconectando...");
      start();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const jid = msg.key.remoteJid;
      if (!jid) continue;

      const isGroup = jid.endsWith("@g.us");
      if (!isGroup && !REPLY_IN_PRIVATE) continue;
      if (isGroup && ALLOWED_GROUPS.length && !ALLOWED_GROUPS.includes(jid)) continue;

      const text = textFromMessage(msg).trim();
      if (!text.startsWith("!")) continue;

      console.log(`[${isGroup ? "grupo" : "privado"} ${jid}] ${text}`);

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

start().catch((err) => {
  console.error("No se pudo iniciar el bot:", err);
  process.exit(1);
});
