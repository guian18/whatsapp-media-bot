import axios from "axios";

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_SOURCE_PAGE_BYTES = 2 * 1024 * 1024;
const VIDEO_EXTENSIONS = /\.(?:mp4|m4v|webm|mov|mkv|avi)(?:$|[?#])/i;

function videoRequestHeaders(accept) {
  const headers = {
    accept,
    "user-agent": process.env.VIDEO_USER_AGENT || "InfoPlayerLeft/1.0",
  };
  const cookie = process.env.VIDEO_SOURCE_COOKIE;
  if (cookie) headers.cookie = cookie;
  return headers;
}

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

function isVideoContent(data, contentType = "", urlValue = "") {
  if (/^video\//i.test(contentType)) return true;
  const mime = String(contentType).split(";", 1)[0].trim().toLowerCase();
  if (["application/octet-stream", "binary/octet-stream"].includes(mime)) {
    const header = Buffer.from(data || []).subarray(0, 64);
    return header.includes(Buffer.from("ftyp")) ||
      header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) ||
      (header.subarray(0, 4).toString("latin1") === "RIFF" && header.subarray(8, 12).toString("latin1") === "AVI ") ||
      header.subarray(0, 4).equals(Buffer.from("OggS"));
  }
  const header = Buffer.from(data || []).subarray(0, 64).toString("latin1");
  return header.includes("ftyp") || header.startsWith("RIFF") || header.startsWith("\u001aE\u00df\u00a3") || header.startsWith("OggS") ||
    VIDEO_EXTENSIONS.test(urlValue);
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

export function extractVideoUrlsFromHtml(html, pageUrl) {
  const baseUrl = validVideoUrl(pageUrl);
  if (!baseUrl) return [];
  const found = new Set();
  const source = String(html || "");
  const mediaAttributePattern = /<(?:video|source)\b[^>]*?(?:src|data-src|data-video)\s*=\s*["']([^"']+)["'][^>]*>/gi;
  const linkAttributePattern = /(?:href|content|data-video)\s*=\s*["']([^"']+)["']/gi;
  const candidates = [
    ...[...source.matchAll(mediaAttributePattern)].map((match) => ({ value: match[1], requireExtension: false })),
    ...[...source.matchAll(linkAttributePattern)].map((match) => ({ value: match[1], requireExtension: true })),
  ];
  for (const { value, requireExtension } of candidates) {
    const raw = decodeHtmlAttribute(value);
    if (!raw || raw.startsWith("data:") || raw.startsWith("javascript:")) continue;
    try {
      const candidate = validVideoUrl(new URL(raw, baseUrl).toString());
      if (candidate && (!requireExtension || VIDEO_EXTENSIONS.test(candidate))) found.add(candidate);
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
    headers: videoRequestHeaders("text/html,application/xhtml+xml"),
    timeout: 15_000,
    maxContentLength: MAX_SOURCE_PAGE_BYTES,
    maxBodyLength: MAX_SOURCE_PAGE_BYTES,
  });
  return extractVideoUrlsFromHtml(html, pageUrl);
}

function browserConfigured() {
  return Boolean(process.env.VIDEO_BROWSER_EXECUTABLE_PATH || process.env.VIDEO_BROWSER_CDP_URL);
}

function cookieEntries(pageUrl) {
  const url = new URL(pageUrl);
  return String(process.env.VIDEO_SOURCE_COOKIE || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf("=");
      if (separator <= 0) return null;
      return {
        name: part.slice(0, separator).trim(),
        value: part.slice(separator + 1).trim(),
        domain: url.hostname,
        path: "/",
        secure: url.protocol === "https:",
      };
    })
    .filter(Boolean);
}

function browserExecutablePath() {
  return String(process.env.VIDEO_BROWSER_EXECUTABLE_PATH || "").trim();
}

async function launchVideoBrowser() {
  if (process.platform === "android") {
    throw new Error("el modo navegador Playwright no es compatible directamente con Node.js para Android; ejecuta el bot dentro de Kali/Linux o usa una API de video");
  }
  const { chromium } = await import("playwright-core");
  const cdpUrl = String(process.env.VIDEO_BROWSER_CDP_URL || "").trim();
  if (cdpUrl) return { browser: await chromium.connectOverCDP(cdpUrl), ownsBrowser: false };
  const executablePath = browserExecutablePath();
  if (!executablePath) throw new Error("falta VIDEO_BROWSER_EXECUTABLE_PATH o VIDEO_BROWSER_CDP_URL");
  return {
    browser: await chromium.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    }),
    ownsBrowser: true,
  };
}

