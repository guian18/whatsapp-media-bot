import axios from "axios";

const NEKOBOT_API_URL = "https://nekobot.xyz/api/image";
const WAIFU_IM_API_URL = "https://api.waifu.im/images";
const DEFAULT_API_SOURCES = Object.freeze(["waifuim", "nekobot"]);
const WAIFU_IM_API_VERSION = "v7";
const WAIFU_IM_EXCLUDED_TAGS = Object.freeze(["loli", "shota"]);
const MIN_INTERVAL_MS = 10_000;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const lastRequestByChat = new Map();

// Waifu.im es un respaldo para Nekobot. No dispone de una etiqueta equivalente
// para todas las categorías, por lo que en esos casos devuelve una imagen NSFW
// aleatoria en lugar de fallar el comando.
const WAIFU_IM_TAGS = Object.freeze({
  anal: "hentai",
  ass: "ass",
  blowjob: "oral",
  boobs: "oppai",
  gonewild: "ero",
  hass: "ero",
  hboobs: "oppai",
  hentai: "hentai",
  hentaianal: "hentai",
  lewd: "ero",
  lewdneko: "waifu",
  paizuri: "paizuri",
  pussy: "hentai",
  yaoi: "hentai",
});

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

function settingMs(name, fallback, minimum, maximum) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}

function settingInteger(name, fallback, minimum, maximum) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}

function sourceFromValue(value) {
  const raw = String(value || "").trim();
  const normalized = raw.toLowerCase();
  if (normalized === "nekobot" || normalized === NEKOBOT_API_URL) {
    return { id: "nekobot", name: "Nekobot", url: NEKOBOT_API_URL };
  }
  if (normalized === "waifuim" || normalized === "waifu.im" || normalized === WAIFU_IM_API_URL) {
    return { id: "waifuim", name: "Waifu.im", url: WAIFU_IM_API_URL };
  }
  return { id: "custom", name: "API configurada", url: raw };
}

function configuredApiSources() {
  const explicitSources = String(process.env.NSFW_API_URLS || "").trim();
  const legacySource = String(process.env.NSFW_API_URL || "").trim();
  const configured = explicitSources
    ? explicitSources.split(",")
    : legacySource
      ? [legacySource]
      : DEFAULT_API_SOURCES;
  const sources = configured
    .map(sourceFromValue)
    .filter((source) => source.url);

  // Instalaciones previas solo tenían Nekobot configurado. Conservamos ese valor
  // y añadimos el respaldo seguro automáticamente sin exigir editar el .env.
  if (!explicitSources && sources.length === 1 && sources[0].id === "nekobot") {
    sources.push(sourceFromValue("waifuim"));
  }

  return [...new Map(sources.map((source) => [`${source.id}:${source.url}`, source])).values()];
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

function isTrustedImageHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return host === "nekobot.xyz"
    || host.endsWith(".nekobot.xyz")
    || host === "waifu.im"
    || host.endsWith(".waifu.im");
}

function isPrivateIpv4(hostname) {
  const parts = String(hostname || "").split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const values = parts.map(Number);
  if (values.some((part) => part > 255)) return true;
  const [a, b] = values;
  return a === 0
    || a === 10
    || a === 127
    || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19));
}

function isPrivateHost(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  return host === "localhost"
    || host.endsWith(".localhost")
    || host === "::"
    || host === "::1"
    || host.startsWith("fc")
    || host.startsWith("fd")
    || host.startsWith("fe80:")
    || host.startsWith("::ffff:127.")
    || isPrivateIpv4(host);
}

export function validImageUrl(value) {
  try {
    const url = new URL(value);
    const isHttp = url.protocol === "http:" || url.protocol === "https:";
    if (!isHttp || url.username || url.password || isPrivateHost(url.hostname)) return null;
    const allowExternal = process.env.NSFW_ALLOW_EXTERNAL_URLS !== "false";
    const isTrusted = url.protocol === "https:" && isTrustedImageHost(url.hostname);
    const isApprovedExternal = allowExternal && url.protocol === "https:";
    return (isTrusted || isApprovedExternal) ? url.toString() : null;
  } catch {
    return null;
  }
}

