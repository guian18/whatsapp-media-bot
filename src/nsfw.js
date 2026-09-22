import axios from "axios";

const API_URL = "https://nekobot.xyz/api/image";
const MIN_INTERVAL_MS = 10_000;
const lastRequestByChat = new Map();

// Nombres compatibles con la API de imágenes del proyecto original.
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
  hentaianal: "hentaianal",
  hkitsune: "hkitsune",
  hmidriff: "hmidriff",
  htigh: "htigh",
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

function configuredGroups() {
  return new Set(
    String(process.env.NSFW_ALLOWED_GROUPS || "")
      .split(",")
      .map((value) => value.trim())
      .map((value) => value.replace(/@g\.us$/i, ""))
      .filter(Boolean),
  );
}

function groupKey(jid) {
  return String(jid || "").replace(/@g\.us$/i, "");
}

function accessMessage(context) {
  if (process.env.NSFW_ENABLED !== "true") {
    return "Los comandos de imágenes para adultos están desactivados.";
  }
  if (!context.isGroup && process.env.NSFW_ALLOW_PRIVATE_CHATS !== "true") {
    return "Por seguridad, las imágenes para adultos solo están disponibles en grupos autorizados; no se envían por chat privado.";
  }
  if (!context.isGroup) return null;
  const groups = configuredGroups();
  if (groups.size && !groups.has(groupKey(context.jid))) {
    return "Este grupo no está autorizado para comandos de imágenes para adultos.";
  }
  return null;
}

export function validImageUrl(value) {
  try {
    const url = new URL(value);
    const isHttp = url.protocol === "http:" || url.protocol === "https:";
    if (!isHttp) return null;

    const allowExternal = process.env.NSFW_ALLOW_EXTERNAL_URLS === "true";
    const isApiHost = url.protocol === "https:"
      && (url.hostname === "nekobot.xyz" || url.hostname.endsWith(".nekobot.xyz"));
    return (isApiHost || allowExternal) ? url.toString() : null;
  } catch {
    return null;
  }
}

function cleanup(now) {
  for (const [jid, timestamp] of lastRequestByChat) {
    if (now - timestamp > MIN_INTERVAL_MS * 6) lastRequestByChat.delete(jid);
  }
}

export function nsfwHelp() {
  const names = Object.keys(NSFW_COMMANDS).map((name) => `!${name}`).join(", ");
  return [
    "*Menú de imágenes NSFW*",
    "",
    `Comandos disponibles: ${names}`,
    "",
    "Ejemplo: escribe !hentai o !boobs para recibir una imagen aleatoria.",
    "Cada chat puede solicitar una imagen cada 10 segundos.",
  ].join("\n");
}

export async function sendNsfwImage(command, context = {}) {
  const access = accessMessage(context);
  if (access) return access;
  if (typeof context.sendMessage !== "function" || !context.jid) return "Este comando solo está disponible desde WhatsApp.";

  const type = NSFW_COMMANDS[command];
  if (!type) return nsfwHelp();

  const now = Date.now();
  cleanup(now);
  const lastRequest = lastRequestByChat.get(context.jid) || 0;
  if (now - lastRequest < MIN_INTERVAL_MS) {
    const waitSeconds = Math.ceil((MIN_INTERVAL_MS - (now - lastRequest)) / 1000);
    return `Espera ${waitSeconds} segundos antes de pedir otra imagen.`;
  }
  lastRequestByChat.set(context.jid, now);

  try {
    const { data } = await axios.get(API_URL, {
      params: { type },
      headers: { accept: "application/json", "user-agent": "InfoPlayerLeft/1.0" },
      timeout: 15_000,
    });
    const imageUrl = validImageUrl(data?.message);
    if (!imageUrl) throw new Error("la API no devolvió una imagen segura");
    const { data: imageData } = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      headers: { accept: "image/*", "user-agent": "InfoPlayerLeft/1.0" },
      timeout: 20_000,
      maxContentLength: 15 * 1024 * 1024,
      maxBodyLength: 15 * 1024 * 1024,
    });
    const imageBuffer = Buffer.isBuffer(imageData) ? imageData : Buffer.from(imageData);
    if (!imageBuffer.length) throw new Error("la imagen descargada está vacía");
    await context.sendMessage(context.jid, {
      image: imageBuffer,
      caption: `Contenido para adultos: ${command}`,
    });
    return null;
  } catch (error) {
    return `No pude obtener esa imagen ahora: ${error?.message || "error de API"}`;
  }
}
