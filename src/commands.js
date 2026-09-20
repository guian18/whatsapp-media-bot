// Lógica de comandos, independiente de WhatsApp: cada uno devuelve texto plano.
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { serverInfo, serverPlayers, masterServerList, parseAddress } from "./a2s.js";
import { extractIdentifier, getPlayerInfo } from "./steam.js";
import { cmdIA, cmdIdioma, cmdProveedor, cmdTono } from "./ai.js";
import { listWatched, scanAndNotify, unwatchPlayer, watchPlayer } from "./watcher.js";

const MAX_SERVERS = 200;
const CONCURRENCY = 20;
const A2S_TIMEOUT = 2000;
const MAX_RESULTS = 8;
const MAX_NICKNAME_LENGTH = 64;
let searchInFlight = false;

function officialIpsPath() {
  const configured = String(process.env.OFFICIAL_IPS_FILE || "").trim();
  if (configured) return configured;
  const isTermux = Boolean(process.env.TERMUX_VERSION) || String(process.env.PREFIX || "").includes("com.termux");
  return isTermux
    ? join(homedir(), "storage", "downloads", "l4d2-official-ips.txt")
    : join(process.cwd(), "l4d2-official-ips.txt");
}

function isPublicIpv4(ip) {
  return /^(?!10\.)(?!127\.)(?!169\.254\.)(?!192\.168\.)(?!172\.(1[6-9]|2\d|3[01])\.)(?!224\.)(?!0\.)(?:\d{1,3}\.){3}\d{1,3}$/.test(ip);
}

