const COMMAND_NAMES = new Set([
  "ping",
  "ai",
  "ia",
  "tono",
  "idioma",
  "proveedor",
  "anime",
  "vigilar",
  "vigilarnick",
  "novigilar",
  "lista",
  "escaneo",
  "ayuda",
  "help",
  "info",
  "buscar",
  "servidor",
  "jugadores",
]);

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
    if (COMMAND_NAMES.has(alias) || alias === target) {
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
  return aliases[command] || command;
}
