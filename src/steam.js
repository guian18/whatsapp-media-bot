// Steam Web API: resolver identificadores y obtener el perfil del jugador.
const STEAM_API_KEY = (process.env.STEAM_API_KEY || "").trim();

async function getJson(url, params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${url}?${qs}`, { signal: AbortSignal.timeout(8000) });
  return { status: res.status, body: res.ok ? await res.json() : null };
}

export async function resolveVanity(vanity) {
  if (!STEAM_API_KEY) return null;
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
    s = s.replace(/\/+$/, "").split("/").pop();
  }
  s = s.replace(/^(id|profiles)\//i, "");
  if (/^\d{17,20}$/.test(s)) return s;
  return resolveVanity(s);
}

/** Devuelve { player, error }. */
export async function getPlayerInfo(steamId) {
  if (!STEAM_API_KEY) {
    return { player: null, error: "Falta STEAM_API_KEY en las variables de entorno." };
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
