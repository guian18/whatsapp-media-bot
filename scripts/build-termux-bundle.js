import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const dist = join(root, "dist");
const archive = join(dist, "infoplayerleft-termux.zip");

rmSync(archive, { force: true });
mkdirSync(dist, { recursive: true });

const result = spawnSync("zip", ["-r", archive, "bot.js", "package.json", "package-lock.json", ".env.example", "README.md", "src", "scripts"], {
  cwd: root,
  stdio: "inherit",
});
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`Bundle Termux creado: ${archive}`);
