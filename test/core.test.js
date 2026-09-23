import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import axios from "axios";

import { ayuda, handleCommand } from "../src/commands.js";

test("command dispatcher serves retained commands without external services", async () => {
  assert.equal(await handleCommand("!ping"), "Pong! 🏓 El bot está activo y listo.");
  assert.equal(await handleCommand("!PING"), "Pong! 🏓 El bot está activo y listo.");
  assert.equal(await handleCommand("!desconocido"), null);
  assert.equal(await handleCommand("texto normal"), null);
  const help = await handleCommand("!ayuda");
  assert.match(help, /menú principal.*!ping.*!anime/s);
});

test("help exposes only retained bot commands", () => {
  const text = ayuda();
  assert.match(text, /WhatsApp Media Bot/);
});

test("SFW anime requests use the fixed Nekobot provider", async (t) => {
  const originalGet = axios.get;
  const sent = [];
  axios.get = async (url, options) => {
    assert.match(url, /nekobot\.xyz\/api\/image/);
    assert.deepEqual(options.params, { type: "neko" });
    return { data: { success: true, message: "https://nekobot.xyz/api/sfw/neko.jpg" } };
  };
  t.after(() => { axios.get = originalGet; });
  assert.equal(await handleCommand("!anime", {
    jid: "sfw-nekobot",
    sendMessage: async (_jid, payload) => sent.push(payload),
  }), null);
  assert.equal(sent.length, 1);
  assert.match(sent[0].caption, /Fuente: nekobot/);
});

test("environment loader applies values from the configured .env file", (t) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "whatsapp-media-bot-env-"));
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
