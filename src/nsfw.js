import axios from "axios";

const NEKOBOT_API = "https://nekobot.xyz/api/image";
const MIN_INTERVAL_MS = 10_000;
const lastRequestByRequester = new Map();
const sentMessagesByRequester = new Map();

// Port of the command set from Nekros-dsc/Nsfw-Bot, adapted from Discord embeds
// to WhatsApp media messages. Nekobot remains the only fixed provider.
export const NSFW_COMMANDS = Object.freeze({
  "4k": "4k",
  anal: "anal",
  ass: "ass",
  blowjob: "blowjob",
  boobs: "boobs",
  feet: "feet",
  gonewild: "gonewild",
  hass: "hass",
  hboobs: "hboobs",
  hentai: "hentai",
  hentaianal: "hentai_anal",
  hkitsune: "hkitsune",
  hmidriff: "hmidriff",
  htigh: "hthigh",
  hyuri: "hyuri",
  kanna: "kanna",
  lewd: "lewd",
  lewdneko: "lewdneko",
  paizuri: "paizuri",
  pgif: "pgif",
  pussy: "pussy",
  tentacle: "tentacle",
  thigh: "thigh",
  yaoi: "yaoi",
});

function cleanup(now) {
  for (const [requester, timestamp] of lastRequestByRequester) {
    if (now - timestamp > MIN_INTERVAL_MS * 6) lastRequestByRequester.delete(requester);
  }
}

function requesterKey(context) {
  return `${context.jid}:${context.requesterId || context.jid}`;
}

function recordSentMessage(context, result) {
  const key = result?.key || result;
  if (!key?.id) return;
  const mapKey = requesterKey(context);
  const messages = sentMessagesByRequester.get(mapKey) || [];
  messages.push(key);
  sentMessagesByRequester.set(mapKey, messages.slice(-100));
}

export async function clearNsfwMessages(context = {}) {
  if (typeof context.deleteMessage !== "function" || !context.jid) {
    return "Este comando solo está disponible desde WhatsApp.";
  }
  const mapKey = requesterKey(context);
  const messages = sentMessagesByRequester.get(mapKey) || [];
  if (!messages.length) return "No tienes imágenes NSFW enviadas por el bot para eliminar en este chat.";

  let deleted = 0;
  const remaining = [];
  for (const messageKey of messages) {
    try {
      await context.deleteMessage(messageKey);
      deleted += 1;
    } catch {
      remaining.push(messageKey);
    }
  }
  if (remaining.length) sentMessagesByRequester.set(mapKey, remaining);
  else sentMessagesByRequester.delete(mapKey);
  return deleted
    ? `Eliminé ${deleted} mensaje${deleted === 1 ? "" : "s"} NSFW tuyo${deleted === 1 ? "" : "s"}.`
    : "No pude eliminar tus imágenes NSFW. Inténtalo de nuevo.";
}

function validNekobotUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (host !== "nekobot.xyz" && !host.endsWith(".nekobot.xyz")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function nsfwHelp() {
  const names = Object.keys(NSFW_COMMANDS).map((name) => `!${name}`).join(", ");
  return [
    "*Menú de imágenes NSFW*",
    "",
    `Comandos disponibles: ${names}`,
    "",
    "Cada usuario puede solicitar una imagen cada 10 segundos por chat.",
    "Usa estos comandos solo donde el contenido adulto esté permitido.",
  ].join("\n");
}

export async function sendNsfwImage(command, context = {}) {
  if (!context.jid || typeof context.sendMessage !== "function") {
    return "Este comando solo está disponible desde WhatsApp.";
  }

  const type = NSFW_COMMANDS[command];
  if (!type) return nsfwHelp();

  const now = Date.now();
  cleanup(now);
  const requester = requesterKey(context);
  const lastRequest = lastRequestByRequester.get(requester) || 0;
  if (now - lastRequest < MIN_INTERVAL_MS) {
    const waitSeconds = Math.ceil((MIN_INTERVAL_MS - (now - lastRequest)) / 1000);
    return `Espera ${waitSeconds} segundos antes de pedir otra imagen.`;
  }
  lastRequestByRequester.set(requester, now);

  try {
    const { data } = await axios.get(NEKOBOT_API, {
      params: { type },
      headers: {
        accept: "application/json",
        "user-agent": "WhatsAppMediaBot/1.0",
      },
      timeout: 15_000,
    });
    const imageUrl = validNekobotUrl(data?.message);
    if (!imageUrl) throw new Error("Nekobot no devolvió una URL segura");
    const sentMessage = await context.sendMessage(context.jid, {
      image: { url: imageUrl },
      caption: `🔞 ${command} · Fuente: Nekobot · Adaptado de Nekros-dsc/Nsfw-Bot`,
    });
    recordSentMessage(context, sentMessage);
    return null;
  } catch (error) {
    lastRequestByRequester.delete(requester);
    return `No pude obtener esa imagen NSFW ahora: ${error.message}`;
  }
}
