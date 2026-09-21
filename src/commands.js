// Lógica de comandos, independiente de WhatsApp: cada uno devuelve texto plano.
import { serverInfo, serverPlayers, masterServerList, parseAddress } from "./a2s.js";
import { extractIdentifier, getPlayerInfo } from "./steam.js";
import { cmdIA, cmdIdioma, cmdProveedor, cmdTono } from "./ai.js";
import { listWatched, refreshOfficialAddresses, scanAndNotify, unwatchPlayer, watchedTargets, watchPlayer } from "./watcher.js";
import { commandDisplayName, resolveCommandAlias } from "./command-aliases.js";
import { calcular, dado, entretenimiento, estadoBot, infoBot, ochoBall, moneda, pareja, piedraPapelTijera, rapidez, respuestaSimi, verdadReto } from "./fun.js";

const MAX_SERVERS = 200;
const CONCURRENCY = 20;
const A2S_TIMEOUT = 2000;
const MAX_RESULTS = 8;
const MAX_NICKNAME_LENGTH = 64;
let searchInFlight = false;
const pendingScans = new Map();
const ANIME_API = "https://nekos.best/api/v2/neko?amount=1";

async function sendSfwAnimeImage(context) {
  if (!context.jid || typeof context.sendMessage !== "function") {
    return "Este comando solo está disponible desde WhatsApp.";
  }
  try {
    const response = await fetch(ANIME_API, {
      headers: {
        accept: "application/json",
        "user-agent": "InfoPlayerLeft/1.0 (https://github.com/guianpierrcastillolazo-rgb/infoplayerleft)",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`API respondió HTTP ${response.status}`);
    const body = await response.json();
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
  const name = (command) => `!${commandDisplayName(command)}`;
  return [
    "*infoplayerleft — comandos*",
    "",
    `\`${name("info")} <steamid|vanity|url>\` — perfil de Steam y servidor actual de L4D2`,
    `\`${name("buscar")} <nickname>\` — busca un nick en servidores públicos de L4D2`,
    `\`${name("servidor")} <ip:puerto>\` — información detallada de un servidor`,
    `\`${name("jugadores")} <ip:puerto>\` — lista los jugadores conectados`,
    `\`${name("ping")}\` — comprueba que el bot responde`,
    `\`${name("ai")} / \`${name("ia")}\` <pregunta> — responde con IA; añade \`fuentes\` si necesitas buscar en Internet`,
    `\`${name("tono")} <estilo>\` — cambia y guarda el tono de la IA`,
    `\`${name("idioma")} <país|código>\` — cambia y guarda el idioma de la IA`,
    `\`${name("proveedor")} <nombre>\` — cambia la IA y el modelo`,
    `\`${name("anime")}\` — envía una imagen SFW de anime`,
    `\`${name("entretenimiento")}\` — juegos y utilidades inspirados en el menú clásico`,
    `\`!ppt piedra|papel|tijera\` — juega contra el bot`,
    `\`!simi <mensaje>\` — respuesta divertida local`,
    `\`${name("vigilar")} <nick|SteamID|URL>\` — avisa cuando un jugador se conecta a L4D2`,
    `\`${name("novigilar")} <nick|SteamID|URL>\` — cancela una vigilancia`,
    `\`${name("lista")}\` — muestra los jugadores vigilados en este chat`,
    `\`${name("escaneo")}\` — muestra las vigilancias numeradas para elegir`,
    `\`${name("ayuda")}\` — este mensaje`,
  ].join("\n");
}

export async function cmdInfo(entrada) {
  if (!entrada) return "Uso: `!info <steamid64 | vanity | url del perfil>`";

  const steamId = await extractIdentifier(entrada);
  if (!steamId) return "No pude resolver ese identificador de Steam.";
  void refreshOfficialAddresses();

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
  const rawText = (text || "").trim();
  if (/^\d+$/.test(rawText) && context.jid && pendingScans.has(context.jid)) {
    if (typeof context.sendMessage !== "function") return "La selección solo está disponible desde WhatsApp.";
    const options = pendingScans.get(context.jid);
    const selected = options[Number(rawText) - 1];
    if (!selected) return `Número no válido. Elige uno entre 1 y ${options.length}.`;
    pendingScans.delete(context.jid);
    const result = await scanAndNotify(context.sendMessage, null, { manual: true, targetKey: selected.key });
    if (result.error) return result.error;
    return `Escaneo de ${selected.label}: ${result.found} conectado(s), ${result.notified} información enviada.`;
  }
  if (/^\d+$/.test(rawText) && context.jid) {
    return "No hay un escaneo pendiente. Usa `!escaneo` para ver la lista actual.";
  }
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
    case "entretenimiento":
    case "juegos":
      return entretenimiento();
    case "dado":
    case "dice":
      return dado(args);
    case "moneda":
    case "coin":
      return moneda();
    case "8ball":
    case "bola8":
      return ochoBall(args);
    case "verdad":
    case "reto":
      return verdadReto(cmd);
    case "pareja":
    case "formarpareja":
      return pareja(args);
    case "calcular":
    case "calc":
      return calcular(args);
    case "ppt":
    case "piedrapapeltijera":
      return piedraPapelTijera(args);
    case "simi":
      return respuestaSimi(args);
    case "infobot":
    case "botinfo":
      return infoBot();
    case "estado":
      return estadoBot();
    case "rapidez":
    case "speed":
      return rapidez();
    case "vigilar":
    case "vigilarnick":
      return watchPlayer(args, context.jid);
    case "novigilar":
      return unwatchPlayer(args, context.jid);
    case "lista":
      return listWatched(context.jid);
    case "escaneo": {
      if (typeof context.sendMessage !== "function") return "El escaneo solo está disponible desde WhatsApp.";
      if (!args) {
        const options = watchedTargets(context.jid);
        if (!options.length) return "No vigilas jugadores aquí. Usa !vigilar <SteamID64|vanity|URL>.";
        pendingScans.set(context.jid, options);
        return ["Selecciona el jugador del que quieres información enviando solo el número:", ...options.map((item, index) => `${index + 1}. ${item.label}`)].join("\n");
      }
      if (/^\d+$/.test(args) && context.jid && pendingScans.has(context.jid)) {
        const options = pendingScans.get(context.jid) || watchedTargets(context.jid);
        const selected = options[Number(args) - 1];
        if (!selected) return `Número no válido. Elige uno entre 1 y ${options.length}.`;
        pendingScans.delete(context.jid);
        const selectedResult = await scanAndNotify(context.sendMessage, null, { manual: true, targetKey: selected.key });
        if (selectedResult.error) return selectedResult.error;
        return `Escaneo de ${selected.label}: ${selectedResult.found} conectado(s), ${selectedResult.notified} información enviada.`;
      }
      if (/^\d+$/.test(args) && context.jid) {
        const options = watchedTargets(context.jid);
        const selected = options[Number(args) - 1];
        if (!options.length) return "No vigilas jugadores aquí. Usa !vigilar <SteamID64|vanity|URL>.";
        if (!selected) return `Número no válido. Elige uno entre 1 y ${options.length}.`;
        const selectedResult = await scanAndNotify(context.sendMessage, null, { manual: true, targetKey: selected.key });
        if (selectedResult.error) return selectedResult.error;
        return `Escaneo de ${selected.label}: ${selectedResult.found} conectado(s), ${selectedResult.notified} información enviada.`;
      }
      const result = await scanAndNotify(context.sendMessage, args, { manual: true });
      if (result.error) return result.error;
      return `Escaneo completado: ${result.found} conectado(s), ${result.notified} aviso(s) enviado(s).`;
    }
    case "ayuda":
    case "help":
    case "menu":
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