async function browserVideoBuffer(pageUrl) {
  const { browser, ownsBrowser } = await launchVideoBrowser();
  let context;
  try {
    context = await browser.newContext({
      userAgent: process.env.VIDEO_USER_AGENT || undefined,
      viewport: { width: 1280, height: 900 },
    });
    const cookies = cookieEntries(pageUrl);
    if (cookies.length) await context.addCookies(cookies);
    const page = await context.newPage();
    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(Number(process.env.VIDEO_BROWSER_WAIT_MS || 3_000));
    const result = await page.evaluate(() => {
      const candidates = [
        ...Array.from(document.querySelectorAll("video"), (element) => element.currentSrc || element.src || element.dataset.src || ""),
        ...Array.from(document.querySelectorAll("source"), (element) => element.src || element.dataset.src || ""),
      ].filter(Boolean);
      const url = candidates[0];
      if (!url || url.startsWith("blob:") || url.startsWith("data:")) return { error: "no-direct-source" };
      return { url };
    });
    if (result.error) throw new Error(`el navegador no encontró un video directo (${result.error})`);
    const response = await context.request.get(result.url, {
      headers: { accept: "video/*" },
      timeout: 30_000,
      maxRedirects: 5,
    });
    if (!response.ok()) throw new Error(`video-http-${response.status()}`);
    const contentType = response.headers()["content-type"] || "application/octet-stream";
    const buffer = await response.body();
    if (buffer.length > MAX_VIDEO_BYTES) throw new Error("too-large");
    return {
      buffer,
      contentType,
      url: result.url,
    };
  } finally {
    await context?.close().catch(() => {});
    if (ownsBrowser) await browser.close().catch(() => {});
  }
}

export async function randomVideoUrl() {
  const urls = configuredVideoUrls();
  if (urls.length) return urls[Math.floor(Math.random() * urls.length)];

  const sourcePage = validVideoUrl(process.env.VIDEO_SOURCE_URL);
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
    headers: videoRequestHeaders("video/*"),
    timeout: 30_000,
    maxContentLength: MAX_VIDEO_BYTES,
    maxBodyLength: MAX_VIDEO_BYTES,
  });
  const contentLength = Number(response.headers?.["content-length"] || 0);
  const buffer = Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data || "");
  if (contentLength > MAX_VIDEO_BYTES || buffer.length > MAX_VIDEO_BYTES) return "El video supera el límite de 25 MB.";
  if (!isVideoContent(buffer, response.headers?.["content-type"] || "", url)) return "La URL no devolvió un video directo compatible. Usa un enlace .mp4 público.";
  await context.sendMessage(context.jid, {
    video: buffer,
    mimetype: response.headers?.["content-type"]?.split(";")[0] || "video/mp4",
    caption: "Video enviado desde URL",
  });
  return null;
}

async function sendVideoFromBrowser(pageUrl, context) {
  const result = await browserVideoBuffer(pageUrl);
  if (!isVideoContent(result.buffer, result.contentType, result.url)) {
    return "El navegador encontró un recurso, pero no devolvió un video compatible.";
  }
  await context.sendMessage(context.jid, {
    video: result.buffer,
    mimetype: result.contentType.split(";", 1)[0] || "video/mp4",
    caption: "Video enviado desde navegador automatizado",
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
  if (!context.jid || typeof context.sendMessage !== "function") return "Este comando solo está disponible desde WhatsApp.";
  try {
    const sourcePage = validVideoUrl(process.env.VIDEO_SOURCE_URL);
    if (sourcePage && browserConfigured()) return await sendVideoFromBrowser(sourcePage, context);
    const url = await randomVideoUrl();
    if (!url) return "No hay videos aleatorios configurados. Añade VIDEO_URLS, VIDEO_SOURCE_URL o VIDEO_API_URL en tu .env.";
    return await sendVideoUrl(url, context);
  } catch (error) {
    return `No pude obtener un video aleatorio: ${error?.message || "error de API"}`;
  }
}
