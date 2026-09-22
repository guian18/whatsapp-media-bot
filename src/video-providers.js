import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export async function phubVideoFile(pageUrl) {
  const python = String(process.env.PHUB_PYTHON || "python3").trim();
  const script = path.resolve(process.env.PHUB_SCRIPT || "scripts/phub_download.py");
  const workDir = await mkdtemp(path.join(tmpdir(), "infoplayerleft-phub-"));
  const output = path.join(workDir, "video.mp4");
  try {
    await execFileAsync(python, [script, pageUrl, output], {
      timeout: Number(process.env.PHUB_TIMEOUT_MS || 180_000),
      maxBuffer: 2 * 1024 * 1024,
    });
    const buffer = await readFile(output);
    if (!buffer.length || buffer.length > MAX_VIDEO_BYTES) {
      throw new Error("PHUB produjo un archivo vacío o mayor de 25 MB");
    }
    return buffer;
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`no se encontró ${python} o el script PHUB`);
    throw new Error(error?.stderr?.trim() || error?.message || "PHUB no pudo descargar el video");
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
