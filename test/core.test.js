import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { parseAddress } from "../src/a2s.js";
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
  assert.deepEqual(parseAddress("8.8.8.8:27015"), { ip: "8.8.8.8", port: 27015 });
  assert.deepEqual(parseAddress("server.example.org:12345"), {
    ip: "server.example.org",
    port: 12345,
  });
  assert.equal(parseAddress("127.0.0.1"), null);
  assert.equal(parseAddress("127.0.0.1:27015"), null);
  assert.equal(parseAddress("127.0.0.1:0"), null);
  assert.equal(parseAddress("127.0.0.1:65536"), null);
  assert.equal(looksValidSteamKey("0123456789abcdef0123456789ABCDEF"), true);
  assert.equal(looksValidSteamKey("not-a-key"), false);
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
