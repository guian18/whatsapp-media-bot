import axios from "axios";

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_SOURCE_PAGE_BYTES = 2 * 1024 * 1024;
const VIDEO_EXTENSIONS = /\.(?:mp4|m4v|webm|mov|mkv|avi)(?:$|[?#])/i;

function isPrivateHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (["localhost", "127.0.0.1", "::1"].includes(host)) return true;
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  return host.endsWith(".local") || host.endsWith(".internal");
}

export function validVideoUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password || isPrivateHost(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isVideoContent(data, contentType = "") {
  if (/^video\//i.test(contentType)) return true;
  const header = Buffer.from(data || []).subarray(0, 12).toString("latin1");
  return header.includes("ftyp") || header.startsWith("RIFF");
}

function configuredVideoUrls() {
  return String(process.env.VIDEO_URLS || "")
    .split(",")
    .map((value) => validVideoUrl(value.trim()))
    .filter(Boolean);
}

function decodeHtmlAttribute(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;|&#39;/gi, "'")
    .replace(/&#x2F;|&#47;/gi, "/")
    .replace(/\\\//g, "/")
    .trim();
}

/**
 * Extracts direct video links from common HTML media attributes.
 * Relative URLs are resolved against the configured page URL.
 */
export function extractVideoUrlsFromHtml(html, pageUrl) {
  const baseUrl = validVideoUrl(pageUrl);
  if (!baseUrl) return [];
  const found = new Set();
  const attributePattern = /(?:src|href|data-src|data-video|content)\s*=\s*["']([^"']+)["']/gi;
  for (const match of String(html || "").matchAll(attributePattern)) {
    const raw = decodeHtmlAttribute(match[1]);
    if (!raw || raw.startsWith("data:") || raw.startsWith("javascript:")) continue;
    try {
      const candidate = validVideoUrl(new URL(raw, baseUrl).toString());
      if (candidate && VIDEO_EXTENSIONS.test(candidate)) found.add(candidate);
    } catch {
      // Ignore malformed or non-HTTP links exposed by the page.
    }
  }
  return [...found];
}

function urlFromApiResponse(data) {
  const candidate = data?.url || data?.video || data?.message || data?.result?.url || data?.data?.url;
  return validVideoUrl(candidate);
}

async function videoUrlsFromPage(pageUrl) {
  const { data: html } = await axios.get(pageUrl, {
    responseType: "text",
    headers: { accept: "text/html,application/xhtml+xml", "user-agent": "InfoPlayerLeft/1.0" },
    timeout: 15_000,
    maxContentLength: MAX_SOURCE_PAGE_BYTES,
    maxBodyLength: MAX_SOURCE_PAGE_BYTES,
  });
  return extractVideoUrlsFromHtml(html, pageUrl);
}

export async function randomVideoUrl() {
  const urls = configuredVideoUrls();
  if (urls.length) return urls[Math.floor(Math.random() * urls.length)];

  const sourcePage = validVideoUrl(process.env.VIDEO_SOURCE_URL || process.env.VIDEO_PAGE_URL);
  if (sourcePage) {
    const pageVideos = await videoUrlsFromPage(sourcePage);
    if (pageVideos.length) return pageVideos[Math.floor(Math.random() * pageVideos.length)];
  }

  const apiUrl = validVideoUrl(process.env.VIDEO_API_URL);
  if (!apiUrl) return null;
  const { data } = await axios.get(apiUrl, {
    headers: { accept: "application/json", "user-agent": "InfoPlayerLeft/1.0" },
    timeout: 15_000,
    maxContentLength: MAX_SOURCE_PAGE_BYTES,
    maxBodyLength: MAX_SOURCE_PAGE_BYTES,
  });
  return urlFromApiResponse(data);
}

async function sendVideoUrl(urlValue, context = {}) {
  const url = validVideoUrl(urlValue);
  if (!url) return "Uso: `!video` para uno aleatorio o `!video https://dominio.com/video.mp4` para una URL directa.";
  if (!context.jid || typeof context.sendMessage !== "function") {
    return "Este comando solo está disponible desde WhatsApp.";
  }

  const response = await axios.get(url, {
    responseType: "arraybuffer",
    headers: { accept: "video/*", "user-agent": "InfoPlayerLeft/1.0" },
    timeout: 30_000,
    maxContentLength: MAX_VIDEO_BYTES,
    maxBodyLength: MAX_VIDEO_BYTES,
  });
  const contentLength = Number(response.headers?.["content-length"] || 0);
  const buffer = Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data || "");
  if (contentLength > MAX_VIDEO_BYTES || buffer.length > MAX_VIDEO_BYTES) {
    return "El video supera el límite de 25 MB.";
  }
  if (!isVideoContent(buffer, response.headers?.["content-type"] || "")) {
    return "La URL no devolvió un video directo compatible. Usa un enlace .mp4 público.";
  }
  await context.sendMessage(context.jid, {
    video: buffer,
    mimetype: response.headers?.["content-type"]?.split(";")[0] || "video/mp4",
    caption: "Video enviado desde URL",
  });
  return null;
}

export async function sendVideoFromUrl(urlValue, context = {}) {
  try {
    return await sendVideoUrl(urlValue, context);
  } catch (error) {
    return `No pude descargar el video: ${error?.message || "error de red"}`;
  }
}

export async function sendRandomVideo(context = {}) {
  if (!context.jid || typeof context.sendMessage !== "function") {
    return "Este comando solo está disponible desde WhatsApp.";
  }
  try {
    const url = await randomVideoUrl();
    if (!url) {
      return "No hay videos aleatorios configurados. Añade VIDEO_URLS, VIDEO_SOURCE_URL o VIDEO_API_URL en tu .env.";
    }
    return await sendVideoUrl(url, context);
  } catch (error) {
    return `No pude obtener un video aleatorio: ${error?.message || "error de API"}`;
  }
}

export const VIDEO_LIMIT_BYTES = MAX_VIDEO_BYTES;
