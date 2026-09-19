// Steam Web API: resolver identificadores y obtener el perfil del jugador.
import { getSteamApiKey } from "./steamkey.js";

async function getJson(url, params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${url}?${qs}`, { signal: AbortSignal.timeout(8000) });
  return { status: res.status, body: res.ok ? await res.json() : null };
}

export async function resolveVanity(vanity) {
  const STEAM_API_KEY = getSteamApiKey();
  if (!STEAM_API_KEY) return null;
  if (!/^[\w-]{1,64}$/.test(vanity)) return null;
  try {
    const { body } = await getJson(
      "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/",
      { key: STEAM_API_KEY, vanityurl: vanity }
    );
    if (body?.response?.success === 1) return body.response.steamid;
  } catch {}
  return null;
}

/** Acepta steamid64, vanity o URL del perfil. */
export async function extractIdentifier(input) {
  let s = (input || "").trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) {
    try {
      const url = new URL(s);
      const hostname = url.hostname.toLowerCase();
      if (hostname !== "steamcommunity.com" && !hostname.endsWith(".steamcommunity.com")) return null;
      const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
      if (parts.length < 2 || !/^(id|profiles)$/i.test(parts[0])) return null;
      s = parts[1];
    } catch {
      return null;
    }
  }
  if (/^\d{17,20}$/.test(s)) {
    try {
      if (BigInt(s) > 0n) return s;
    } catch {}
  }
  return resolveVanity(s);
}

/** Devuelve { player, error }. */
export async function getPlayerInfo(steamId) {
  const STEAM_API_KEY = getSteamApiKey();
  if (!STEAM_API_KEY) {
    return { player: null, error: "Falta la Steam API key. Reinicia el bot y escríbela cuando te la pida." };
  }
  try {
    const { status, body } = await getJson(
      "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/",
      { key: STEAM_API_KEY, steamids: steamId }
    );
    if (status === 403) return { player: null, error: "Steam rechazó la API key (403)." };
    if (status === 429) return { player: null, error: "Steam limitó las peticiones (429). Intenta más tarde." };
    if (status !== 200) return { player: null, error: `Steam respondió HTTP ${status}.` };
    const players = body?.response?.players || [];
    return players.length
      ? { player: players[0], error: null }
      : { player: null, error: "Perfil no encontrado." };
  } catch (err) {
    return { player: null, error: `Error consultando Steam: ${err.message}` };
  }
}
