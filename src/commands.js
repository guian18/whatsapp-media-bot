// Lógica de comandos, independiente de WhatsApp: cada uno devuelve texto plano.
import axios from "axios";
import { NSFW_COMMANDS, nsfwHelp, nsfwProviderCommand, sendNsfwImage } from "./nsfw.js";
import { commandDisplayName, resolveCommandAlias } from "./command-aliases.js";

const ANIME_API = "https://nekos.best/api/v2/neko?amount=1";
const NEKOBOT_SFW_API = "https://nekobot.xyz/api/image";
const SFW_PROVIDERS = Object.freeze(["nekobot", "nekosbest", "safebooru", "konachan"]);
const SFW_PROVIDER_URLS = Object.freeze({
  safebooru: "https://safebooru.org/index.php?page=dapi&s=post&q=index",
  konachan: "https://konachan.com/post.json",
});

export function sfwProviderCommand(args = "") {
  const parts = String(args).trim().toLowerCase().split(/\s+/).filter(Boolean);
  const active = String(process.env.SFW_PROVIDER || "nekosbest").trim().toLowerCase();
  if (!parts.length || parts[0] === "list") {
    return `Proveedor SFW activo: ${active}\nDisponibles: ${SFW_PROVIDERS.join(", ")}\nUsa: !sfwproveedor <nombre>`;
  }
  const requested = parts[0];
  if (!SFW_PROVIDERS.includes(requested)) {
    return `Proveedor SFW no válido. Disponibles: ${SFW_PROVIDERS.join(", ")}.`;
  }
  process.env.SFW_PROVIDER = requested;
  return `Proveedor SFW fijado manualmente en: ${requested}.`;
}

async function sendSfwAnimeImage(context) {
  if (!context.jid || typeof context.sendMessage !== "function") {
    return "Este comando solo está disponible desde WhatsApp.";
  }
  const provider = String(process.env.SFW_PROVIDER || "nekosbest").trim().toLowerCase();
  try {
    const apiUrl = provider === "nekobot"
      ? NEKOBOT_SFW_API
      : provider === "nekosbest"
        ? ANIME_API
        : SFW_PROVIDER_URLS[provider] || null;
    if (!apiUrl) return `Proveedor SFW no válido: ${provider}`;
    const { data: body } = await axios.get(apiUrl, {
      params: provider === "nekobot"
        ? { type: "neko" }
        : provider === "safebooru"
          ? { limit: 100, json: 1, tags: "rating:safe" }
          : provider === "konachan"
            ? { limit: 100, tags: "rating:safe" }
            : undefined,
      headers: {
        accept: "application/json",
        "user-agent": "WhatsAppMediaBot/1.0",
      },
      timeout: 15_000,
    });
    const posts = Array.isArray(body) ? body : Array.isArray(body?.post) ? body.post : [];
    const safePost = posts.find((post) => {
      const rating = String(post?.rating || "").toLowerCase();
      const tags = String(post?.tags || "").toLowerCase();
      return (!rating || rating === "safe" || rating === "general")
        && !/(?:^|\s)(?:loli|shota|child|underage|young)(?:\s|$)/.test(tags)
        && (post?.file_url || post?.image || post?.jpeg_url || post?.sample_url);
    });
    const imageUrl = provider === "nekobot"
      ? body?.message
      : provider === "nekosbest"
        ? body?.results?.[0]?.url
        : safePost?.file_url || safePost?.image || safePost?.jpeg_url || safePost?.sample_url;
    if (!imageUrl || !/^https:\/\//i.test(imageUrl)) throw new Error("respuesta SFW sin imagen válida");
    await context.sendMessage(context.jid, {
      image: { url: imageUrl },
      caption: `Anime SFW · Fuente: ${provider}`,
    });
    return null;
  } catch (error) {
    return `No pude obtener una imagen SFW de anime ahora: ${error.message}`;
  }
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
    `\`!nsfwproveedor <nombre>\` — cambia únicamente el proveedor de imágenes NSFW`,
    `\`${name("anime")}\` — envía una imagen SFW de anime`,
    "`!sfwproveedor <nombre>` — cambia el proveedor de imágenes SFW",
    `\`${name("nsfw")}\` — muestra las categorías de imágenes para adultos autorizadas`,
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
    case "nsfwproveedor":
      return nsfwProviderCommand(args);
    case "sfwproveedor":
      return sfwProviderCommand(args);
    case "anime":
      return sendSfwAnimeImage(context);
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
