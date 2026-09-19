// Lógica de comandos, independiente de WhatsApp: cada uno devuelve texto plano.
import { serverInfo, serverPlayers, masterServerList, parseAddress } from "./a2s.js";
import { extractIdentifier, getPlayerInfo } from "./steam.js";
import { cmdIA } from "./ai.js";

const MAX_SERVERS = 200;
const CONCURRENCY = 20;
const A2S_TIMEOUT = 2000;
const MAX_RESULTS = 8;
const MAX_NICKNAME_LENGTH = 64;
let searchInFlight = false;

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
    "`!ia <pregunta>` — consulta Internet y responde con IA",
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

export async function handleCommand(text) {
  const match = (text || "").trim().match(/^!(\w+)\s*([\s\S]*)$/);
  if (!match) return null;

  const cmd = match[1].toLowerCase();
  const args = match[2].trim();

  switch (cmd) {
    case "ping":
      return "Pong! 🏓";
    case "ia":
    case "ai":
      return cmdIA(args);
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
