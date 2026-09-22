import axios from "axios";

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_SOURCE_PAGE_BYTES = 2 * 1024 * 1024;
const VIDEO_EXTENSIONS = /\.(?:mp4|m4v|webm|mov|mkv|avi|ogv|ogg|3gp|ts|flv)(?:$|[?#])/i;

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

function saveHubEnabled() {
  return process.env.VIDEO_SAVEHUB_ENABLED === "true";
}

function isPublicPornhubVideoPage(value) {
  try {
    const url = new URL(value);
    return /(?:^|\.)pornhub\.com$/i.test(url.hostname)
      && (/view_video\.php/i.test(url.pathname) || url.searchParams.has("viewkey"));
  } catch {
    return false;
  }
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

function extractSaveHubDownloadUrls(html, pageUrl) {
  const baseUrl = validVideoUrl(pageUrl);
  if (!baseUrl) return [];
  const found = new Set();
  const anchorPattern = /<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>/gi;
  for (const match of String(html || "").matchAll(anchorPattern)) {
    const attributes = `${match[1]} ${match[3]}`;
    if (!/(?:download|mp4|video|quality|resolution)/i.test(attributes)) continue;
    const raw = decodeHtmlAttribute(match[2]);
    try {
      const candidate = validVideoUrl(new URL(raw, baseUrl).toString());
      if (candidate) found.add(candidate);
    } catch {
      // Ignore non-HTTP download links.
    }
  }
  return [...found];
}

async function saveHubVideoUrls(pageUrl) {
  if (!saveHubEnabled() || !isPublicPornhubVideoPage(pageUrl)) return [];
  const endpoint = validVideoUrl(process.env.VIDEO_SAVEHUB_URL || "https://savehub.cc/d/");
  if (!endpoint) return [];
  const { data: html } = await axios.get(endpoint, {
    params: { url: pageUrl },
    responseType: "text",
    headers: videoRequestHeaders("text/html,application/xhtml+xml"),
    timeout: 20_000,
    maxContentLength: MAX_SOURCE_PAGE_BYTES,
    maxBodyLength: MAX_SOURCE_PAGE_BYTES,
  });
  return extractSaveHubDownloadUrls(html, endpoint);
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
      extraHTTPHeaders: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": process.env.VIDEO_ACCEPT_LANGUAGE || "es-ES,es;q=0.9,en;q=0.8",
        referer: pageUrl,
      },
    });
    const cookies = cookieEntries(pageUrl);
    if (cookies.length) await context.addCookies(cookies);
    const page = await context.newPage();
    const networkVideoUrls = [];
    page.on("response", async (response) => {
      const contentType = response.headers()["content-type"] || "";
      const responseUrl = validVideoUrl(response.url());
      if (responseUrl && (/^video\//i.test(contentType) || /mpegurl|x-mpegurl/i.test(contentType) || VIDEO_EXTENSIONS.test(responseUrl))) {
        networkVideoUrls.push(responseUrl);
      }
    });
    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(Number(process.env.VIDEO_BROWSER_WAIT_MS || 3_000));
    await page.waitForFunction(
      () => Boolean(document.querySelector("video, source, meta[property='og:video'], meta[property='og:video:url']")),
      { timeout: Math.max(1_000, Number(process.env.VIDEO_BROWSER_WAIT_MS || 3_000)) }
    ).catch(() => {});
    const result = await page.evaluate((networkUrls) => {
      const candidates = [
        ...Array.from(document.querySelectorAll("video"), (element) => element.currentSrc || element.src || element.dataset.src || element.dataset.video || element.dataset.mp4 || ""),
        ...Array.from(document.querySelectorAll("source"), (element) => element.src || element.dataset.src || element.dataset.video || element.dataset.mp4 || ""),
        ...Array.from(document.querySelectorAll("meta[property='og:video'], meta[property='og:video:url']"), (element) => element.content || ""),
        ...networkUrls,
      ].filter(Boolean);
      const url = candidates[0];
      if (!url || url.startsWith("blob:") || url.startsWith("data:")) return { error: "no-direct-source" };
      return { url };
    }, networkVideoUrls);
    if (result.error) throw new Error(`el navegador no encontró un video directo (${result.error})`);
    const response = await context.request.get(result.url, {
      headers: {
        accept: "video/*,application/octet-stream;q=0.9,*/*;q=0.8",
        referer: pageUrl,
      },
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
    headers: videoRequestHeaders("video/*,text/html,application/xhtml+xml,application/vnd.apple.mpegurl,*/*;q=0.8"),
    timeout: 30_000,
    maxContentLength: MAX_VIDEO_BYTES,
    maxBodyLength: MAX_VIDEO_BYTES,
  });
  const contentLength = Number(response.headers?.["content-length"] || 0);
  const buffer = Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data || "");
  if (contentLength > MAX_VIDEO_BYTES || buffer.length > MAX_VIDEO_BYTES) return "El video supera el límite de 25 MB.";
  if (!isVideoContent(buffer, response.headers?.["content-type"] || "", url)) {
    if (browserConfigured()) return await sendVideoFromBrowser(url, context);
    return "La URL no devolvió un video directo. Para extraer una página HTML activa Playwright en Kali con VIDEO_BROWSER_EXECUTABLE_PATH.";
  }
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
    const url = validVideoUrl(urlValue);
    if (!url) return "Uso: `!video <URL>` con un video o una página HTML pública.";
    const saveHubUrls = await saveHubVideoUrls(url);
    if (saveHubUrls.length) return await sendVideoUrl(saveHubUrls[0], context);
    return await sendVideoUrl(url, context);
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
