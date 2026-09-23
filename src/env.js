// Carga las variables del archivo .env (sin dependencias externas).
// Las variables ya definidas por el hosting siempre tienen prioridad.
import { readFileSync, existsSync } from "node:fs";

const file = process.env.ENV_FILE || ".env";
if (existsSync(file)) {
  const content = readFileSync(file, "utf8");
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
}
