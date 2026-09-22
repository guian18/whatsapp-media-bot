import assert from "node:assert/strict";
import test from "node:test";
import { handleCommand } from "../src/commands.js";
import { NSFW_COMMANDS, nsfwHelp, sendNsfwImage, validImageUrl } from "../src/nsfw.js";

test("adult-image commands are disabled by default", async () => {
  const previous = process.env.NSFW_ENABLED;
  delete process.env.NSFW_ENABLED;
  assert.match(await sendNsfwImage("hentai", { jid: "group-id", isGroup: true, sendMessage() {} }), /desactivados/);
  if (previous === undefined) delete process.env.NSFW_ENABLED;
  else process.env.NSFW_ENABLED = previous;
});

test("adult-image commands block private chats and unauthorized groups", async () => {
  const previousEnabled = process.env.NSFW_ENABLED;
  const previousGroups = process.env.NSFW_ALLOWED_GROUPS;
  process.env.NSFW_ENABLED = "true";
  process.env.NSFW_ALLOWED_GROUPS = "autorizado";
  assert.match(await sendNsfwImage("hentai", { jid: "123@s.whatsapp.net", isGroup: false, sendMessage() {} }), /no se envían por chat privado/);
  assert.match(await sendNsfwImage("hentai", { jid: "otro", isGroup: true, sendMessage() {} }), /no está autorizado/);
  if (previousEnabled === undefined) delete process.env.NSFW_ENABLED;
  else process.env.NSFW_ENABLED = previousEnabled;
  if (previousGroups === undefined) delete process.env.NSFW_ALLOWED_GROUPS;
  else process.env.NSFW_ALLOWED_GROUPS = previousGroups;
});

test("adult-image commands are listed and dispatched without network access when blocked", async () => {
  assert.ok(Object.hasOwn(NSFW_COMMANDS, "hentai"));
  assert.match(nsfwHelp(), /!hentai/);
  const previous = process.env.NSFW_ENABLED;
  delete process.env.NSFW_ENABLED;
  assert.match(await handleCommand("!hentai", { jid: "group-id", isGroup: true, sendMessage() {} }), /desactivados/);
  if (previous === undefined) delete process.env.NSFW_ENABLED;
  else process.env.NSFW_ENABLED = previous;
});

test("external image URLs require an explicit opt-in", () => {
  const previous = process.env.NSFW_ALLOW_EXTERNAL_URLS;
  delete process.env.NSFW_ALLOW_EXTERNAL_URLS;
  assert.equal(validImageUrl("https://images.example.test/adult.jpg"), null);
  process.env.NSFW_ALLOW_EXTERNAL_URLS = "true";
  assert.equal(validImageUrl("https://images.example.test/adult.jpg"), "https://images.example.test/adult.jpg");
  assert.equal(validImageUrl("http://images.example.test/adult.jpg"), "http://images.example.test/adult.jpg");
  assert.equal(validImageUrl("javascript:alert(1)"), null);
  if (previous === undefined) delete process.env.NSFW_ALLOW_EXTERNAL_URLS;
  else process.env.NSFW_ALLOW_EXTERNAL_URLS = previous;
});
