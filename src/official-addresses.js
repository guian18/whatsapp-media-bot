import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const DEFAULT_FILE = "l4d2-official-addresses.txt";

function outputPath() {
  const configured = String(process.env.OFFICIAL_ADDRESSES_FILE || "").trim();
  if (configured) return configured;
  const isTermux = Boolean(process.env.TERMUX_VERSION) || String(process.env.PREFIX || "").includes("com.termux");
  return isTermux
    ? join(homedir(), "storage", "downloads", DEFAULT_FILE)
    : join(process.cwd(), DEFAULT_FILE);
}

function isPublicIpv4(ip) {
  return /^(?!10\.)(?!127\.)(?!169\.254\.)(?!192\.168\.)(?!172\.(1[6-9]|2\d|3[01])\.)(?!224\.)(?!0\.)(?:\d{1,3}\.){3}\d{1,3}$/.test(ip);
}

export function formatOfficialAddresses(servers) {
  return [...new Set(
    (servers || [])
      .filter(({ ip, port }) => isPublicIpv4(ip) && Number.isInteger(port) && port > 0 && port <= 65535)
      .map(({ ip, port }) => `${ip}:${port}`)
  )].sort();
}

export function saveOfficialAddresses(servers) {
  const addresses = formatOfficialAddresses(servers);
  if (!addresses.length) return { count: 0, path: outputPath() };
  const file = outputPath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${addresses.join("\n")}\n`, { mode: 0o600 });
  return { count: addresses.length, path: file };
}

export { outputPath as officialAddressesPath };
