import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { masterServerList, parseAddress, serverInfo, serverPlayers } from "./a2s.js";
import { extractIdentifier, getPlayerInfo } from "./steam.js";
import { saveOfficialAddresses } from "./official-addresses.js";

const STATE_FILE = process.env.WATCH_STATE_FILE || "watchlist.json";
const MAX_SERVERS = Math.min(500, Math.max(1, Number(process.env.WATCH_MAX_SERVERS || 200)));
const configuredSeconds = Number(process.env.WATCH_INTERVAL_SECONDS);
const legacyMinutes = Number(process.env.WATCH_INTERVAL_MINUTES);
const SCAN_INTERVAL_MS = Number.isFinite(configuredSeconds)
  ? Math.max(50_000, configuredSeconds * 1000)
  : Number.isFinite(legacyMinutes)
    ? Math.max(50_000, legacyMinutes * 60_000)
    : 50_000;
const CONCURRENCY = 20;
const BASE_STEAM_ID = 76561197960265728n;

let state = { watchlist: {}, lastSeen: {}, meta: {}, notified: {} };
let scanInFlight = false;
let timer = null;

function loadState() {
  if (!existsSync(STATE_FILE)) return;
  try {
    const parsed = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    state = {
      watchlist: parsed.watchlist && typeof parsed.watchlist === "object" ? parsed.watchlist : {},
      lastSeen: parsed.lastSeen && typeof parsed.lastSeen === "object" ? parsed.lastSeen : {},
      meta: parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {},
      notified: parsed.notified && typeof parsed.notified === "object" ? parsed.notified : {},
    };
  } catch (error) {
    console.error("No se pudo cargar watchlist.json:", error?.message || error);
  }
}

function saveState() {
  try {
    writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  } catch (error) {
    console.error("No se pudo guardar watchlist.json:", error?.message || error);
  }
}

function cleanTarget(value) {
  return String(value || "").trim().replace(/^<|>$/g, "");
}

function labelFor(key) {
  return state.meta[key]?.label || (key.startsWith("steam:") ? key.slice(6) : key.slice(5));
}

