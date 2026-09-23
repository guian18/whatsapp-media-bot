// Lógica de comandos, independiente de WhatsApp: cada uno devuelve texto plano.
import axios from "axios";
import { NSFW_COMMANDS, clearNsfwMessages, nsfwHelp, sendNsfwImage } from "./nsfw.js";
import { commandDisplayName, resolveCommandAlias } from "./command-aliases.js";
import { clearAllBotMessages } from "./message-tracker.js";
import {
  areAllCommandsEnabled,
  disableAllCommands,
  enableAllCommands,
  isPrivilegedUser,
} from "./access-control.js";

const NEKOBOT_SFW_API = "https://nekobot.xyz/api/image";

async function sendSfwAnimeImage(context) {
  if (!context.jid || typeof context.sendMessage !== "function") {
    return "Este comando solo puede usarse desde un chat de WhatsApp.";
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
    return `No pude conseguir una imagen SFW de anime en este momento. Inténtalo de nuevo más tarde. (${error.message})`;
  }
}

function pingResponse() {
  return "Pong! 🏓 El bot está activo y listo.";
}

function adminMenu() {
  return [
    "*Menú de propietario y administrador*",
    "",
    "Comandos disponibles:",
    "`!desactivar` — bloquea todos los comandos del bot.",
    "`!activar` — vuelve a activar todos los comandos.",
    "`!clear all` — elimina todos los mensajes registrados del bot en este chat.",
    "`!admin menu` — muestra este menú.",
    "",
    "Solo funcionan para los números configurados en OWNER_NUMBER y ADMIN_NUMBER.",
  ].join("\n");
}

export function ayuda() {
  const name = (command) => `!${commandDisplayName(command)}`;
  return [
    "*WhatsApp Media Bot — menú principal*",
    "",
    "*Comandos principales:*",
    `\`${name("ping")}\` — comprueba que el bot está disponible`,
    `\`${name("anime")}\` — solicita una imagen SFW de anime`,
    `\`${name("nsfw")}\` — muestra el menú de imágenes NSFW`,
    `\`${name("clear")}\` — elimina tus imágenes NSFW enviadas por el bot`,
    `\`${name("clear")} all\` — elimina todos los mensajes del bot (solo propietario/admin)`,
    `\`${name("desactivar")}\` — desactiva todos los comandos (solo propietario/admin)`,
    `\`${name("activar")}\` — activa todos los comandos (solo propietario/admin)`,
    "`!admin menu` — muestra el menú de propietario y administrador",
    "",
    `Escribe \`${name("ayuda")}\` cuando necesites volver a ver este menú.`,
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

  if (cmd === "admin" && args.toLowerCase() === "menu") {
    return isPrivilegedUser(context)
      ? adminMenu()
      : "No tienes permiso para ver el menú de propietario y administrador.";
  }

  if (cmd === "desactivar" || cmd === "activar") {
    if (!isPrivilegedUser(context)) return "No tienes permiso para cambiar el estado global del bot.";
    if (cmd === "desactivar") {
      disableAllCommands();
      return "Todos los comandos han sido desactivados. Solo el propietario o el administrador pueden usar !activar.";
    }
    enableAllCommands();
    return "Todos los comandos han sido activados nuevamente.";
  }

  if (!areAllCommandsEnabled()) return "El bot está temporalmente desactivado por el propietario o el administrador.";

  switch (cmd) {
    case "ping":
      return pingResponse();
    case "anime":
      return sendSfwAnimeImage(context);
    case "nsfw":
      return nsfwHelp();
    case "clear":
      if (args.toLowerCase() === "all") {
        if (!isPrivilegedUser(context)) return "No tienes permiso para borrar todos los mensajes del bot.";
        return clearAllBotMessages(context);
      }
      return clearNsfwMessages(context);
    case "ayuda":
    case "help":
      return ayuda();
    default:
      if (Object.hasOwn(NSFW_COMMANDS, cmd)) return sendNsfwImage(cmd, context);
      return null; // comando desconocido: el bot se queda callado
  }
}
