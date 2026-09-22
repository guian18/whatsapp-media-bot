import axios from "axios";

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

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

export async function sendVideoFromUrl(urlValue, context = {}) {
  const url = validVideoUrl(urlValue);
  if (!url) return "Uso: `!video https://dominio.com/video.mp4` (solo URLs públicas HTTP/HTTPS).";
  if (!context.jid || typeof context.sendMessage !== "function") {
    return "Este comando solo está disponible desde WhatsApp.";
  }

  try {
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
  } catch (error) {
    return `No pude descargar el video: ${error?.message || "error de red"}`;
  }
}
