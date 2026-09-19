// Gestión de la Steam Web API key: variable de entorno, archivo local,
// pregunta en la terminal al arrancar o formulario de la página web.
import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
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
    chmodSync(KEY_FILE, 0o600);
    console.log(`Clave guardada en ${KEY_FILE} (no se volverá a pedir).`);
    return true;
  } catch (err) {
    console.warn("No se pudo guardar la clave:", err?.message || err);
    return false;
  }
}

export function getSteamApiKey() {
  return apiKey;
}

export function setSteamApiKey(key) {
  apiKey = (key || "").trim();
  process.env.STEAM_API_KEY = apiKey;
}

export function looksValidSteamKey(key) {
  return /^[A-Fa-f0-9]{32}$/.test((key || "").trim());
}

/** Guarda la clave (usado por el formulario de la web). Devuelve true si es válida. */
export function guardarSteamApiKey(key, persistir = true) {
  const limpia = (key || "").trim();
  if (!looksValidSteamKey(limpia)) return false;
  setSteamApiKey(limpia);
  if (persistir) saveKeyFile(limpia);
  return true;
}

/**
 * Asegura que haya una Steam API key antes de arrancar el bot.
 *
 * Orden: archivo .steam_key → variable STEAM_API_KEY → preguntar en la terminal.
 * En una terminal (Termux, PC) SIEMPRE se pregunta si no hay una clave válida.
 * Con STEAM_ASK_ALWAYS=true pregunta aunque ya haya una guardada.
 * Sin terminal (Docker u otro servicio) se usa la variable/el archivo, o se puede
 * escribir la clave en la página web.
 */
export async function ensureSteamApiKey() {
  const askAlways = process.env.STEAM_ASK_ALWAYS === "true";
  const interactivo = Boolean(process.stdin.isTTY);

  // 1) Clave guardada en el archivo
  const fromFile = readKeyFile();
  if (fromFile && looksValidSteamKey(fromFile)) setSteamApiKey(fromFile);

  // 2) Clave ya válida (archivo o variable de entorno / .env)
  if (looksValidSteamKey(apiKey) && !askAlways) {
    const origen = fromFile && fromFile === apiKey ? KEY_FILE : "STEAM_API_KEY";
    console.log(
      `Steam API key cargada desde ${origen}. ` +
        `Para cambiarla: borra ${KEY_FILE} (o arranca con STEAM_ASK_ALWAYS=true).`,
    );
    return apiKey;
  }

  if (apiKey && !looksValidSteamKey(apiKey)) {
    console.warn("La STEAM_API_KEY configurada no parece válida (32 caracteres hexadecimales).");
    setSteamApiKey("");
  }

  // 3) Sin terminal: no se puede preguntar
  if (!interactivo) {
    console.warn(
      "No hay Steam API key y la terminal no es interactiva.\n" +
        "Configura STEAM_API_KEY o escríbela en la página web (/qr).",
    );
    return apiKey;
  }

  // 4) Preguntar en la terminal
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  try {
    console.log("\n==============================================");
    console.log(" Necesito tu clave personal de la Steam Web API");
    console.log(" Consíguela gratis en: https://steamcommunity.com/dev/apikey");
    console.log(" (32 caracteres, letras y números. Enter para omitir.)");
    console.log("==============================================");
    for (let intento = 0; intento < 3; intento++) {
      const answer = (await rl.question("Steam API key: ")).trim();
      if (!answer) {
        console.log("Sin clave: los comandos de Steam no funcionarán (puedes añadirla luego).");
        return apiKey;
      }
      if (!looksValidSteamKey(answer)) {
        console.log("Eso no parece una clave válida (32 caracteres hexadecimales). Inténtalo otra vez.");
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
