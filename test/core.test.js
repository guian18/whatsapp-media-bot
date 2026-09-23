import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import axios from "axios";

import { ayuda, handleCommand } from "../src/commands.js";

test("command dispatcher serves local commands without external services", async () => {
  const previousPingDeadChance = process.env.PING_DEAD_CHANCE;
  const previousPingTripChance = process.env.PING_TRIP_CHANCE;
  process.env.PING_DEAD_CHANCE = "0";
  process.env.PING_TRIP_CHANCE = "0";
  assert.equal(await handleCommand("!ping"), "Pong! 🏓");
  assert.equal(await handleCommand("!PING"), "Pong! 🏓");
  assert.equal(await handleCommand("!desconocido"), null);
  assert.equal(await handleCommand("texto normal"), null);
  const help = await handleCommand("!ayuda");
  assert.match(help, /!ping.*!anime.*!nsfw/s);
  assert.equal(await handleCommand("!video"), null);
  if (previousPingDeadChance === undefined) delete process.env.PING_DEAD_CHANCE;
  else process.env.PING_DEAD_CHANCE = previousPingDeadChance;
  if (previousPingTripChance === undefined) delete process.env.PING_TRIP_CHANCE;
  else process.env.PING_TRIP_CHANCE = previousPingTripChance;
});

test("help exposes only retained bot commands", () => {
  const text = ayuda();
  assert.match(text, /WhatsApp Media Bot/);
  assert.match(text, /!nsfwproveedor/);
});

test("SFW provider selection is separate from NSFW providers", async () => {
  const previous = process.env.SFW_PROVIDER;
  delete process.env.SFW_PROVIDER;
  assert.match(await handleCommand("!sfwproveedor list"), /nekosbest/);
  assert.match(await handleCommand("!sfwproveedor nekosbest"), /fijado manualmente/);
  assert.equal(process.env.SFW_PROVIDER, "nekosbest");
  assert.match(await handleCommand("!sfwproveedor rule34"), /no válido/);
  if (previous === undefined) delete process.env.SFW_PROVIDER;
  else process.env.SFW_PROVIDER = previous;
});

test("SFW anime requests can use Nekobot", async (t) => {
  const originalGet = axios.get;
  const previous = process.env.SFW_PROVIDER;
  process.env.SFW_PROVIDER = "nekobot";
  const sent = [];
  axios.get = async (url, options) => {
    assert.match(url, /nekobot\.xyz\/api\/image/);
    assert.equal(options.params.type, "neko");
    return { data: { success: true, message: "https://nekobot.xyz/api/sfw/neko.jpg" } };
  };
  t.after(() => {
    axios.get = originalGet;
    if (previous === undefined) delete process.env.SFW_PROVIDER;
    else process.env.SFW_PROVIDER = previous;
  });
  assert.equal(await handleCommand("!anime", {
    jid: "sfw-nekobot",
    sendMessage: async (_jid, payload) => sent.push(payload),
  }), null);
  assert.equal(sent.length, 1);
  assert.match(sent[0].caption, /Fuente: nekobot/);
});

test("SFW anime requests can use safe booru providers", async (t) => {
  const originalGet = axios.get;
  const previous = process.env.SFW_PROVIDER;
  const sent = [];
  axios.get = async (url, options) => {
    assert.match(url, /safebooru|konachan/);
    assert.match(String(options.params.tags), /rating:safe/);
    return {
      data: [{ rating: "safe", tags: "rating:safe", file_url: `https://${url.includes("safebooru") ? "safebooru.org" : "konachan.com"}/safe.jpg` }],
    };
  };
  t.after(() => {
    axios.get = originalGet;
    if (previous === undefined) delete process.env.SFW_PROVIDER;
    else process.env.SFW_PROVIDER = previous;
  });
  for (const provider of ["safebooru", "konachan"]) {
    process.env.SFW_PROVIDER = provider;
    assert.equal(await handleCommand("!anime", {
      jid: `sfw-${provider}`,
      sendMessage: async (_jid, payload) => sent.push(payload),
    }), null);
  }
  assert.equal(sent.length, 2);
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