async function exportOfficialIps() {
  const servers = await masterServerList({ limit: MAX_SERVERS });
  const ips = [...new Set(servers.map(({ ip }) => ip).filter(isPublicIpv4))].sort();
  if (!ips.length) return "No se encontraron IPs oficiales en el Master Server de Steam.";
  const file = officialIpsPath();
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${ips.join("\n")}\n`, { mode: 0o600 });
  } catch (error) {
    return `No pude crear el archivo de IPs en ${file}. En Termux ejecuta primero: termux-setup-storage. Detalle: ${error.message}`;
  }
  return `Guardé ${ips.length} IPs oficiales, una por línea y sin puertos, en: ${file}`;
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

function fmtDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

async function queryServer({ ip, port }) {
  let info = null;
  let players = [];
  try {
    info = await serverInfo(ip, port, A2S_TIMEOUT);
  } catch {
    return { info: null, players: [] };
  }
  try {
    players = await serverPlayers(ip, port, A2S_TIMEOUT);
  } catch {}
  return { info, players };
}

async function mapWithLimit(items, limit, fn) {
  const results = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

export function ayuda() {
  return [
    "*infoplayerleft — comandos*",
    "",
    "`!info <steamid|vanity|url>` — perfil de Steam y servidor actual de L4D2",
    "`!buscar <nickname>` — busca un nick en servidores públicos de L4D2",
    "`!servidor <ip:puerto>` — información detallada de un servidor",
    "`!jugadores <ip:puerto>` — lista los jugadores conectados",
    "`!ping` — comprueba que el bot responde",
    "`!ai` / `!ia` `<pregunta>` — consulta Internet y responde con IA",
    "`!tono <estilo>` — cambia y guarda el tono de la IA",
    "`!idioma <país|código>` — cambia y guarda el idioma de la IA",
    "`!proveedor <nombre>` — cambia la IA y el modelo",
    "`!vigilar <nick|SteamID|URL>` — avisa cuando un jugador se conecta a L4D2",
    "`!novigilar <nick|SteamID|URL>` — cancela una vigilancia",
    "`!lista` — muestra los jugadores vigilados en este chat",
    "`!escaneo [SteamID64|vanity|URL]` — fuerza un escaneo global o de un objetivo",
    "`!ips` — guarda las IPs oficiales en Descargas (Termux)",
    "`!ayuda` — este mensaje",
  ].join("\n");
}

export async function cmdInfo(entrada) {
  if (!entrada) return "Uso: `!info <steamid64 | vanity | url del perfil>`";

  const steamId = await extractIdentifier(entrada);
  if (!steamId) return "No pude resolver ese identificador de Steam.";

  const { player, error } = await getPlayerInfo(steamId);
  if (error || !player) return `❌ ${error || "Sin datos."}`;

  const lines = [
    `*${player.personaname || "Jugador"}*`,
    `SteamID64: ${steamId}`,
  ];
  if (player.profileurl) lines.push(`Perfil: ${player.profileurl}`);

  if (player.gameid === "550") {
    lines.push("Jugando: *Left 4 Dead 2*");
    const gs = player.gameserverip;
    if (gs) {
      lines.push(`Servidor: ${gs}`);
      const addr = parseAddress(gs);
      if (addr) {
        const { info, players } = await queryServer(addr);
        if (info) {
          lines.push(`Hostname: ${info.name}`);
          lines.push(`Mapa: ${info.map}`);
          lines.push(`Jugadores: ${info.players}/${info.maxPlayers}`);
        }
        if (players.length) {
          lines.push("", "*En el servidor:*");
          players.filter((p) => p.name).forEach((p) => lines.push(`• ${p.name}`));
        }
      }
    } else {
      lines.push("No está en un servidor visible públicamente.");
    }
  } else {
    lines.push("No está jugando L4D2 ahora mismo.");
  }

  return lines.join("\n");
}

export async function cmdServidor(direccion, incluirJugadores = false) {
  const addr = parseAddress(direccion);
  if (!addr) return "Uso: `!servidor <ip:puerto>` (ejemplo: `!servidor 1.2.3.4:27015`)";

  const { info, players } = await queryServer(addr);
  if (!info) return `❌ No pude conectar con ${direccion}.`;

  const lines = [
    `*${info.name}*`,
    `Dirección: ${addr.ip}:${addr.port}`,
    `Mapa: ${info.map}`,
    `Juego: ${info.game}`,
    `Jugadores: ${info.players}/${info.maxPlayers}${info.bots ? ` (bots: ${info.bots})` : ""}`,
  ];

  if (incluirJugadores) {
    if (!players.length) {
      lines.push("", "Sin jugadores conectados (o el servidor no los reporta).");
    } else {
      lines.push("", "*Jugadores:*");
      players
        .filter((p) => p.name)
        .forEach((p) => lines.push(`• ${p.name} — ${p.score} pts — ${fmtDuration(p.duration)}`));
    }
  }

  return lines.join("\n");
}

export async function cmdBuscar(nickname) {
  if (!nickname) return "Uso: `!buscar <nickname>`";
  if (nickname.length > MAX_NICKNAME_LENGTH) return `El nickname no puede superar ${MAX_NICKNAME_LENGTH} caracteres.`;
  if (searchInFlight) return "Ya hay una búsqueda en curso. Intenta de nuevo en unos segundos.";

  searchInFlight = true;
  try {
    return await cmdBuscarInterno(nickname);
  } finally {
    searchInFlight = false;
  }
}

async function cmdBuscarInterno(nickname) {

  const servidores = await masterServerList({ limit: MAX_SERVERS });
  if (!servidores.length) return "❌ El Master Server de Steam no respondió. Intenta más tarde.";

  const encontrados = [];
  const needle = nickname.toLowerCase();

  await mapWithLimit(servidores, CONCURRENCY, async (addr) => {
    if (encontrados.length >= MAX_RESULTS) return;
    const { info, players } = await queryServer(addr);
    const hit = players.find((p) => (p.name || "").toLowerCase().includes(needle));
    if (hit && encontrados.length < MAX_RESULTS) {
      encontrados.push({
        addr: `${addr.ip}:${addr.port}`,
        player: hit.name,
        hostname: info?.name || "N/A",
        map: info?.map || "N/A",
        count: `${info?.players ?? "?"}/${info?.maxPlayers ?? "?"}`,
      });
    }
  });

  if (!encontrados.length) return `No encontré a *${nickname}* en los servidores consultados.`;

  const lines = [`*Resultados para "${nickname}"*`];
  encontrados.forEach((r) => {
    lines.push(
      "",
      `• ${r.player}`,
      `  Servidor: ${r.hostname}`,
      `  IP: ${r.addr}`,
      `  Mapa: ${r.map} — ${r.count}`
    );
  });
  return lines.join("\n");
}

export async function handleCommand(text, context = {}) {
  const match = (text || "").trim().match(/^!(\w+)\s*([\s\S]*)$/);
  if (!match) return null;

  const cmd = match[1].toLowerCase();
  const args = match[2].trim();

  switch (cmd) {
    case "ping":
      return pingResponse();
    case "ai":
    case "ia":
      return cmdIA(args);
    case "tono":
      return cmdTono(args);
    case "idioma":
      return cmdIdioma(args);
    case "proveedor":
      return cmdProveedor(args);
    case "vigilar":
    case "vigilarnick":
      return watchPlayer(args, context.jid);
    case "novigilar":
      return unwatchPlayer(args, context.jid);
    case "lista":
      return listWatched(context.jid);
    case "escaneo": {
      if (typeof context.sendMessage !== "function") return "El escaneo solo está disponible desde WhatsApp.";
      const result = await scanAndNotify(context.sendMessage, args || null, { manual: true });
      if (result.error) return result.error;
      return `Escaneo completado: ${result.found} conectado(s), ${result.notified} aviso(s) enviado(s).`;
    }
    case "ips":
    case "guardarips":
      return exportOfficialIps();
    case "ayuda":
    case "help":
      return ayuda();
    case "info":
      return cmdInfo(args);
    case "buscar":
      return cmdBuscar(args);
    case "servidor":
      return cmdServidor(args, false);
    case "jugadores":
      return cmdServidor(args, true);
    default:
      return null; // comando desconocido: el bot se queda callado
  }
}
