// Carga las variables del archivo .env (sin dependencias externas).
// Se importa al principio de bot.js, antes de leer process.env.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const file = process.env.ENV_FILE || ".env";

if (existsSync(file)) {
  let content = readFileSync(file, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined && value !== "") {
      process.env[key] = value;
    }
  }

  // Migra automáticamente configuraciones antiguas para que una actualización
  // del bot no obligue a editar .env a mano.
  let provider = (process.env.AI_PROVIDER || "").trim().toLowerCase();
  const apiKey = (process.env.AI_API_KEY || "").trim();
  const oldGroqModels = new Set(["llama-3.1-8b-instant"]);
  let migrated = false;
  const setEnvLine = (key, value) => {
    process.env[key] = value;
    const pattern = new RegExp(`^${key}\\s*=.*$`, "m");
    if (pattern.test(content)) content = content.replace(pattern, `${key}=${value}`);
    else content += `\n${key}=${value}\n`;
    migrated = true;
  };

  // Una clave gsk_ identifica Groq aunque el .env provenga de una versión vieja.
  if (apiKey.startsWith("gsk_") && provider !== "groq") {
    provider = "groq";
    setEnvLine("AI_PROVIDER", "groq");
  }
  if (provider === "groq" && oldGroqModels.has((process.env.AI_MODEL || "").trim())) {
    setEnvLine("AI_MODEL", "openai/gpt-oss-20b");
  }
  if (provider === "groq" && (process.env.AI_API_URL || "").includes("api.openai.com")) {
    setEnvLine("AI_API_URL", "");
  }
  if ((process.env.AI_DEFAULT_STYLE || "").trim().toLowerCase() === "tranquilo") {
    setEnvLine("AI_DEFAULT_STYLE", "insultos");
  }
  if (!/^WATCH_INTERVAL_SECONDS\s*=/m.test(content)) {
    setEnvLine("WATCH_INTERVAL_SECONDS", "1");
  }
  if (migrated) {
    try {
      writeFileSync(file, content, { mode: 0o600 });
      console.log("Configuración de Groq migrada automáticamente.");
    } catch (error) {
      console.warn("No se pudo guardar la migración de .env; se usará durante esta ejecución:", error?.message || error);
    }
  }
}
