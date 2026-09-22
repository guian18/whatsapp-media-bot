import axios from "axios";

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

function privateHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return ["localhost", "127.0.0.1", "::1"].includes(host)
    || /^10\./.test(host)
    || /^192\.168\./.test(host)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    || host.endsWith(".local")
    || host.endsWith(".internal");
}

function validPublicUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || privateHost(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function looksLikeVideo(buffer, contentType, url) {
  const mime = String(contentType || "").split(";", 1)[0].toLowerCase();
  if (mime.startsWith("video/")) return true;
  const header = Buffer.from(buffer || []).subarray(0, 64);
  return /\.(?:mp4|m4v|webm|mov|mkv|avi|ogv|ogg|3gp|ts)(?:$|[?#])/i.test(url)
    || header.includes(Buffer.from("ftyp"))
    || header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
    || header.subarray(0, 4).toString("latin1") === "RIFF";
}

export async function sendVideoFromUrl(urlValue, context = {}) {
  const url = validPublicUrl(urlValue);
  if (!url) return "Apify no devolvió una URL HTTP(S) pública válida.";
  if (!context.jid || typeof context.sendMessage !== "function") return "Este comando solo está disponible desde WhatsApp.";
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    headers: { accept: "video/*,application/octet-stream,*/*;q=0.8", "user-agent": process.env.VIDEO_USER_AGENT || "InfoPlayerLeft/1.0" },
    timeout: 60_000,
    maxContentLength: MAX_VIDEO_BYTES,
    maxBodyLength: MAX_VIDEO_BYTES,
  });
  const buffer = Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data || "");
  if (buffer.length > MAX_VIDEO_BYTES) return "El video supera el límite de 25 MB.";
  if (!looksLikeVideo(buffer, response.headers?.["content-type"], url)) return "El proveedor no devolvió un archivo de video compatible (puede ser M3U8).";
  await context.sendMessage(context.jid, {
    video: buffer,
    mimetype: response.headers?.["content-type"]?.split(";", 1)[0] || "video/mp4",
    caption: "Video enviado por proveedor externo",
  });
  return null;
}
