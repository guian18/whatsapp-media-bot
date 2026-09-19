import { spawnSync } from "node:child_process";

if (process.env.TERMUX_VERSION || process.env.PREFIX?.includes("com.termux")) {
  const result = spawnSync("termux-wake-lock", [], { stdio: "ignore" });
  if (result.error && result.error.code !== "ENOENT") {
    console.warn("No se pudo activar termux-wake-lock:", result.error.message);
  }
}

await import("../bot.js");
