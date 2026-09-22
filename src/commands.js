// Lógica de comandos, independiente de WhatsApp: cada uno devuelve texto plano.
import axios from "axios";
import { cmdIA, cmdIdioma, cmdProveedor, cmdTono } from "./ai.js";
import { NSFW_COMMANDS, nsfwHelp, sendNsfwImage } from "./nsfw.js";
import { phubVideoFile, xvideosVideoFile } from "./video-providers.js";
import { commandDisplayName, resolveCommandAlias } from "./command-aliases.js";

const MAX_RESULTS = 8;
const ANIME_API = "https://nekos.best/api/v2/neko?amount=1";

async function sendSfwAnimeImage(context) {
  if (!context.jid || typeof context.sendMessage !== "function") {
    return "Este comando solo está disponible desde WhatsApp.";
  }
  try {
    const { data: body } = await axios.get(ANIME_API, {
      headers: {
        accept: "application/json",
        "user-agent": "WhatsAppMediaBot/1.0",
      },
      timeout: 15_000,
    });
    const image = body?.results?.[0];
    if (!image?.url || !/^https:\/\//i.test(image.url)) throw new Error("respuesta SFW sin imagen válida");
    await context.sendMessage(context.jid, {
      image: { url: image.url },
      caption: `Anime SFW${image.anime_name ? ` — ${image.anime_name}` : ""}`,
    });
    return null;
  } catch (error) {
    return `No pude obtener una imagen SFW de anime ahora: ${error.message}`;
  }
}

function publicPageUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (["localhost", "127.0.0.1", "::1"].includes(host) || host.endsWith(".local") || host.endsWith(".internal")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function sendPhubVideo(args, context) {
  const durationLimit = randomDurationLimit(args);
  if (durationLimit) return sendRandomVideo("phub", durationLimit, context);
  if (String(args || "").trim().toLowerCase().includes("min")) return "Uso: `!phub 2minutos` o `!phub 4minutos`";
  const pageUrl = publicPageUrl(args);
  if (!pageUrl) return "Uso: `!phub <URL pública>`";
  if (process.env.PHUB_ENABLED !== "true") return "PHUB está desactivado. Configura PHUB_ENABLED=true solo si instalaste la biblioteca PHUB.";
  if (!context.jid || typeof context.sendMessage !== "function") return "Este comando solo está disponible desde WhatsApp.";
  try {
    await context.sendMessage(context.jid, { text: "⏳ PHUB está preparando el video; espera hasta 3 minutos..." });
    const buffer = await phubVideoFile(pageUrl);
    await context.sendMessage(context.jid, {
      video: buffer,
      mimetype: "video/mp4",
      caption: "Video enviado mediante PHUB",
    });
    return null;
  } catch (error) {
    return `No pude obtener el video con PHUB: ${error?.message || "error del proveedor"}`;
  }
}

async function sendXvideosVideo(args, context) {
  const durationLimit = randomDurationLimit(args);
  if (durationLimit) return sendRandomVideo("xvideos", durationLimit, context);
  if (String(args || "").trim().toLowerCase().includes("min")) return "Uso: `!xvideos 2minutos` o `!xvideos 4minutos`";
  let pageUrl;
  try {
    pageUrl = new URL(String(args || "").trim());
  } catch {
    return "Uso: `!xvideos <URL de xvideos.com>`";
  }
  const host = pageUrl.hostname.toLowerCase();
  if (!["xvideos.com", "www.xvideos.com"].includes(host) && !host.endsWith(".xvideos.com")) {
    return "!xvideos solo acepta URLs de xvideos.com.";
  }
  if (!["http:", "https:"].includes(pageUrl.protocol) || pageUrl.username || pageUrl.password) {
    return "Uso: `!xvideos <URL HTTP(S) pública de xvideos.com>`";
  }
  if (process.env.XVIDEOS_ENABLED !== "true") return "xvideos está desactivado. Configura XVIDEOS_ENABLED=true.";
  if (!context.jid || typeof context.sendMessage !== "function") return "Este comando solo está disponible desde WhatsApp.";
  try {
    await context.sendMessage(context.jid, { text: "⏳ xvideos-dl está preparando el video; espera unos minutos..." });
    const buffer = await xvideosVideoFile(pageUrl.toString());
    await context.sendMessage(context.jid, {
      video: buffer,
      mimetype: "video/mp4",
      caption: "Video enviado mediante xvideos-dl",
    });
    return null;
  } catch (error) {
    return `No pude obtener el video con xvideos-dl: ${error?.message || "error del proveedor"}`;
  }
}

function randomDurationLimit(value) {
  const match = String(value || "").trim().toLowerCase().match(/^(2|4)\s*(?:minutos?|min)$/);
  return match ? Number(match[1]) * 60 : null;
}

function configuredRandomUrls(provider) {
  const key = provider === "phub" ? "PHUB_RANDOM_URLS" : "XVIDEOS_RANDOM_URLS";
  return String(process.env[key] || "").split(",").map((url) => url.trim()).filter(Boolean);
}

async function discoverRandomUrls(provider) {
  const searchUrl = provider === "phub"
    ? process.env.PHUB_RANDOM_SEARCH_URL || "https://www.pornhub.com/video/search?search=amateur"
    : process.env.XVIDEOS_RANDOM_SEARCH_URL || "https://www.xvideos.com/?k=amateur";
  try {
    const { data } = await axios.get(searchUrl, {
      headers: { accept: "text/html", "user-agent": "WhatsAppMediaBot/1.0" },
      timeout: 15_000,
      maxContentLength: 3 * 1024 * 1024,
    });
    const pattern = provider === "phub"
      ? /(?:https?:\/\/[^"'\s]+)?\/view_video\.php\?viewkey=[a-zA-Z0-9]+/g
      : /(?:https?:\/\/[^"'\s]+)?\/video\d+[^"'\s<]*/g;
    const urls = [];
    for (const match of String(data || "").matchAll(pattern)) {
      try {
        const url = new URL(match[0], searchUrl);
        const host = url.hostname.toLowerCase();
        const valid = provider === "phub"
          ? host === "pornhub.com" || host.endsWith(".pornhub.com")
          : host === "xvideos.com" || host.endsWith(".xvideos.com");
        if (valid) urls.push(url.toString());
      } catch {}
    }
    return [...new Set(urls)].sort(() => Math.random() - 0.5);
  } catch {
    return [];
  }
}

async function sendRandomVideo(provider, maxDurationSeconds, context) {
  if (!context.jid || typeof context.sendMessage !== "function") return "Este comando solo está disponible desde WhatsApp.";
  const isPhub = provider === "phub";
  const enabled = process.env[isPhub ? "PHUB_ENABLED" : "XVIDEOS_ENABLED"] === "true";
  if (!enabled) return `${isPhub ? "PHUB" : "xvideos"} está desactivado. Actívalo en .env.`;
  await context.sendMessage(context.jid, { text: `🎲 Buscando un vídeo aleatorio de ${maxDurationSeconds / 60} minutos o menos...` });
  const candidates = [...new Set([...configuredRandomUrls(provider), ...(await discoverRandomUrls(provider))])].slice(0, 8);
  if (!candidates.length) return `No encontré candidatos aleatorios para ${isPhub ? "PHUB" : "xvideos"}. Configura ${isPhub ? "PHUB_RANDOM_URLS" : "XVIDEOS_RANDOM_URLS"}.`;
  const download = isPhub ? phubVideoFile : xvideosVideoFile;
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const buffer = await download(candidate, { maxDurationSeconds });
      await context.sendMessage(context.jid, {
        video: buffer,
        mimetype: "video/mp4",
        caption: `Vídeo aleatorio de ${isPhub ? "PHUB" : "xvideos"} (${maxDurationSeconds / 60} min máx.)`,
      });
      return null;
    } catch (error) {
      lastError = error;
    }
  }
  return `No encontré un vídeo de ${maxDurationSeconds / 60} minutos o menos: ${lastError?.message || "sin candidatos válidos"}`;
}

function pingResponse() {
  const dead = Number(process.env.PING_DEAD_CHANCE ?? "0.10");
  const trip = Number(process.env.PING_TRIP_CHANCE ?? "0.30");
  const deadChance = Number.isFinite(dead) ? Math.min(1, Math.max(0, dead)) : 0.10;
  const tripChance = Number.isFinite(trip) ? Math.min(1, Math.max(0, trip)) : 0.30;
  const roll = Math.random();
  if (roll < deadChance) return "Pong fallido: el bot falleció 💀";
  if (roll < deadChance + tripChance) return "El bot se tropezó y falló el Pong 🤕";
  return "Pong! 🏓";
}


export function ayuda() {
  const name = (command) => `!${commandDisplayName(command)}`;
  return [
    "*WhatsApp Media Bot — comandos*",
    "",
    `\`${name("ping")}\` — comprueba que el bot responde`,
    `\`${name("ai")} / \`${name("ia")}\` <pregunta> — responde con IA; añade \`fuentes\` si necesitas buscar en Internet`,
    `\`${name("tono")} <estilo>\` — cambia y guarda el tono de la IA`,
    `\`${name("idioma")} <país|código>\` — cambia y guarda el idioma de la IA`,
    `\`${name("proveedor")} <nombre>\` — cambia la IA y el modelo`,
    `\`${name("anime")}\` — envía una imagen SFW de anime`,
    `\`${name("nsfw")}\` — muestra las categorías de imágenes para adultos autorizadas`,
    `\`${name("phub")}\` <URL> o 2minutos/4minutos — obtiene un video mediante PHUB`,
    `\`${name("xvideos")}\` <URL> o 2minutos/4minutos — obtiene un video mediante xvideos-dl`,
    `\`${name("ayuda")}\` — este mensaje`,
  ].join("\n");
}


export async function handleCommand(text, context = {}) {
  const rawText = (text || "").trim();
  const match = rawText.match(/^!(\w+)\s*([\s\S]*)$/);
  if (!match) return null;

  let cmd = match[1].toLowerCase();
  try {
    cmd = resolveCommandAlias(cmd);
  } catch {
    // Una configuración inválida no debe detener el bot ni ejecutar un comando inesperado.
  }
  if (!cmd) return null;
  const args = match[2].trim();

  switch (cmd) {
    case "ping":
      return pingResponse();
    case "ai":
    case "ia":
      return cmdIA(args, context.jid || null);
    case "tono":
      return cmdTono(args);
    case "idioma":
      return cmdIdioma(args);
    case "proveedor":
      return cmdProveedor(args);
    case "anime":
      return sendSfwAnimeImage(context);
    case "phub":
      return sendPhubVideo(args, context);
    case "xvideos":
      return sendXvideosVideo(args, context);
    case "nsfw":
      return nsfwHelp();
    case "ayuda":
    case "help":
      return ayuda();
    default:
      if (Object.hasOwn(NSFW_COMMANDS, cmd)) return sendNsfwImage(cmd, context);
      return null; // comando desconocido: el bot se queda callado
  }
}
