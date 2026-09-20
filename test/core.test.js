import assert from "node:assert/strict";
import dgram from "node:dgram";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { parseAddress, serverInfo } from "../src/a2s.js";
import { SCAN_INTERVAL_MS } from "../src/watcher.js";
import { ayuda, cmdBuscar, cmdInfo, cmdServidor, handleCommand } from "../src/commands.js";
import { detectStyle } from "../src/ai.js";
import { looksValidSteamKey } from "../src/steamkey.js";

test("command dispatcher serves local commands without external services", async () => {
  const previousAiKey = process.env.AI_API_KEY;
  const previousOpenAiKey = process.env.OPENAI_API_KEY;
  const previousPingDeadChance = process.env.PING_DEAD_CHANCE;
  const previousPingTripChance = process.env.PING_TRIP_CHANCE;
  process.env.AI_API_KEY = "";
  process.env.OPENAI_API_KEY = "";
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
  assert.match(await handleCommand("!proveedor desconocido"), /Proveedor no válido/);
  assert.match(await handleCommand("!lista", { jid: "test@s.whatsapp.net" }), /No vigilas/);
  if (previousAiKey === undefined) delete process.env.AI_API_KEY;
  else process.env.AI_API_KEY = previousAiKey;
  if (previousOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = previousOpenAiKey;
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
