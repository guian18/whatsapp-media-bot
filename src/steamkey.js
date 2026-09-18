// Gestión de la Steam Web API key: variable de entorno, archivo local o
// pregunta en la terminal al arrancar.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import readline from "node:readline/promises";

const KEY_FILE = process.env.STEAM_KEY_FILE || ".steam_key";

let apiKey = (process.env.STEAM_API_KEY || "").trim();

function readKeyFile() {
  try {
    if (existsSync(KEY_FILE)) return readFileSync(KEY_FILE, "utf8").trim();
  } catch {}
  return "";
}

function saveKeyFile(key) {
  try {
    writeFileSync(KEY_FILE, `${key}\n`, { mode: 0o600 });
    console.log(`Clave guardada en ${KEY_FILE} (no se volverá a pedir).`);
  } catch (err) {
    console.warn("No se pudo guardar la clave:", err?.message || err);
  }
}

export function getSteamApiKey() {
  return apiKey;
}

export function setSteamApiKey(key) {
  apiKey = (key || "").trim();
  process.env.STEAM_API_KEY = apiKey;
}

function looksValid(key) {
  return /^[A-Fa-f0-9]{32}$/.test(key);
}

/**
 * Asegura que haya una Steam API key.
 * Orden: STEAM_API_KEY -> archivo .steam_key -> pregunta en la terminal.
 * Con STEAM_ASK_ALWAYS=true siempre pregunta.
 */
export async function ensureSteamApiKey() {
  const askAlways = process.env.STEAM_ASK_ALWAYS === "true";

  if (!askAlways) {
    if (apiKey) return apiKey;
    const fromFile = readKeyFile();
    if (fromFile) {
      setSteamApiKey(fromFile);
      return apiKey;
    }
  }

  if (!process.stdin.isTTY) {
    console.warn(
      "No hay STEAM_API_KEY y la terminal no es interactiva: las consultas a Steam fallarán.",
    );
    return apiKey;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("\nNecesito tu clave de la Steam Web API.");
    console.log("Consíguela gratis en: https://steamcommunity.com/dev/apikey\n");
    for (let intento = 0; intento < 3; intento++) {
      const answer = (await rl.question("Steam API key: ")).trim();
      if (!answer) {
        console.log("No escribiste nada. Puedes pulsar Ctrl+C para salir.");
        continue;
      }
      if (!looksValid(answer)) {
        console.log("Eso no parece una clave válida (32 caracteres hexadecimales). Inténtalo de nuevo.");
        continue;
      }
      setSteamApiKey(answer);
      const guardar = (await rl.question("¿Guardarla para la próxima vez? (S/n): ")).trim().toLowerCase();
      if (guardar !== "n" && guardar !== "no") saveKeyFile(answer);
      return apiKey;
    }
    console.warn("Sin clave válida: las consultas a Steam no funcionarán.");
    return apiKey;
  } finally {
    rl.close();
  }
}
