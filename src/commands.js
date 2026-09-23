// Lógica de comandos, independiente de WhatsApp: cada uno devuelve texto plano.
import axios from "axios";
import { cmdIA, cmdIdioma, cmdProveedor, cmdTono } from "./ai.js";
import { NSFW_COMMANDS, nsfwHelp, nsfwProviderCommand, sendNsfwImage } from "./nsfw.js";
import { commandDisplayName, resolveCommandAlias } from "./command-aliases.js";

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
    `\`${name("proveedor")} <nombre>\` — cambia la IA; usa \`nsfw <nombre>\` para fijar imágenes NSFW`,
    `\`${name("anime")}\` — envía una imagen SFW de anime`,
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
    case "ai":
    case "ia":
      return cmdIA(args, context.jid || null);
    case "tono":
      return cmdTono(args);
    case "idioma":
      return cmdIdioma(args);
    case "proveedor":
      return /^nsfw(?:\s|$)/i.test(args) ? nsfwProviderCommand(args) : cmdProveedor(args);
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
