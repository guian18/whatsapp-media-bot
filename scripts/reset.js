// Borra la sesión de WhatsApp para volver a vincular (QR o código).
// Uso: npm run reset      (o npm run relink para borrar y arrancar de nuevo)
import { rmSync, existsSync } from "node:fs";

const dir = process.env.AUTH_DIR || "auth_info";

if (existsSync(dir)) {
  rmSync(dir, { recursive: true, force: true });
  console.log(`Sesión borrada (${dir}). Ejecuta "npm start" para vincular de nuevo.`);
} else {
  console.log(`No hay sesión guardada en ${dir}; nada que borrar.`);
}
