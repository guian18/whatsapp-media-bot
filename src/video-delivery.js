import axios from "axios";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

// WhatsApp clients commonly reject larger media even when the upload succeeds.
const MAX_VIDEO_BYTES = 16 * 1024 * 1024;
const execFileAsync = promisify(execFile);

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

function isPlaylist(buffer, contentType, url) {
  const mime = String(contentType || "").toLowerCase();
  return /mpegurl|m3u8/i.test(mime)
    || /\.m3u8(?:$|[?#])/i.test(url)
    || Buffer.from(buffer || []).subarray(0, 32).toString("utf8").startsWith("#EXTM3U");
}

async function convertPlaylist(url) {
  const ffmpeg = String(process.env.FFMPEG_PATH || "ffmpeg").trim();
  const workDir = await mkdtemp(path.join(tmpdir(), "infoplayerleft-apify-"));
  const output = path.join(workDir, "video.mp4");
  try {
    await execFileAsync(ffmpeg, [
      "-y", "-i", url,
      "-vf", "scale=min(720\,iw):-2",
      "-c:v", "libx264", "-preset", "veryfast", "-b:v", "650k", "-maxrate", "650k", "-bufsize", "1300k", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", output,
    ], {
      timeout: Number(process.env.FFMPEG_TIMEOUT_MS || 180_000),
      maxBuffer: 2 * 1024 * 1024,
    });
    const buffer = await readFile(output);
    if (!buffer.length || buffer.length > MAX_VIDEO_BYTES) throw new Error("ffmpeg produjo un archivo vacío o mayor de 16 MB; reduce la duración del video");
    return buffer;
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error("Apify devolvió M3U8; instala ffmpeg o configura FFMPEG_PATH");
    throw new Error(error?.stderr?.trim() || error?.message || "no se pudo convertir el M3U8 con ffmpeg");
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
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
  if (buffer.length > MAX_VIDEO_BYTES) return "El video supera el límite compatible de 16 MB para WhatsApp.";
  const contentType = response.headers?.["content-type"] || "";
  const output = isPlaylist(buffer, contentType, url) ? await convertPlaylist(url) : buffer;
  if (!looksLikeVideo(output, "video/mp4", url)) return "El proveedor no devolvió un archivo de video compatible.";
  await context.sendMessage(context.jid, {
    video: output,
    mimetype: "video/mp4",
    caption: "Video enviado por proveedor externo",
  });
  return null;
}
