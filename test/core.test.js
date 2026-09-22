import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { ayuda, handleCommand } from "../src/commands.js";
import { aiConfigured, cmdIA, containsRisk, detectStyle } from "../src/ai.js";

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
  assert.match(await handleCommand("!ayuda"), /!ai.*!ia.*pregunta/);
  assert.match(await handleCommand("!ayuda"), /fuentes/);
  const help = await handleCommand("!ayuda");
  assert.doesNotMatch(help, new RegExp("api" + "fy", "i"));
  assert.equal(await handleCommand("!video"), null);
  assert.match(await handleCommand("!ai"), /Uso: `!ai/);
  assert.match(await handleCommand("!ai pregunta directa"), /AI_API_KEY/);
  assert.match(await handleCommand("!AI pregunta directa"), /AI_API_KEY/);
  assert.match(await handleCommand("!IA pregunta directa"), /AI_API_KEY/);
  assert.match(await handleCommand("!tono"), /Tonos:/);
  assert.match(await handleCommand("!tono list"), /Tonos:/);
  assert.match(await handleCommand("!tono desconocido"), /Tono no válido/);
  assert.match(await handleCommand("!idioma"), /Idiomas:/);
  assert.match(await handleCommand("!idioma list"), /Idiomas:/);
  assert.match(await handleCommand("!idioma klingon"), /Idioma no válido/);
  assert.match(await handleCommand("!proveedor"), /Proveedores:/);
  assert.match(await handleCommand("!proveedor list"), /Proveedores:/);
  assert.match(await handleCommand("!proveedor"), /local.*gemini.*groq.*mistral.*openrouter/);
  assert.match(await handleCommand("!proveedor openai"), /Proveedor no válido/);
  assert.match(await handleCommand("!proveedor claude"), /Proveedor no válido/);
  assert.match(await handleCommand("!proveedor desconocido"), /Proveedor no válido/);
  if (previousProvider === undefined) delete process.env.AI_PROVIDER;
  else process.env.AI_PROVIDER = previousProvider;
  if (previousAiKey === undefined) delete process.env.AI_API_KEY;
  else process.env.AI_API_KEY = previousAiKey;
  if (previousPingDeadChance === undefined) delete process.env.PING_DEAD_CHANCE;
  else process.env.PING_DEAD_CHANCE = previousPingDeadChance;
  if (previousPingTripChance === undefined) delete process.env.PING_TRIP_CHANCE;
  else process.env.PING_TRIP_CHANCE = previousPingTripChance;
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

test("LocalAI provider uses its OpenAI-compatible local endpoint", async () => {
  const previousProvider = process.env.AI_PROVIDER;
  const previousUrl = process.env.LOCALAI_URL;
  const previousInterval = process.env.AI_MIN_INTERVAL_MS;
  const previousFetch = globalThis.fetch;
  process.env.AI_PROVIDER = "localai";
  process.env.LOCALAI_URL = "http://127.0.0.1:8081/v1/chat/completions";
  process.env.AI_MIN_INTERVAL_MS = "0";
  globalThis.fetch = async (url) => {
    if (String(url).startsWith("https://html.duckduckgo.com/")) return new Response("", { status: 200 });
    return new Response(JSON.stringify({ choices: [{ message: { content: "Respuesta de LocalAI" } }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    assert.match(await cmdIA("prueba LocalAI"), /Respuesta de LocalAI/);
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of [["AI_PROVIDER", previousProvider], ["LOCALAI_URL", previousUrl], ["AI_MIN_INTERVAL_MS", previousInterval]]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("Ollama provider uses its OpenAI-compatible local endpoint", async () => {
  const previousProvider = process.env.AI_PROVIDER;
  const previousUrl = process.env.OLLAMA_URL;
  const previousKey = process.env.OLLAMA_API_KEY;
  const previousInterval = process.env.AI_MIN_INTERVAL_MS;
  const previousFetch = globalThis.fetch;
  process.env.AI_PROVIDER = "ollama";
  process.env.OLLAMA_URL = "http://127.0.0.1:11434/v1/chat/completions";
  process.env.OLLAMA_API_KEY = "ollama";
  process.env.AI_MIN_INTERVAL_MS = "0";
  globalThis.fetch = async (url) => {
    if (String(url).startsWith("https://html.duckduckgo.com/")) return new Response("", { status: 200 });
    return new Response(JSON.stringify({ choices: [{ message: { content: "Respuesta de Ollama" } }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    assert.match(await cmdIA("prueba Ollama"), /Respuesta de Ollama/);
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of [["AI_PROVIDER", previousProvider], ["OLLAMA_URL", previousUrl], ["OLLAMA_API_KEY", previousKey], ["AI_MIN_INTERVAL_MS", previousInterval]]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("AI replaces a violent model response with safe advice", async () => {
  const previousProvider = process.env.AI_PROVIDER;
  const previousUrl = process.env.AI_LOCAL_URL;
  const previousInterval = process.env.AI_MIN_INTERVAL_MS;
  const previousSkipSearch = process.env.AI_LOCAL_SKIP_SEARCH;
  const previousStyle = process.env.AI_DEFAULT_STYLE;
  const previousFetch = globalThis.fetch;
  process.env.AI_PROVIDER = "local";
  process.env.AI_LOCAL_URL = "http://127.0.0.1:8080/v1/chat/completions";
  process.env.AI_MIN_INTERVAL_MS = "0";
  process.env.AI_LOCAL_SKIP_SEARCH = "true";
  process.env.AI_DEFAULT_STYLE = "insultos";
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: "¡Te voy a dar un tiro en la cabeza!" } }] }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const response = await cmdIA("qué debo hacer para negociar mi salario");
    assert.doesNotMatch(response, /tiro|matar|disparar|apuñalar/i);
    assert.match(response, /revisión salarial|logros/i);
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of [["AI_PROVIDER", previousProvider], ["AI_LOCAL_URL", previousUrl], ["AI_MIN_INTERVAL_MS", previousInterval], ["AI_LOCAL_SKIP_SEARCH", previousSkipSearch], ["AI_DEFAULT_STYLE", previousStyle]]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
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

test("ai detects the tone used in the question", () => {
  assert.equal(detectStyle("por favor, informe formalmente"), "formal");
  assert.equal(detectStyle("jaja cuéntame algo divertido"), "divertido");
  assert.equal(detectStyle("responde breve y rápido"), "breve");
  assert.equal(detectStyle("¡contesta ya!!"), "agresivo");
  assert.equal(detectStyle("hola, ayúdame porfa"), "amable");
  assert.equal(detectStyle("usa el tono de insulto"), "insultos");
  assert.equal(detectStyle("consulta normal"), null);
});

test("insult mode roasts a nickname request without waiting for the model", async () => {
  const previousStyle = process.env.AI_DEFAULT_STYLE;
  process.env.AI_DEFAULT_STYLE = "insultos";
  const answer = await cmdIA("dile algo a alguien con apodo PruebaNick");
  assert.match(answer, /PruebaNick/);
  assert.match(answer, /despistado|poco juego/);
  if (previousStyle === undefined) delete process.env.AI_DEFAULT_STYLE;
  else process.env.AI_DEFAULT_STYLE = previousStyle;
});

test("environment loader migrates the deprecated Groq model", (t) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "whatsapp-media-bot-migration-"));
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
  const dir = mkdtempSync(path.join(os.tmpdir(), "whatsapp-media-bot-local-provider-"));
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

test("all tones and AI settings persist even when .env starts missing", async (t) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "whatsapp-media-bot-tone-"));
  const envFile = path.join(dir, ".env");
  const previousEnvFile = process.env.ENV_FILE;
  process.env.ENV_FILE = envFile;
  const tones = ["tranquilo", "agresivo", "insultos", "formal", "divertido", "sarcastico", "breve", "amable"];
  for (const tone of tones) assert.match((await import("../src/ai.js")).cmdTono(tone), /Tono cambiado/);
  const ai = await import("../src/ai.js");
  assert.match(ai.cmdIdioma("es-MX"), /español de México/);
  assert.match(ai.cmdProveedor("local"), /Proveedor cambiado a: local/);
  const saved = readFileSync(envFile, "utf8");
  assert.match(saved, /AI_DEFAULT_STYLE=amable/);
  assert.match(saved, /AI_LANGUAGE=es-MX/);
  assert.match(saved, /AI_PROVIDER=local/);
  assert.match(saved, /AI_MODEL=local-model/);
  t.after(() => {
    rmSync(dir, { recursive: true, force: true });
    if (previousEnvFile === undefined) delete process.env.ENV_FILE;
    else process.env.ENV_FILE = previousEnvFile;
  });
});
