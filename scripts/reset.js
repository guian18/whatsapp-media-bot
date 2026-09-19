// Borra la sesión de WhatsApp para volver a vincular (QR o código).
// Uso: npm run reset      (o npm run relink para borrar y arrancar de nuevo)
import "../src/env.js";
import { existsSync, rmSync } from "node:fs";
import { getAuthDir } from "../src/config.js";

const dir = getAuthDir();
if (!dir || dir === "/" || dir === ".") {
  throw new Error(`Ruta de sesión insegura: ${dir || "vacía"}`);
}

if (existsSync(dir)) {
  rmSync(dir, { recursive: true, force: true });
  console.log(`Sesión borrada (${dir}). Ejecuta "npm start" para vincular de nuevo.`);
} else {
  console.log(`No hay sesión guardada en ${dir}; nada que borrar.`);
}
