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
  const provider = (process.env.AI_PROVIDER || "").trim().toLowerCase();
  const oldGroqModels = new Set(["llama-3.1-8b-instant"]);
  if (provider === "groq" && oldGroqModels.has((process.env.AI_MODEL || "").trim())) {
    process.env.AI_MODEL = "openai/gpt-oss-20b";
    content = content.replace(/^AI_MODEL\s*=.*$/m, "AI_MODEL=openai/gpt-oss-20b");
    if (!/^AI_MODEL\s*=/m.test(content)) content += "\nAI_MODEL=openai/gpt-oss-20b\n";
    try {
      writeFileSync(file, content, { mode: 0o600 });
      console.log("Configuración migrada automáticamente: modelo Groq actualizado.");
    } catch (error) {
      console.warn("No se pudo guardar la migración de .env; se usará durante esta ejecución:", error?.message || error);
    }
  }
}
