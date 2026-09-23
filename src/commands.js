// Lógica de comandos, independiente de WhatsApp: cada uno devuelve texto plano.
import axios from "axios";
import { commandDisplayName, resolveCommandAlias } from "./command-aliases.js";

const NEKOBOT_SFW_API = "https://nekobot.xyz/api/image";
const SFW_PROVIDERS = Object.freeze(["nekobot"]);

export function sfwProviderCommand(args = "") {
  const parts = String(args).trim().toLowerCase().split(/\s+/).filter(Boolean);
  const active = String(process.env.SFW_PROVIDER || "nekobot").trim().toLowerCase();
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
  const provider = String(process.env.SFW_PROVIDER || "nekobot").trim().toLowerCase();
  if (provider !== "nekobot") return `Proveedor SFW no válido: ${provider}`;
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
    `\`${name("anime")}\` — envía una imagen SFW de anime`,
    "`!sfwproveedor <nombre>` — consulta o selecciona el proveedor SFW",
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
    case "sfwproveedor":
      return sfwProviderCommand(args);
    case "anime":
      return sendSfwAnimeImage(context);
    case "ayuda":
    case "help":
      return ayuda();
    default:
      return null; // comando desconocido: el bot se queda callado
  }
}
