const COMMAND_NAMES = new Set([
  "ping",
  "ai",
  "ia",
  "tono",
  "idioma",
  "proveedor",
  "nsfwproveedor",
  "anime",
  "nsfw",
  "4k",
  "anal",
  "ass",
  "blowjob",
  "boobs",
  "feet",
  "gonewild",
  "hass",
  "hboobs",
  "hentai",
  "hentaianal",
  "hkitsune",
  "hmidriff",
  "htigh",
  "hyuri",
  "kanna",
  "lewd",
  "lewdneko",
  "paizuri",
  "pgif",
  "pussy",
  "tentacle",
  "thigh",
  "yaoi",
  "ayuda",
  "help",
]);

const BUILTIN_ALIASES = Object.freeze({ gatus: "anime" });

function validName(value) {
  return /^[a-z][a-z0-9_]{0,31}$/i.test(value);
}

export function parseCommandAliases(value = "") {
  const aliases = {};
  const raw = typeof value === "string" ? value : JSON.stringify(value || {});
  for (const pair of raw.split(",")) {
    const item = pair.trim();
    if (!item) continue;
    const [alias, target, ...extra] = item.split("=").map((part) => part.trim().toLowerCase());
    if (extra.length || !validName(alias) || !COMMAND_NAMES.has(target)) {
      throw new Error(`alias inválido: ${item}`);
    }
    const conflictsWithBuiltin = Object.hasOwn(BUILTIN_ALIASES, alias) && BUILTIN_ALIASES[alias] !== target;
    if (COMMAND_NAMES.has(alias) || conflictsWithBuiltin || alias === target) {
      throw new Error(`el alias debe tener un nombre diferente: ${alias}`);
    }
    aliases[alias] = target;
  }
  return aliases;
}

export function aliasesToText(value = {}) {
  return Object.entries(value)
    .map(([alias, target]) => `${alias}=${target}`)
    .join(", ");
}

export function resolveCommandAlias(command) {
  const aliases = parseCommandAliases(process.env.COMMAND_ALIASES || "");
  if (aliases[command]) return aliases[command];
  if (Object.values(aliases).includes(command)) return null;
  if (BUILTIN_ALIASES[command]) return BUILTIN_ALIASES[command];
  return command;
}

export function commandDisplayName(command) {
  const aliases = parseCommandAliases(process.env.COMMAND_ALIASES || "");
  return Object.entries(aliases).find(([, target]) => target === command)?.[0] || command;
}