function isImagePayload(data, contentType = "") {
  if (!data || !Buffer.isBuffer(data) || data.length < 12) return false;
  if (/^image\//i.test(contentType)) return true;
  return (
    data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    || data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    || data.subarray(0, 6).toString("ascii") === "GIF87a"
    || data.subarray(0, 6).toString("ascii") === "GIF89a"
    || (data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP")
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

function imageFromWaifuImResponse(data) {
  const item = Array.isArray(data?.items) ? data.items[0] : null;
  if (!item?.isNsfw) throw providerError(502, "Waifu.im devolvió una imagen que no está marcada como NSFW");
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const tagNames = tags
    .map((tag) => String(tag?.slug || tag?.name || "").trim().toLowerCase())
    .filter(Boolean);
  if (WAIFU_IM_EXCLUDED_TAGS.some((tag) => tagNames.includes(tag))) {
    throw providerError(502, "Waifu.im devolvió una etiqueta excluida");
  }
  const url = validImageUrl(item.url);
  if (!url) throw providerError(502, "Waifu.im no devolvió una URL de imagen válida");
  return { url, source: "Waifu.im" };
}

function providerError(status, message) {
  const error = new Error(message);
  error.response = { status: Number(status) || 0 };
  return error;
}

function cleanup(now) {
  for (const [jid, timestamp] of lastRequestByChat) {
    if (now - timestamp > MIN_INTERVAL_MS * 6) lastRequestByChat.delete(jid);
  }
}

function transientStatus(status) {
  return [408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524].includes(Number(status));
}

function errorStatus(error) {
  return Number(error?.response?.status || error?.status || 0);
}

function sendImageByUrl() {
  // Descargar primero permite validar el tamaño y el tipo de archivo, y evita
  // que Baileys oculte errores HTTP del CDN al resolver la URL remota.
  return process.env.NSFW_DIRECT_URL === "true";
}

function transientNetworkError(error) {
  return transientStatus(errorStatus(error))
    || ["ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN", "ENETUNREACH"].includes(error?.code)
    || /timeout|timed out|socket hang up/i.test(String(error?.message || ""));
}

function retryAfterMs(error) {
  const value = error?.response?.headers?.["retry-after"];
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.min(seconds * 1000, 5_000);
}

function retryDelay(attempt, error) {
  const fromHeader = retryAfterMs(error);
  if (fromHeader) return fromHeader;
  const status = errorStatus(error);
  const base = status === 522 || status === 523 || status === 524 ? 900 : 400;
  return base * (attempt + 1) + Math.floor(Math.random() * 200);
}

function friendlyApiError(error, source) {
  const status = errorStatus(error);
  const provider = source?.name || "el servidor de imágenes";
  if (status === 401 || status === 403) return `${provider} rechazó la solicitud (HTTP ${status})`;
  if (status === 404) return `${provider} no tiene una imagen disponible para esa categoría (HTTP 404)`;
  if (status === 408 || status === 522 || status === 523 || status === 524) return `${provider} no respondió a tiempo (HTTP ${status})`;
  if (status === 429) return `${provider} está limitando solicitudes (HTTP 429)`;
  if (status >= 500) return `${provider} respondió temporalmente con HTTP ${status}`;
  if (transientNetworkError(error)) return `la conexión con ${provider} agotó el tiempo; inténtalo de nuevo`;
  return `${provider}: ${String(error?.message || "error de API").slice(0, 160)}`;
}

async function sendResolvedImage(imageUrl, command, context, sourceName) {
  const sourceCaption = sourceName ? ` · Fuente: ${sourceName}` : "";
  if (sendImageByUrl()) {
    try {
      await context.sendMessage(context.jid, {
        image: { url: imageUrl },
        caption: `Contenido para adultos: ${command}${sourceCaption}`,
      });
      return;
    } catch {
      // Algunos clientes no pueden descargar determinados CDN; se reintenta con
      // un buffer validado por el bot.
    }
  }
  const imageBuffer = await downloadImage(imageUrl);
  await context.sendMessage(context.jid, {
    image: imageBuffer,
    caption: `Contenido para adultos: ${command}${sourceCaption}`,
  });
}

async function requestImageUrl(source, type) {
  const timeout = settingMs("NSFW_API_TIMEOUT_MS", 10_000, 5_000, 30_000);
  const retries = settingInteger("NSFW_API_RETRIES", 1, 0, 3);
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const request = source.id === "waifuim"
        ? {
            params: new URLSearchParams([
              ["IsNsfw", "True"],
              ["PageSize", "1"],
              ...(WAIFU_IM_TAGS[type] ? [["IncludedTags", WAIFU_IM_TAGS[type]]] : []),
              ...WAIFU_IM_EXCLUDED_TAGS.map((tag) => ["ExcludedTags", tag]),
            ]),
            headers: {
              accept: "application/json",
              "accept-version": WAIFU_IM_API_VERSION,
              "user-agent": "WhatsAppMediaBot/1.0",
            },
            timeout,
          }
        : {
            params: { type },
            headers: { accept: "application/json", "user-agent": "WhatsAppMediaBot/1.0" },
            timeout,
          };
      const { data } = await axios.get(source.url, request);
      if (data?.success === false || Number(data?.status) >= 400) {
        throw providerError(data?.status, String(data?.message || "la API rechazó la solicitud"));
      }
      if (source.id === "waifuim") return imageFromWaifuImResponse(data);
      const imageUrl = imageUrlFromApiResponse(data);
      if (!imageUrl) throw providerError(502, "la API no devolvió una URL de imagen válida");
      return { url: imageUrl, source: source.name };
    } catch (error) {
      lastError = error;
      if (!transientNetworkError(error) || attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt, error)));
    }
  }
  throw lastError;
}

async function downloadImage(imageUrl) {
  const timeout = settingMs("NSFW_IMAGE_TIMEOUT_MS", 30_000, 8_000, 90_000);
  const retries = settingInteger("NSFW_IMAGE_RETRIES", 1, 0, 2);
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        headers: { accept: "image/*", "user-agent": "WhatsAppMediaBot/1.0" },
        timeout,
        maxContentLength: MAX_IMAGE_BYTES,
        maxBodyLength: MAX_IMAGE_BYTES,
        maxRedirects: 3,
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
      if (!transientNetworkError(error) || attempt === retries) break;
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

  let lastFailure;
  for (const source of configuredApiSources()) {
    try {
      const image = await requestImageUrl(source, type);
      await sendResolvedImage(image.url, command, context, image.source);
      return null;
    } catch (error) {
      lastFailure = { error, source };
      console.warn(`NSFW: ${source.name} falló para ${command}:`, error?.message || error);
    }
  }
  // Un fallo temporal no debe bloquear el siguiente intento durante el rate limit.
  lastRequestByChat.delete(context.jid);
  return `No pude obtener esa imagen ahora: ${friendlyApiError(lastFailure?.error, lastFailure?.source)}`;
}
