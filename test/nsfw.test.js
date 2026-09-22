import assert from "node:assert/strict";
import test from "node:test";
import { handleCommand } from "../src/commands.js";
import { NSFW_COMMANDS, nsfwHelp, sendNsfwImage, validImageUrl } from "../src/nsfw.js";

test("adult-image commands are disabled by default", async () => {
  const previous = process.env.NSFW_ENABLED;
  process.env.NSFW_ENABLED = "false";
  assert.match(await sendNsfwImage("hentai", { jid: "group-id", isGroup: true, sendMessage() {} }), /desactivados/);
  if (previous === undefined) delete process.env.NSFW_ENABLED;
  else process.env.NSFW_ENABLED = previous;
});

test("missing NSFW settings use permissive defaults", async () => {
  const previousEnabled = process.env.NSFW_ENABLED;
  const previousPrivate = process.env.NSFW_ALLOW_PRIVATE_CHATS;
  const previousExternal = process.env.NSFW_ALLOW_EXTERNAL_URLS;
  delete process.env.NSFW_ENABLED;
  delete process.env.NSFW_ALLOW_PRIVATE_CHATS;
  delete process.env.NSFW_ALLOW_EXTERNAL_URLS;
  assert.match(await sendNsfwImage("not-a-category", { jid: "new-install", isGroup: false, sendMessage() {} }), /!hentai/);
  assert.equal(validImageUrl("https://images.example.test/a.jpg"), "https://images.example.test/a.jpg");
  if (previousEnabled === undefined) delete process.env.NSFW_ENABLED;
  else process.env.NSFW_ENABLED = previousEnabled;
  if (previousPrivate === undefined) delete process.env.NSFW_ALLOW_PRIVATE_CHATS;
  else process.env.NSFW_ALLOW_PRIVATE_CHATS = previousPrivate;
  if (previousExternal === undefined) delete process.env.NSFW_ALLOW_EXTERNAL_URLS;
  else process.env.NSFW_ALLOW_EXTERNAL_URLS = previousExternal;
});

test("adult-image commands block private chats and unauthorized groups", async () => {
  const previousEnabled = process.env.NSFW_ENABLED;
  const previousGroups = process.env.NSFW_ALLOWED_GROUPS;
  const previousPrivate = process.env.NSFW_ALLOW_PRIVATE_CHATS;
  process.env.NSFW_ENABLED = "true";
  process.env.NSFW_ALLOWED_GROUPS = "autorizado";
  process.env.NSFW_ALLOW_PRIVATE_CHATS = "false";
  assert.match(await sendNsfwImage("hentai", { jid: "123@s.whatsapp.net", isGroup: false, sendMessage() {} }), /no se envían por chat privado/);
  assert.match(await sendNsfwImage("hentai", { jid: "otro", isGroup: true, sendMessage() {} }), /no está autorizado/);
  if (previousEnabled === undefined) delete process.env.NSFW_ENABLED;
  else process.env.NSFW_ENABLED = previousEnabled;
  if (previousGroups === undefined) delete process.env.NSFW_ALLOWED_GROUPS;
  else process.env.NSFW_ALLOWED_GROUPS = previousGroups;
  if (previousPrivate === undefined) delete process.env.NSFW_ALLOW_PRIVATE_CHATS;
  else process.env.NSFW_ALLOW_PRIVATE_CHATS = previousPrivate;
});

test("empty allowed-group configuration permits any group", async () => {
  const previousEnabled = process.env.NSFW_ENABLED;
  const previousGroups = process.env.NSFW_ALLOWED_GROUPS;
  process.env.NSFW_ENABLED = "true";
  process.env.NSFW_ALLOWED_GROUPS = "";
  assert.match(await sendNsfwImage("not-a-category", { jid: "cualquier-grupo", isGroup: true, sendMessage() {} }), /!hentai/);
  if (previousEnabled === undefined) delete process.env.NSFW_ENABLED;
  else process.env.NSFW_ENABLED = previousEnabled;
  if (previousGroups === undefined) delete process.env.NSFW_ALLOWED_GROUPS;
  else process.env.NSFW_ALLOWED_GROUPS = previousGroups;
});

test("private chats are allowed when explicitly enabled", async () => {
  const previousEnabled = process.env.NSFW_ENABLED;
  const previousPrivate = process.env.NSFW_ALLOW_PRIVATE_CHATS;
  process.env.NSFW_ENABLED = "true";
  process.env.NSFW_ALLOW_PRIVATE_CHATS = "true";
  assert.match(await sendNsfwImage("not-a-category", { jid: "private-chat", isGroup: false, sendMessage() {} }), /!hentai/);
  if (previousEnabled === undefined) delete process.env.NSFW_ENABLED;
  else process.env.NSFW_ENABLED = previousEnabled;
  if (previousPrivate === undefined) delete process.env.NSFW_ALLOW_PRIVATE_CHATS;
  else process.env.NSFW_ALLOW_PRIVATE_CHATS = previousPrivate;
});

test("adult-image commands are listed and dispatched without network access when blocked", async () => {
  assert.ok(Object.hasOwn(NSFW_COMMANDS, "hentai"));
  assert.match(nsfwHelp(), /!hentai/);
  assert.match(await handleCommand("!nsfw", { jid: "group-id", isGroup: true }), /Menú de imágenes NSFW/);
  assert.match(await handleCommand("!NSFW", { jid: "group-id", isGroup: true }), /!boobs/);
  const previous = process.env.NSFW_ENABLED;
  process.env.NSFW_ENABLED = "false";
  assert.match(await handleCommand("!hentai", { jid: "group-id", isGroup: true, sendMessage() {} }), /desactivados/);
  if (previous === undefined) delete process.env.NSFW_ENABLED;
  else process.env.NSFW_ENABLED = previous;
});

test("external image URLs are allowed by default and can be disabled", () => {
  const previous = process.env.NSFW_ALLOW_EXTERNAL_URLS;
  delete process.env.NSFW_ALLOW_EXTERNAL_URLS;
  assert.equal(validImageUrl("https://images.example.test/adult.jpg"), "https://images.example.test/adult.jpg");
  process.env.NSFW_ALLOW_EXTERNAL_URLS = "false";
  assert.equal(validImageUrl("https://images.example.test/adult.jpg"), null);
  process.env.NSFW_ALLOW_EXTERNAL_URLS = "true";
  assert.equal(validImageUrl("http://images.example.test/adult.jpg"), "http://images.example.test/adult.jpg");
  assert.equal(validImageUrl("https://user:password@images.example.test/adult.jpg"), null);
  assert.equal(validImageUrl("javascript:alert(1)"), null);
  if (previous === undefined) delete process.env.NSFW_ALLOW_EXTERNAL_URLS;
  else process.env.NSFW_ALLOW_EXTERNAL_URLS = previous;
});
