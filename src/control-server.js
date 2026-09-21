import http from "node:http";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { normalizePrivateJid } from "./owner-notifications.js";
import { parseCommandAliases } from "./command-aliases.js";

const ALLOWED_SETTINGS = new Set([
  "AI_PROVIDER",
  "AI_MODEL",
  "AI_API_URL",
  "AI_LOCAL_URL",
  "AI_MAX_TOKENS",
  "AI_LOCAL_TIMEOUT_MS",
  "AI_LANGUAGE",
  "AI_DEFAULT_STYLE",
  "AI_LOCAL_SKIP_SEARCH",
  "AI_LOCAL_FAST",
  "CONTROL_NOTIFY_JID",
  "COMMAND_ALIASES",
]);
const PROVIDERS = new Set(["local", "groq", "gemini", "mistral", "openrouter"]);

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "Authorization, Content-Type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
  });
  res.end(JSON.stringify(body));
}

function authorized(req, token) {
  if (!token) return false;
  const value = req.headers.authorization || "";
  return value === `Bearer ${token}`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 32_000) reject(new Error("cuerpo demasiado grande"));
    });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error("JSON inválido")); }
    });
    req.on("error", reject);
  });
}

function updateEnvFile(file, values) {
  let content = existsSync(file) ? readFileSync(file, "utf8") : "";
  const changed = {};
  for (const [key, value] of Object.entries(values)) {
    if (!ALLOWED_SETTINGS.has(key)) continue;
    const line = `${key}=${String(value)}`;
    const pattern = new RegExp(`^${key}\s*=.*$`, "m");
    const previous = content.match(new RegExp(`^${key}\s*=(.*)$`, "m"))?.[1]?.trim();
    if (previous !== String(value)) changed[key] = value;
    content = pattern.test(content) ? content.replace(pattern, line) : `${content.trimEnd()}\n${line}\n`;
    process.env[key] = String(value);
  }
  writeFileSync(file, content, { mode: 0o600 });
  return changed;
}

function validSettings(body) {
  const provider = String(body.provider || "local").toLowerCase();
  if (!PROVIDERS.has(provider)) throw new Error("proveedor no válido");
  const maxTokens = Number(body.maxTokens);
  const timeoutMs = Number(body.timeoutMs);
  if (!Number.isInteger(maxTokens) || maxTokens < 8 || maxTokens > 4096) throw new Error("maxTokens debe estar entre 8 y 4096");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 600000) throw new Error("timeoutMs no válido");
  const url = String(body.llamaUrl || "").trim();
  if (!/^https?:\/\//i.test(url)) throw new Error("llamaUrl debe ser una URL HTTP(S)");
  const notificationJid = String(body.notificationJid || "").trim();
  const aliasesText = String(body.commandAliases || "").trim();
  if (notificationJid) normalizePrivateJid(notificationJid);
  parseCommandAliases(aliasesText);
  return {
    AI_PROVIDER: provider,
    AI_MODEL: String(body.model || "local-model").trim().slice(0, 160),
    ...(provider === "local" ? { AI_LOCAL_URL: url.slice(0, 500), AI_API_URL: "" } : { AI_API_URL: url.slice(0, 500) }),
    AI_MAX_TOKENS: maxTokens,
    AI_LOCAL_TIMEOUT_MS: timeoutMs,
    AI_LANGUAGE: String(body.language || "es-ES").trim().slice(0, 20),
    AI_DEFAULT_STYLE: String(body.tone || "breve").trim().slice(0, 40),
    AI_LOCAL_SKIP_SEARCH: body.skipSearch === false ? "false" : "true",
    AI_LOCAL_FAST: body.fastMode === false ? "false" : "true",
    ...(notificationJid ? { CONTROL_NOTIFY_JID: normalizePrivateJid(notificationJid) } : { CONTROL_NOTIFY_JID: "" }),
    COMMAND_ALIASES: aliasesText,
  };
}

export function startControlServer({ getStatus, testAI, notifySettingsChange = async () => {} }) {
  const token = (process.env.CONTROL_API_TOKEN || "").trim();
  const port = Number(process.env.CONTROL_API_PORT || 8787);
  const host = process.env.CONTROL_API_HOST || "127.0.0.1";
  if (!token) {
    console.warn("API de control desactivada: falta CONTROL_API_TOKEN.");
    return null;
  }
  const envFile = process.env.ENV_FILE || ".env";
  const server = http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") return json(res, 204, {});
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (!url.pathname.startsWith("/api/control/")) return json(res, 404, { error: "No encontrado" });
    if (!authorized(req, token)) return json(res, 401, { error: "No autorizado" });
    try {
      if (req.method === "GET" && url.pathname === "/api/control/status") return json(res, 200, getStatus());
      if (req.method === "GET" && url.pathname === "/api/control/health") return json(res, 200, { ok: true, service: "infoplayerleft-control" });
      if (req.method === "POST" && url.pathname === "/api/control/settings") {
        const settings = validSettings(await readBody(req));
        const changed = updateEnvFile(envFile, settings);
        if (Object.keys(changed).length) await notifySettingsChange(changed);
        return json(res, 200, { ok: true, settings: { provider: settings.AI_PROVIDER, model: settings.AI_MODEL } });
      }
      if (req.method === "POST" && url.pathname === "/api/control/test-ai") {
        const body = await readBody(req);
        const question = String(body.question || "Responde solo OK").slice(0, 600);
        const answer = await testAI(question);
        return json(res, 200, { ok: true, answer });
      }
      return json(res, 404, { error: "Ruta no encontrada" });
    } catch (error) {
      return json(res, 400, { error: error?.message || "Solicitud inválida" });
    }
  });
  server.listen(port, host, () => console.log(`API de control activa en ${host}:${port}`));
  return server;
}
