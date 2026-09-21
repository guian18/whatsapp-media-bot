const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

function collect(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".expo") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collect(path));
    else if (entry.isFile() && path.endsWith(".js")) files.push(path);
  }
  return files;
}

const files = collect(process.cwd());
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`JavaScript válido: ${files.length} archivos.`);
