import test from "node:test";
import assert from "node:assert/strict";
import { parseCommandAliases, resolveCommandAlias } from "../src/command-aliases.js";
import { handleCommand } from "../src/commands.js";

test("parses safe command aliases", () => {
  assert.deepEqual(parseCommandAliases("saludo=ping, asistente=ai"), { saludo: "ping", asistente: "ai" });
  assert.deepEqual(parseCommandAliases("gatus=anime"), { gatus: "anime" });
  assert.throws(() => parseCommandAliases("saludo=desconocido"), /alias inválido/);
  assert.throws(() => parseCommandAliases("ping=ai"), /nombre diferente/);
  assert.throws(() => parseCommandAliases("gatus=ping"), /nombre diferente/);
});

test("resolves a configured command alias", () => {
  const previous = process.env.COMMAND_ALIASES;
  process.env.COMMAND_ALIASES = "saludo=ping";
  try {
    assert.equal(resolveCommandAlias("saludo"), "ping");
    assert.equal(resolveCommandAlias("ping"), null);
  } finally {
    if (previous === undefined) delete process.env.COMMAND_ALIASES;
    else process.env.COMMAND_ALIASES = previous;
  }
});

test("mantiene !anime y añade !gatus como alias incorporado", async () => {
  assert.equal(resolveCommandAlias("anime"), "anime");
  assert.equal(resolveCommandAlias("gatus"), "anime");
  assert.match(await handleCommand("!gatus"), /solo está disponible desde WhatsApp/);
});

test("permite cambiar el nombre sin mantener activo el comando original", () => {
  const previous = process.env.COMMAND_ALIASES;
  process.env.COMMAND_ALIASES = "videos=anime";
  try {
    assert.equal(resolveCommandAlias("videos"), "anime");
    assert.equal(resolveCommandAlias("anime"), null);
  } finally {
    if (previous === undefined) delete process.env.COMMAND_ALIASES;
    else process.env.COMMAND_ALIASES = previous;
  }
});

test("actualiza !ayuda con los nombres personalizados activos", async () => {
  const previous = process.env.COMMAND_ALIASES;
  process.env.COMMAND_ALIASES = "imagenes=anime";
  try {
    const help = await handleCommand("!ayuda");
    assert.match(help, /!imagenes/);
  } finally {
    if (previous === undefined) delete process.env.COMMAND_ALIASES;
    else process.env.COMMAND_ALIASES = previous;
  }
});