async function resolveTarget(input) {
  const value = cleanTarget(input);
  if (!value) return null;
  const classic = value.match(/^STEAM_[0-5]:([01]):(\d+)$/i);
  const steam3 = value.match(/^\[U:1:(\d+)\]$/i);
  const converted = classic ? String(BASE_STEAM_ID + BigInt(classic[2]) * 2n + BigInt(classic[1])) : steam3 ? String(BASE_STEAM_ID + BigInt(steam3[1])) : null;
  const looksLikeSteam = Boolean(converted) || /^\d{17,20}$/.test(value) || /^https?:\/\//i.test(value) || /^[\w-]{1,64}$/.test(value);
  if (looksLikeSteam) {
    const steamId = converted || await extractIdentifier(value);
    if (steamId) {
      let label = steamId;
      try {
        const { player } = await getPlayerInfo(steamId);
        if (player?.personaname) label = player.personaname;
      } catch {}
      return { key: `steam:${steamId}`, label, steamId };
    }
    if (converted || /^\d{17,20}$/.test(value) || /^https?:\/\//i.test(value)) return null;
  }
  return { key: `nick:${value.toLowerCase()}`, label: value };
}

export async function watchPlayer(input, jid) {
  if (!jid) return "No se pudo identificar este chat.";
  const target = await resolveTarget(input);
  if (!target) return "No pude resolver ese SteamID o perfil. Usa un nickname o una URL válida.";
  const chats = new Set(Array.isArray(state.watchlist[target.key]) ? state.watchlist[target.key] : []);
  if (chats.has(jid)) return `Ya estoy vigilando ${target.label} en este chat.`;
  chats.add(jid);
  state.watchlist[target.key] = [...chats];
  state.meta[target.key] = { ...(state.meta[target.key] || {}), label: target.label, steamId: target.steamId };
  saveState();
  return `Vigilando ${target.label}. Te avisaré aquí cuando se conecte a un servidor público de L4D2.`;
}

export async function unwatchPlayer(input, jid) {
  const target = await resolveTarget(input);
  if (!target || !state.watchlist[target.key]?.includes(jid)) return "No estaba vigilando ese jugador en este chat.";
  state.watchlist[target.key] = state.watchlist[target.key].filter((chat) => chat !== jid);
  if (!state.watchlist[target.key].length) {
    delete state.watchlist[target.key];
    delete state.lastSeen[target.key];
    delete state.meta[target.key];
    delete state.notified[target.key];
  }
  saveState();
  return `Dejé de vigilar a ${target.label} en este chat.`;
}

export function listWatched(jid) {
  const rows = Object.keys(state.watchlist)
    .filter((key) => state.watchlist[key].includes(jid))
    .map((key) => {
      const seen = state.lastSeen[key];
      return `• ${labelFor(key)} — ${seen ? `🟢 ${seen}` : "⚪ no visto ahora"}`;
    });
  return rows.length ? `Jugadores vigilados:\n${rows.join("\n")}` : "No vigilas jugadores aquí. Usa !vigilar <nickname|SteamID|URL>.";
}

async function queryServer(addr) {
  try {
    const info = await serverInfo(addr.ip, addr.port, 1800);
    const players = await serverPlayers(addr.ip, addr.port, 1800).catch(() => []);
    return { info, players };
  } catch {
    return { info: null, players: [] };
  }
}

async function scanWatched(targetKey = null) {
  const targets = new Map();
  const found = new Map();
  for (const key of Object.keys(state.watchlist)) {
    if (targetKey && key !== targetKey) continue;
    if (key.startsWith("nick:")) targets.set(key.slice(5), key);
  }
  for (const key of Object.keys(state.watchlist)) {
    if (targetKey && key !== targetKey) continue;
    if (!key.startsWith("steam:")) continue;
    const steamId = key.slice(6);
    const { player } = await getPlayerInfo(steamId).catch(() => ({ player: null }));
    const direct = player?.gameserverip && String(player.gameid) === "550" ? parseAddress(player.gameserverip) : null;
    if (direct) {
      const result = await queryServer(direct);
      found.set(key, { addr: `${direct.ip}:${direct.port}`, info: result.info, player: player.personaname || steamId });
      continue;
    }
    if (player?.personaname) targets.set(player.personaname.toLowerCase(), key);
  }
  if (!targets.size) return found;
  const servers = await masterServerList({ limit: MAX_SERVERS, timeout: 3500 });
  let index = 0;
  const worker = async () => {
    while (index < servers.length) {
      const addr = servers[index++];
      const result = await queryServer(addr);
      if (!result.players.length) continue;
      for (const player of result.players) {
        const name = String(player.name || "").toLowerCase();
        for (const [target, key] of targets) {
          if (!found.has(key) && name.includes(target)) {
            found.set(key, { addr: `${addr.ip}:${addr.port}`, info: result.info, player: player.name });
          }
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, servers.length) }, worker));
  return found;
}

function notificationText(key, result, manual = false) {
  const info = result.info || {};
  const address = result.addr;
  return [
    manual ? "Escaneo manual de L4D2" : "🔔 Jugador conectado a L4D2",
    `${result.player} (vigilando ${labelFor(key)})`,
    `Servidor: ${info.name || "desconocido"}`,
    `Dirección: ${address}`,
    `Mapa: ${info.map || "desconocido"}`,
    `Jugadores: ${info.players ?? "?"}/${info.maxPlayers ?? "?"}`,
    key.startsWith("steam:") ? `Perfil: https://steamcommunity.com/profiles/${key.slice(6)}` : null,
  ].filter(Boolean).join("\n");
}

export async function scanAndNotify(sendMessage, input = null, { manual = false } = {}) {
  if (scanInFlight || !Object.keys(state.watchlist).length) return { found: 0, notified: 0 };
  let targetKey = null;
  if (input) {
    const target = await resolveTarget(input);
    if (!target) return { found: 0, notified: 0, error: "No pude resolver ese SteamID, vanity o URL." };
    targetKey = target.key;
    if (!state.watchlist[targetKey]?.length) {
      return { found: 0, notified: 0, error: `No hay una vigilancia activa para ${target.label}.` };
    }
  }
  scanInFlight = true;
  try {
    const found = await scanWatched(targetKey);
    let notified = 0;
    let changed = false;
    const keys = targetKey ? [targetKey] : Object.keys(state.watchlist);
    for (const key of keys) {
      const result = found.get(key);
      const current = result?.addr || null;
      const previous = state.lastSeen[key] || null;
      if (!current && previous) {
        state.lastSeen[key] = null;
        delete state.notified[key];
        changed = true;
        continue;
      }
      const alreadyNotified = Array.isArray(state.notified[key]) && state.notified[key].includes(current);
      const shouldNotify = current && (manual || (current !== previous && !alreadyNotified));
      if (shouldNotify) {
        for (const jid of state.watchlist[key]) {
          try {
            await sendMessage(jid, { text: notificationText(key, result, manual) });
            notified++;
          } catch (error) {
            console.error(`No se pudo enviar aviso a ${jid}:`, error?.message || error);
          }
        }
        if (!manual) {
          state.notified[key] = [...new Set([...(state.notified[key] || []), current])];
        }
      }
      if (current !== previous) {
        state.lastSeen[key] = current;
        changed = true;
      }
    }
    if (changed) saveState();
    return { found: found.size, notified };
  } finally {
    scanInFlight = false;
  }
}

export function startWatcher(sendMessage) {
  loadState();
  refreshOfficialAddresses().catch((error) => console.error("No se pudieron guardar las direcciones oficiales:", error?.message || error));
  if (timer) clearInterval(timer);
  timer = setInterval(async () => {
    await refreshOfficialAddresses();
    await scanAndNotify(sendMessage).catch((error) => console.error("Error en escaneo de vigilancia:", error?.message || error));
  }, SCAN_INTERVAL_MS);
  timer.unref?.();
  return () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
}

async function refreshOfficialAddresses() {
  try {
    const servers = await masterServerList({ limit: MAX_SERVERS });
    const result = saveOfficialAddresses(servers);
    if (result.count) console.log(`Direcciones oficiales guardadas: ${result.count} en ${result.path}`);
  } catch (error) {
    console.error("No se pudieron guardar las direcciones oficiales:", error?.message || error);
  }
}

export { STATE_FILE, SCAN_INTERVAL_MS };
