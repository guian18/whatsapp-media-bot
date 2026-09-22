import axios from "axios";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

function publicVideoUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (['localhost', '127.0.0.1', '::1'].includes(host) || host.endsWith('.local') || host.endsWith('.internal')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function extractVideoUrl(item) {
  const candidates = [item?.video_download, item?.video_url, item?.download_url, item?.url];
  for (const candidate of candidates) {
    const url = publicVideoUrl(candidate);
    if (url) return url;
  }
  return null;
}

function apifyError(error, fallback) {
  const status = error?.response?.status;
  const detail = error?.response?.data?.error?.message || error?.response?.data?.message;
  if (status) return `${fallback} (HTTP ${status}${detail ? `: ${detail}` : ""})`;
  return error?.message || fallback;
}

export async function apifyVideoUrl(pageUrl) {
  const token = String(process.env.APIFY_API_TOKEN || '').trim();
  if (!token) throw new Error('falta APIFY_API_TOKEN en .env');
  const actorId = String(process.env.APIFY_ACTOR_ID || 'pintxuki/pornhub-video-downloader').trim();
  const encodedActor = actorId.split('/').map(encodeURIComponent).join('~');
  const input = {
    startUrls: [{ url: pageUrl }],
    maxRequestsPerCrawl: 1,
  };
  if (/^true$/i.test(String(process.env.APIFY_USE_PROXY || 'false'))) {
    input.proxyConfiguration = { useApifyProxy: true };
  }
  const run = await axios.post(`https://api.apify.com/v2/acts/${encodedActor}/runs`, input, {
    params: { token, waitForFinish: 120 },
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    timeout: 150_000,
  }).catch((error) => {
    throw new Error(apifyError(error, 'Apify rechazó el inicio del actor'));
  });
  const datasetId = run.data?.data?.defaultDatasetId;
  if (!datasetId) throw new Error('Apify no devolvió un dataset');
  const { data: items } = await axios.get(`https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items`, {
    params: { token, clean: true, format: 'json' },
    timeout: 30_000,
  }).catch((error) => {
    throw new Error(apifyError(error, 'Apify no pudo leer el dataset'));
  });
  const item = Array.isArray(items) ? items[0] : items;
  const url = extractVideoUrl(item);
  if (!url) throw new Error('Apify no devolvió una URL de video compatible');
  return url;
}

export async function phubVideoFile(pageUrl) {
  const python = String(process.env.PHUB_PYTHON || 'python3').trim();
  const script = path.resolve(process.env.PHUB_SCRIPT || 'scripts/phub_download.py');
  const workDir = await mkdtemp(path.join(tmpdir(), 'infoplayerleft-phub-'));
  const output = path.join(workDir, 'video.mp4');
  try {
    await execFileAsync(python, [script, pageUrl, output], {
      timeout: Number(process.env.PHUB_TIMEOUT_MS || 180_000),
      maxBuffer: 2 * 1024 * 1024,
    });
    const buffer = await readFile(output);
    if (!buffer.length || buffer.length > MAX_VIDEO_BYTES) {
      throw new Error('PHUB produjo un archivo vacío o mayor de 25 MB');
    }
    return buffer;
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error(`no se encontró ${python} o el script PHUB`);
    throw new Error(error?.stderr?.trim() || error?.message || 'PHUB no pudo descargar el video');
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
