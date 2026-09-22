import axios from "axios";

const DEFAULT_API_URL = "https://nekobot.xyz/api/image";
const MIN_INTERVAL_MS = 10_000;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const lastRequestByChat = new Map();

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

function configuredApiUrls() {
  const raw = process.env.NSFW_API_URLS || process.env.NSFW_API_URL || DEFAULT_API_URL;
  return [...new Set(String(raw)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean))];
}

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
  if (process.env.NSFW_ENABLED === "false") return "Los comandos de imágenes para adultos están desactivados. Configura NSFW_ENABLED=true para activarlos.";
  if (!context.isGroup && process.env.NSFW_ALLOW_PRIVATE_CHATS === "false") {
    return "Por seguridad, las imágenes para adultos solo están disponibles en grupos autorizados; no se envían por chat privado.";
  }
  if (!context.isGroup) return null;
  const groups = configuredGroups();
  if (groups.size && !groups.has(groupKey(context.jid))) return "Este grupo no está autorizado para comandos de imágenes para adultos.";
  return null;
}

export function validImageUrl(value) {
  try {
    const url = new URL(value);
    const isHttp = url.protocol === "http:" || url.protocol === "https:";
    if (!isHttp || url.username || url.password) return null;
    const allowExternal = process.env.NSFW_ALLOW_EXTERNAL_URLS === "true";
    const isApiHost = url.protocol === "https:"
      && (url.hostname === "nekobot.xyz" || url.hostname.endsWith(".nekobot.xyz"));
    return (isApiHost || allowExternal) ? url.toString() : null;
  } catch {
    return null;
  }
}

function isImagePayload(data, contentType = "") {
  if (!data || !Buffer.isBuffer(data) || data.length < 12) return false;
  if (/^image\//i.test(contentType)) return true;
  return (
    data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ||
    data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    data.subarray(0, 6).toString("ascii") === "GIF87a" ||
    data.subarray(0, 6).toString("ascii") === "GIF89a" ||
    (data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP")
  );
}

function imageUrlFromApiResponse(data) {
  const candidates = [
    data?.message,
    data?.url,
    data?.image,
    data?.video,
    data?.data?.url,
    data?.data?.image,
    data?.result?.url,
    data?.result?.image,
    ...(Array.isArray(data?.images) ? data.images : []),
    ...(Array.isArray(data?.data) ? data.data : []),
  ];
  for (const candidate of candidates) {
    const value = typeof candidate === "string" ? candidate : candidate?.url || candidate?.image;
    const imageUrl = validImageUrl(value);
    if (imageUrl) return imageUrl;
  }
  return null;
}

function cleanup(now) {
  for (const [jid, timestamp] of lastRequestByChat) {
    if (now - timestamp > MIN_INTERVAL_MS * 6) lastRequestByChat.delete(jid);
  }
}

function transientStatus(status) {
  return [408, 425, 429, 500, 502, 503, 504, 522, 523, 524].includes(Number(status));
}

function errorStatus(error) {
  return Number(error?.response?.status || error?.status || 0);
}

function sendImageByUrl() {
  return process.env.NSFW_DIRECT_URL !== "false";
}

function transientNetworkError(error) {
  return transientStatus(errorStatus(error))
    || ["ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN", "ENETUNREACH"].includes(error?.code)
    || /timeout|timed out|socket hang up/i.test(String(error?.message || ""));
}

function settingMs(name, fallback, minimum, maximum) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}

function retryDelay(attempt, error) {
  const status = errorStatus(error);
  const base = status === 522 || status === 523 || status === 524 ? 1200 : 500;
  return base * (attempt + 1) + Math.floor(Math.random() * 250);
}

function friendlyApiError(error) {
  const status = errorStatus(error);
  if (status === 522 || status === 523 || status === 524) return `el servidor de imágenes no responde temporalmente (HTTP ${status})`;
  if (status === 429) return "el servidor de imágenes está limitando solicitudes (HTTP 429)";
  if (status >= 500) return `el servidor de imágenes respondió con HTTP ${status}`;
  if (transientNetworkError(error)) return "la conexión con el servidor de imágenes agotó el tiempo; inténtalo de nuevo";
  return error?.message || "error de API";
}

async function sendResolvedImage(imageUrl, command, context) {
  if (sendImageByUrl()) {
    try {
      await context.sendMessage(context.jid, {
        image: { url: imageUrl },
        caption: `Contenido para adultos: ${command}`,
      });
      return;
    } catch (directError) {
      // Some WhatsApp clients cannot fetch particular CDN URLs; retry locally with Axios.
      const imageBuffer = await downloadImage(imageUrl);
      await context.sendMessage(context.jid, {
        image: imageBuffer,
        caption: `Contenido para adultos: ${command}`,
      });
      return;
    }
  }
  const imageBuffer = await downloadImage(imageUrl);
  await context.sendMessage(context.jid, {
    image: imageBuffer,
    caption: `Contenido para adultos: ${command}`,
  });
}

async function requestImageUrl(apiUrl, type) {
  let lastError;
  const timeout = settingMs("NSFW_API_TIMEOUT_MS", 12_000, 5_000, 30_000);
  // Cloudflare 522 es temporal: reintentamos cuatro veces antes de probar otra URL.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const { data } = await axios.get(apiUrl, {
        params: { type },
        headers: { accept: "application/json", "user-agent": "WhatsAppMediaBot/1.0" },
        timeout,
      });
      const imageUrl = imageUrlFromApiResponse(data);
      if (!imageUrl) throw new Error("la API no devolvió una URL de imagen válida");
      return imageUrl;
    } catch (error) {
      lastError = error;
      if (!transientNetworkError(error) || attempt === 3) break;
      await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt, error)));
    }
  }
  throw lastError;
}

async function downloadImage(imageUrl) {
  let lastError;
  const timeout = settingMs("NSFW_IMAGE_TIMEOUT_MS", 30_000, 8_000, 90_000);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        headers: { accept: "image/*", "user-agent": "WhatsAppMediaBot/1.0" },
        timeout,
        maxContentLength: MAX_IMAGE_BYTES,
        maxBodyLength: MAX_IMAGE_BYTES,
      });
      const imageBuffer = Buffer.isBuffer(imageResponse.data)
        ? imageResponse.data
        : Buffer.from(imageResponse.data || "");
      if (!isImagePayload(imageBuffer, imageResponse.headers?.["content-type"] || "")) {
        throw new Error("la URL no devolvió una imagen válida");
      }
      return imageBuffer;
    } catch (error) {
      lastError = error;
      if (!transientNetworkError(error) || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt, error)));
    }
  }
  throw lastError;
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

  let lastError;
  for (const apiUrl of configuredApiUrls()) {
    try {
      const imageUrl = await requestImageUrl(apiUrl, type);
      await sendResolvedImage(imageUrl, command, context);
      return null;
    } catch (error) {
      lastError = error;
    }
  }
  // Un fallo temporal no debe bloquear el siguiente intento durante el rate limit.
  lastRequestByChat.delete(context.jid);
  return `No pude obtener esa imagen ahora: ${friendlyApiError(lastError)}`;
}
