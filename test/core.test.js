import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { parseAddress } from "../src/a2s.js";
import { ayuda, cmdBuscar, cmdInfo, cmdServidor, handleCommand } from "../src/commands.js";
import { looksValidSteamKey } from "../src/steamkey.js";

function request(port, path, { method = "GET", body = "" } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method,
        headers: body
          ? {
              "content-type": "application/x-www-form-urlencoded",
              "content-length": Buffer.byteLength(body),
            }
          : undefined,
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

test("command dispatcher serves local commands without external services", async () => {
  const previousAiKey = process.env.AI_API_KEY;
  const previousOpenAiKey = process.env.OPENAI_API_KEY;
  process.env.AI_API_KEY = "";
  process.env.OPENAI_API_KEY = "";
  assert.equal(await handleCommand("!ping"), "Pong! 🏓");
  assert.equal(await handleCommand("!PING"), "Pong! 🏓");
  assert.equal(await handleCommand("!desconocido"), null);
  assert.equal(await handleCommand("texto normal"), null);
  assert.match(await handleCommand("!ayuda"), /!info/);
  assert.match(await handleCommand("!ia"), /Uso: `!ia/);
  assert.match(await handleCommand("!ia pregunta sin clave"), /AI_API_KEY/);
  if (previousAiKey === undefined) delete process.env.AI_API_KEY;
  else process.env.AI_API_KEY = previousAiKey;
  if (previousOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = previousOpenAiKey;
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

test("web server exposes health, status, QR page, and pairing requests", async (t) => {
  process.env.PAIRING_RATE_LIMIT_MS = "0";
  process.env.PAIRING_ADMIN_TOKEN = "test-token";
  const { startWebServer, setConectado, setPairingRequester } = await import("../src/web.js");
  setConectado(false);
  let realCode = false;
  setPairingRequester(async (number) => {
    assert.equal(number, "51987654321");
    return realCode ? "12345678" : "fake-code";
  });

  const server = startWebServer(0);
  assert.ok(server);
  await once(server, "listening");
  const { port } = server.address();
  t.after(async () => {
    setPairingRequester(null);
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  const health = await request(port, "/health");
  assert.equal(health.status, 200);
  assert.deepEqual(JSON.parse(health.body), { ok: true });

  const unauthorized = await request(port, "/qr");
  assert.equal(unauthorized.status, 401);

  const page = await request(port, "/qr?token=test-token");
  assert.equal(page.status, 200);
  assert.match(page.body, /Vincular bot de WhatsApp/);

  const invalid = await request(port, "/pair?token=test-token", { method: "POST", body: "numero=123" });
  assert.equal(invalid.status, 200);
  assert.equal(JSON.parse(invalid.body).ok, false);

  const fakePairing = await request(port, "/pair?token=test-token", {
    method: "POST",
    body: "numero=%2B51%20987654321",
  });
  assert.equal(fakePairing.status, 502);
  assert.equal(JSON.parse(fakePairing.body).ok, false);

  realCode = true;
  const pairing = await request(port, "/pair?token=test-token", {
    method: "POST",
    body: "numero=%2B51%20987654321",
  });
  assert.deepEqual(JSON.parse(pairing.body), { ok: true, code: "12345678" });

  const status = await request(port, "/status?token=test-token");
  assert.equal(JSON.parse(status.body).pairingCode, "12345678");
});
