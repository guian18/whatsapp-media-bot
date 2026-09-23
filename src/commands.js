// Lógica de comandos, independiente de WhatsApp: cada uno devuelve texto plano.
import axios from "axios";
import { NSFW_COMMANDS, clearNsfwMessages, nsfwHelp, sendNsfwImage } from "./nsfw.js";
import { commandDisplayName, resolveCommandAlias } from "./command-aliases.js";

const NEKOBOT_SFW_API = "https://nekobot.xyz/api/image";

async function sendSfwAnimeImage(context) {
  if (!context.jid || typeof context.sendMessage !== "function") {
    return "Este comando solo está disponible desde WhatsApp.";
  }
  try {
    const { data: body } = await axios.get(NEKOBOT_SFW_API, {
      params: { type: "neko" },
      headers: {
        accept: "application/json",
        "user-agent": "WhatsAppMediaBot/1.0",
      },
      timeout: 15_000,
    });
    const imageUrl = body?.message;
    if (!imageUrl || !/^https:\/\//i.test(imageUrl)) throw new Error("respuesta SFW sin imagen válida");
    await context.sendMessage(context.jid, {
      image: { url: imageUrl },
      caption: "Anime SFW · Fuente: nekobot",
    });
    return null;
  } catch (error) {
    return `No pude obtener una imagen SFW de anime ahora: ${error.message}`;
  }
}

function pingResponse() {
  return "Pong! 🏓";
}

export function ayuda() {
  const name = (command) => `!${commandDisplayName(command)}`;
  return [
    "*WhatsApp Media Bot — comandos*",
    "",
    `\`${name("ping")}\` — comprueba que el bot responde`,
    `\`${name("anime")}\` — envía una imagen SFW de anime`,
    `\`${name("nsfw")}\` — muestra los comandos de imágenes NSFW`,
    `\`${name("clear")}\` — elimina tus imágenes NSFW enviadas por el bot`,
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

  switch (cmd) {
    case "ping":
      return pingResponse();
    case "anime":
      return sendSfwAnimeImage(context);
    case "nsfw":
      return nsfwHelp();
    case "clear":
      return clearNsfwMessages(context);
    case "ayuda":
    case "help":
      return ayuda();
    default:
      if (Object.hasOwn(NSFW_COMMANDS, cmd)) return sendNsfwImage(cmd, context);
      return null; // comando desconocido: el bot se queda callado
  }
}
