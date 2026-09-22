import test from "node:test";
import assert from "node:assert/strict";
import { parseCommandAliases, resolveCommandAlias } from "../src/command-aliases.js";
import { handleCommand } from "../src/commands.js";
import { normalizePrivateJid } from "../src/owner-notifications.js";

test("parses safe command aliases", () => {
  assert.deepEqual(parseCommandAliases("saludo=ping, asistente=ai"), { saludo: "ping", asistente: "ai" });
  assert.throws(() => parseCommandAliases("saludo=desconocido"), /alias inválido/);
  assert.throws(() => parseCommandAliases("ping=ai"), /nombre diferente/);
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

test("permite cambiar el nombre sin mantener activo el comando original", () => {
  const previous = process.env.COMMAND_ALIASES;
  process.env.COMMAND_ALIASES = "videos=xvideos";
  try {
    assert.equal(resolveCommandAlias("videos"), "xvideos");
    assert.equal(resolveCommandAlias("xvideos"), null);
  } finally {
    if (previous === undefined) delete process.env.COMMAND_ALIASES;
    else process.env.COMMAND_ALIASES = previous;
  }
});

test("actualiza !ayuda con los nombres personalizados activos", async () => {
  const previous = process.env.COMMAND_ALIASES;
  process.env.COMMAND_ALIASES = "videos=xvideos";
  try {
    const help = await handleCommand("!ayuda");
    assert.match(help, /`!videos` <URL>/);
    assert.doesNotMatch(help, /`!xvideos` <URL>/);
  } finally {
    if (previous === undefined) delete process.env.COMMAND_ALIASES;
    else process.env.COMMAND_ALIASES = previous;
  }
});

test("accepts only private notification numbers", () => {
  assert.equal(normalizePrivateJid("393803893208"), "393803893208@s.whatsapp.net");
  assert.equal(normalizePrivateJid("393803893208@s.whatsapp.net"), "393803893208@s.whatsapp.net");
  assert.throws(() => normalizePrivateJid("not-a-number"), /número privado/);
});
