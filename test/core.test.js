import assert from "node:assert/strict";
import dgram from "node:dgram";
import http from "node:http";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { parseAddress, serverInfo } from "../src/a2s.js";
import { formatOfficialAddresses } from "../src/official-addresses.js";
import { SCAN_INTERVAL_MS } from "../src/watcher.js";
import { ayuda, cmdBuscar, cmdInfo, cmdServidor, handleCommand } from "../src/commands.js";
import { aiConfigured, cmdIA, containsRisk, detectStyle } from "../src/ai.js";
import { looksValidSteamKey } from "../src/steamkey.js";

test("command dispatcher serves local commands without external services", async () => {
  const previousProvider = process.env.AI_PROVIDER;
  const previousAiKey = process.env.AI_API_KEY;
  const previousPingDeadChance = process.env.PING_DEAD_CHANCE;
  const previousPingTripChance = process.env.PING_TRIP_CHANCE;
  process.env.AI_PROVIDER = "groq";
  process.env.AI_API_KEY = "";
  process.env.PING_DEAD_CHANCE = "0";
  process.env.PING_TRIP_CHANCE = "0";
  assert.equal(await handleCommand("!ping"), "Pong! 🏓");
  assert.equal(await handleCommand("!PING"), "Pong! 🏓");
  assert.equal(await handleCommand("!desconocido"), null);
  assert.equal(await handleCommand("texto normal"), null);
  assert.match(await handleCommand("!ayuda"), /!info/);
  assert.match(await handleCommand("!ayuda"), /!ai.*!ia.*pregunta/);
  assert.match(await handleCommand("!ai"), /Uso: `!ai/);
  assert.match(await handleCommand("!ai pregunta directa"), /AI_API_KEY/);
  assert.match(await handleCommand("!AI pregunta directa"), /AI_API_KEY/);
  assert.match(await handleCommand("!IA pregunta directa"), /AI_API_KEY/);
  assert.match(await handleCommand("!tono"), /Tonos:/);
  assert.match(await handleCommand("!tono desconocido"), /Tono no válido/);
  assert.match(await handleCommand("!idioma"), /Idiomas:/);
  assert.match(await handleCommand("!idioma klingon"), /Idioma no válido/);
  assert.match(await handleCommand("!proveedor"), /Proveedores:/);
  assert.match(await handleCommand("!proveedor"), /local.*gemini.*groq.*mistral.*openrouter/);
  assert.match(await handleCommand("!proveedor openai"), /Proveedor no válido/);
  assert.match(await handleCommand("!proveedor claude"), /Proveedor no válido/);
  assert.match(await handleCommand("!proveedor desconocido"), /Proveedor no válido/);
  assert.match(await handleCommand("!vigilar jugador"), /No se pudo identificar este chat/);
  assert.match(await handleCommand("!novigilar"), /No estaba vigilando/);
  assert.match(await handleCommand("!anime"), /solo está disponible desde WhatsApp/);
  assert.match(await handleCommand("!escaneo"), /solo está disponible desde WhatsApp/);
  assert.match(await handleCommand("!help"), /!proveedor/);
  assert.match(await handleCommand("!lista", { jid: "test@s.whatsapp.net" }), /No vigilas/);
  if (previousProvider === undefined) delete process.env.AI_PROVIDER;
  else process.env.AI_PROVIDER = previousProvider;
  if (previousAiKey === undefined) delete process.env.AI_API_KEY;
  else process.env.AI_API_KEY = previousAiKey;
  if (previousPingDeadChance === undefined) delete process.env.PING_DEAD_CHANCE;
  else process.env.PING_DEAD_CHANCE = previousPingDeadChance;
  if (previousPingTripChance === undefined) delete process.env.PING_TRIP_CHANCE;
  else process.env.PING_TRIP_CHANCE = previousPingTripChance;
  assert.equal(await cmdInfo(""), "Uso: `!info <steamid64 | vanity | url del perfil>`");
  assert.match(await cmdBuscar(""), /Uso: `!buscar/);
  assert.match(await cmdServidor("sin-puerto"), /Uso: `!servidor/);
  assert.match(ayuda(), /!jugadores/);
});

test("address and Steam-key validation reject malformed input", () => {
  const previousPrivateServers = process.env.ALLOW_PRIVATE_SERVERS;
  process.env.ALLOW_PRIVATE_SERVERS = "true";
  assert.deepEqual(parseAddress("8.8.8.8:27015"), { ip: "8.8.8.8", port: 27015 });
  assert.deepEqual(parseAddress("server.example.org:12345"), {
    ip: "server.example.org",
    port: 12345,
  });
  assert.deepEqual(parseAddress("localhost:27015"), { ip: "localhost", port: 27015 });
  assert.deepEqual(parseAddress("127.0.0.1:27015"), { ip: "127.0.0.1", port: 27015 });
  assert.deepEqual(parseAddress("192.168.1.20:27015"), { ip: "192.168.1.20", port: 27015 });
  process.env.ALLOW_PRIVATE_SERVERS = "false";
  assert.equal(parseAddress("127.0.0.1:27015"), null);
  assert.equal(parseAddress("localhost:27015"), null);
  assert.equal(parseAddress("127.0.0.1:0"), null);
  assert.equal(parseAddress("127.0.0.1:65536"), null);
  assert.equal(looksValidSteamKey("0123456789abcdef0123456789ABCDEF"), true);
  assert.equal(looksValidSteamKey("not-a-key"), false);
  if (previousPrivateServers === undefined) delete process.env.ALLOW_PRIVATE_SERVERS;
  else process.env.ALLOW_PRIVATE_SERVERS = previousPrivateServers;
});

test("A2S rejects an undefined or invalid port before sending UDP", async () => {
  await assert.rejects(() => serverInfo("8.8.8.8", undefined), {
    name: "RangeError",
    message: "puerto A2S inválido: undefined",
  });
  await assert.rejects(() => serverInfo("8.8.8.8", 0), {
    name: "RangeError",
    message: "puerto A2S inválido: 0",
  });
});

test("A2S sends queries with an explicit UDP destination", async (t) => {
  const socket = dgram.createSocket("udp4");
  t.after(() => socket.close());
  socket.on("message", (_message, remote) => {
    const response = Buffer.concat([
      Buffer.from([0xff, 0xff, 0xff, 0xff, 0x49, 17]),
      Buffer.from("Test server\0de_dust2\0left4dead2\0Left 4 Dead 2\0"),
      Buffer.from([0x2f, 0x09, 0x00, 0x00, 0x00, 0x04, 0x10, 0x00]),
    ]);
    socket.send(response, remote.port, remote.address);
  });
  await new Promise((resolve) => socket.bind(0, "127.0.0.1", resolve));
  const address = socket.address();

  const info = await serverInfo("127.0.0.1", address.port);
  assert.equal(info.name, "Test server");
  assert.equal(info.map, "de_dust2");
});

test("watcher never scans more often than every 50 seconds", () => {
  assert.ok(SCAN_INTERVAL_MS >= 50_000);
});

test("official address export keeps public IP and port only", () => {
  assert.deepEqual(formatOfficialAddresses([
    { ip: "8.8.8.8", port: 27015 },
    { ip: "8.8.8.8", port: 27015 },
    { ip: "192.168.1.20", port: 27015 },
    { ip: "0.0.0.0", port: 0 },
  ]), ["8.8.8.8:27015"]);
});

test("AI detects crisis-risk phrases without requiring an API", () => {
  assert.equal(containsRisk("no quiero vivir"), true);
  assert.equal(containsRisk("quiero consultar el mapa"), false);
});

test("local AI provider does not require an API key", () => {
  const previousProvider = process.env.AI_PROVIDER;
  const previousKey = process.env.AI_API_KEY;
  const previousLocalKey = process.env.AI_LOCAL_API_KEY;
  process.env.AI_PROVIDER = "local";
  delete process.env.AI_API_KEY;
  delete process.env.AI_LOCAL_API_KEY;
  assert.equal(aiConfigured(), true);
  if (previousProvider === undefined) delete process.env.AI_PROVIDER;
  else process.env.AI_PROVIDER = previousProvider;
  if (previousKey === undefined) delete process.env.AI_API_KEY;
  else process.env.AI_API_KEY = previousKey;
  if (previousLocalKey === undefined) delete process.env.AI_LOCAL_API_KEY;
  else process.env.AI_LOCAL_API_KEY = previousLocalKey;
});

test("local AI provider accepts an OpenAI-compatible response", async (t) => {
  const server = http.createServer((request, response) => {
    if (request.method !== "POST") {
      response.writeHead(404).end();
      return;
    }
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ choices: [{ message: { content: "Respuesta local de prueba" } }] }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const previousProvider = process.env.AI_PROVIDER;
  const previousUrl = process.env.AI_LOCAL_URL;
  const previousKey = process.env.AI_LOCAL_API_KEY;
  const previousInterval = process.env.AI_MIN_INTERVAL_MS;
  const previousFetch = globalThis.fetch;
  process.env.AI_PROVIDER = "local";
  process.env.AI_LOCAL_URL = `http://127.0.0.1:${server.address().port}/v1/chat/completions`;
  delete process.env.AI_LOCAL_API_KEY;
  process.env.AI_MIN_INTERVAL_MS = "0";
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith("https://html.duckduckgo.com/")) return new Response("", { status: 200 });
    return previousFetch(url, options);
  };

  try {
    assert.match(await cmdIA("prueba local"), /Respuesta local de prueba/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = previousProvider;
    if (previousUrl === undefined) delete process.env.AI_LOCAL_URL;
    else process.env.AI_LOCAL_URL = previousUrl;
    if (previousKey === undefined) delete process.env.AI_LOCAL_API_KEY;
    else process.env.AI_LOCAL_API_KEY = previousKey;
    if (previousInterval === undefined) delete process.env.AI_MIN_INTERVAL_MS;
    else process.env.AI_MIN_INTERVAL_MS = previousInterval;
  }
});

