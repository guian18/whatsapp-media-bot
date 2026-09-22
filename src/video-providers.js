import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const TARGET_VIDEO_BYTES = 24.5 * 1024 * 1024;
const MAX_ERROR_LENGTH = 900;

async function fitWhatsAppLimit(input, workDir) {
  const original = await stat(input);
  if (original.size <= MAX_VIDEO_BYTES) return readFile(input);

  const ffmpeg = String(process.env.PHUB_FFMPEG_PATH || "ffmpeg").trim();
  const profiles = [
    { name: "480p", scale: "scale=-2:480", videoBitrate: "450k", audioBitrate: "64k" },
    { name: "360p", scale: "scale=-2:360", videoBitrate: "280k", audioBitrate: "48k" },
  ];
  let lastError = null;
  for (const profile of profiles) {
    const candidate = path.join(workDir, `whatsapp-${profile.name}.mp4`);
    try {
      await execFileAsync(ffmpeg, [
        "-y", "-i", input,
        "-vf", profile.scale,
        "-c:v", "libx264", "-preset", "veryfast", "-b:v", profile.videoBitrate,
        "-c:a", "aac", "-b:a", profile.audioBitrate,
        "-movflags", "+faststart", candidate,
      ], { timeout: 180_000, maxBuffer: 512 * 1024 });
      const result = await stat(candidate);
      if (result.size > 0 && result.size <= TARGET_VIDEO_BYTES) return readFile(candidate);
      lastError = new Error(`${profile.name}: el archivo comprimido sigue superando 25 MB`);
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError?.code === "ENOENT") {
    throw new Error("el vídeo supera 25 MB y no se encontró ffmpeg para comprimirlo; instala ffmpeg en Termux");
  }
  throw new Error("el vídeo supera 25 MB incluso después de comprimirlo; usa PHUB_QUALITY=worst o un vídeo más corto");
}

async function assertMaxDuration(input, maxDurationSeconds) {
  if (!maxDurationSeconds) return;
  const ffprobe = String(process.env.PHUB_FFPROBE_PATH || "ffprobe").trim();
  try {
    const { stdout } = await execFileAsync(ffprobe, [
      "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", input,
    ], { timeout: 30_000, maxBuffer: 64 * 1024 });
    const duration = Number.parseFloat(String(stdout).trim());
    if (!Number.isFinite(duration)) throw new Error("no se pudo leer la duración");
    if (duration > maxDurationSeconds) throw new Error(`el vídeo dura ${Math.ceil(duration)} segundos y supera el límite de ${maxDurationSeconds} segundos`);
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error("el modo por duración requiere ffprobe; instala ffmpeg en Termux");
    throw error;
  }
}

export async function phubVideoFile(pageUrl, options = {}) {
  const python = String(process.env.PHUB_PYTHON || "python3").trim();
  const script = path.resolve(process.env.PHUB_SCRIPT || "scripts/phub_download.py");
  const workDir = await mkdtemp(path.join(tmpdir(), "whatsapp-media-bot-phub-"));
  const output = path.join(workDir, "video.mp4");
  try {
    await execFileAsync(python, [script, pageUrl, output], {
      timeout: Number(process.env.PHUB_TIMEOUT_MS || 180_000),
      maxBuffer: 2 * 1024 * 1024,
    });
    await assertMaxDuration(output, options.maxDurationSeconds);
    const buffer = await fitWhatsAppLimit(output, workDir);
    if (!buffer.length) throw new Error("PHUB produjo un archivo vacío");
    return buffer;
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`no se encontró ${python} o el script PHUB`);
    const raw = String(error?.stderr || error?.message || "PHUB no pudo descargar el video").trim();
    const timeout = error?.code === "ETIMEDOUT" || /timed out|timeout|curl: \(28\)/i.test(raw);
    const detail = raw.replace(/\s+/g, " ").slice(0, MAX_ERROR_LENGTH);
    throw new Error(timeout
      ? `la descarga agotó el tiempo. Prueba PHUB_QUALITY=worst o aumenta PHUB_TIMEOUT_MS; detalle: ${detail}`
      : detail || "PHUB no pudo descargar el video");
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function xvideosVideoFile(pageUrl, options = {}) {
  const python = String(process.env.XVIDEOS_PYTHON || "python3").trim();
  const script = path.resolve(process.env.XVIDEOS_SCRIPT || "scripts/xvideos_download.py");
  const workDir = await mkdtemp(path.join(tmpdir(), "whatsapp-media-bot-xvideos-"));
  const output = path.join(workDir, "video.mp4");
  try {
    await execFileAsync(python, [script, pageUrl, output], {
      timeout: Number(process.env.XVIDEOS_TIMEOUT_MS || 180_000),
      maxBuffer: 2 * 1024 * 1024,
    });
    await assertMaxDuration(output, options.maxDurationSeconds);
    const buffer = await fitWhatsAppLimit(output, workDir);
    if (!buffer.length) throw new Error("xvideos-dl produjo un archivo vacío");
    return buffer;
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`no se encontró ${python}, xvideos-dl o el script adaptador`);
    const raw = String(error?.stderr || error?.message || "xvideos-dl no pudo descargar el video").trim();
    const detail = raw.replace(/\s+/g, " ").slice(0, MAX_ERROR_LENGTH);
    throw new Error(detail || "xvideos-dl no pudo descargar el video");
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