test("local AI timeout returns an actionable message", async () => {
  const previousProvider = process.env.AI_PROVIDER;
  const previousUrl = process.env.AI_LOCAL_URL;
  const previousInterval = process.env.AI_MIN_INTERVAL_MS;
  const previousTimeout = process.env.AI_LOCAL_TIMEOUT_MS;
  const previousFetch = globalThis.fetch;
  process.env.AI_PROVIDER = "local";
  process.env.AI_LOCAL_URL = "http://127.0.0.1:8080/v1/chat/completions";
  process.env.AI_MIN_INTERVAL_MS = "0";
  process.env.AI_LOCAL_TIMEOUT_MS = "3000";
  globalThis.fetch = async (url) => {
    if (String(url).startsWith("https://html.duckduckgo.com/")) return new Response("", { status: 200 });
    throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  };

  try {
    const response = await cmdIA("prueba de tiempo de espera");
    assert.match(response, /llama\.cpp tardó más de 3 segundos/);
    assert.match(response, /AI_LOCAL_TIMEOUT_MS/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = previousProvider;
    if (previousUrl === undefined) delete process.env.AI_LOCAL_URL;
    else process.env.AI_LOCAL_URL = previousUrl;
    if (previousInterval === undefined) delete process.env.AI_MIN_INTERVAL_MS;
    else process.env.AI_MIN_INTERVAL_MS = previousInterval;
    if (previousTimeout === undefined) delete process.env.AI_LOCAL_TIMEOUT_MS;
    else process.env.AI_LOCAL_TIMEOUT_MS = previousTimeout;
  }
});

test("environment loader applies values from the configured .env file", (t) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "infoplayerleft-env-"));
  const envFile = path.join(dir, ".env");
  writeFileSync(envFile, "# test fixture\nTEST_ENV_LOAD=loaded-from-file\n", "utf8");
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const childEnv = { ...process.env, ENV_FILE: envFile };
  delete childEnv.TEST_ENV_LOAD;
  const result = spawnSync(process.execPath, ["fixtures/env-loader-child.js"], {
    cwd: process.cwd(),
    env: childEnv,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("env example contains variables only", () => {
  const lines = readFileSync(".env.example", "utf8").split(/\r?\n/).filter(Boolean);
  assert.ok(lines.length > 0);
  assert.equal(lines.some((line) => line.trimStart().startsWith("#")), false);
});

test("ai detects the tone used in the question", () => {
  assert.equal(detectStyle("por favor, informe formalmente"), "formal");
  assert.equal(detectStyle("jaja cuéntame algo divertido"), "divertido");
  assert.equal(detectStyle("responde breve y rápido"), "breve");
  assert.equal(detectStyle("¡contesta ya!!"), "agresivo");
  assert.equal(detectStyle("hola, ayúdame porfa"), "amable");
  assert.equal(detectStyle("usa el tono de insulto"), "insultos");
  assert.equal(detectStyle("consulta normal"), null);
});

test("environment loader migrates the deprecated Groq model", (t) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "infoplayerleft-migration-"));
  const envFile = path.join(dir, ".env");
  writeFileSync(envFile, "AI_PROVIDER=groq\nAI_MODEL=llama-3.1-8b-instant\n", "utf8");
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const childEnv = { ...process.env, ENV_FILE: envFile, TEST_ENV_LOAD: "loaded-from-file", TEST_ENV_MIGRATION: "1" };
  const result = spawnSync(process.execPath, ["fixtures/env-loader-child.js"], {
    cwd: process.cwd(),
    env: childEnv,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(readFileSync(envFile, "utf8"), /AI_MODEL=openai\/gpt-oss-20b/);
});

test("environment loader preserves explicit local provider with a Groq key", (t) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "infoplayerleft-local-provider-"));
  const envFile = path.join(dir, ".env");
  writeFileSync(envFile, "AI_PROVIDER=local\nAI_API_KEY=gsk_preserved\nAI_MODEL=local-model\n", "utf8");
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const childEnv = { ...process.env, ENV_FILE: envFile, TEST_ENV_LOAD: "loaded-from-file" };
  delete childEnv.AI_PROVIDER;
  delete childEnv.AI_API_KEY;
  delete childEnv.AI_MODEL;
  const result = spawnSync(process.execPath, ["fixtures/env-loader-child.js"], {
    cwd: process.cwd(),
    env: childEnv,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(readFileSync(envFile, "utf8"), /AI_PROVIDER=local/);
  assert.match(readFileSync(envFile, "utf8"), /AI_API_KEY=gsk_preserved/);
});
