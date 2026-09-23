import assert from "node:assert/strict";
import test from "node:test";
import axios from "axios";
import { handleCommand } from "../src/commands.js";
import { NSFW_COMMANDS, nsfwHelp } from "../src/nsfw.js";

test("NSFW help lists all commands ported from Nekros-dsc/Nsfw-Bot", () => {
  const help = nsfwHelp();
  for (const command of Object.keys(NSFW_COMMANDS)) assert.match(help, new RegExp(`!${command}\\b`));
  assert.match(help, /Menú de imágenes NSFW/);
});

test("NSFW command requests Nekobot and sends a WhatsApp image", async (t) => {
  const originalGet = axios.get;
  const calls = [];
  const sent = [];
  axios.get = async (url, options) => {
    calls.push({ url, options });
    return { data: { message: "https://cdn.nekobot.xyz/images/hentai.jpg" } };
  };
  t.after(() => { axios.get = originalGet; });

  assert.equal(await handleCommand("!hentai", {
    jid: "nsfw-test",
    sendMessage: async (_jid, payload) => sent.push(payload),
  }), null);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /nekobot\.xyz\/api\/image/);
  assert.deepEqual(calls[0].options.params, { type: "hentai" });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].image.url, "https://cdn.nekobot.xyz/images/hentai.jpg");
  assert.match(sent[0].caption, /Fuente: Nekobot/);
});

test("ported hentaianal command uses the original Nekobot API type", async (t) => {
  const originalGet = axios.get;
  let request;
  axios.get = async (url, options) => {
    request = { url, options };
    return { data: { message: "https://nekobot.xyz/images/hentai-anal.jpg" } };
  };
  t.after(() => { axios.get = originalGet; });

  assert.equal(await handleCommand("!hentaianal", {
    jid: "nsfw-hentaianal",
    sendMessage: async () => {},
  }), null);
  assert.deepEqual(request.options.params, { type: "hentai_anal" });
});

test("NSFW image URLs must come from Nekobot HTTPS hosts", async (t) => {
  const originalGet = axios.get;
  axios.get = async () => ({ data: { message: "https://example.test/not-nekobot.jpg" } });
  t.after(() => { axios.get = originalGet; });
  const reply = await handleCommand("!boobs", {
    jid: "nsfw-invalid-url",
    sendMessage: async () => {},
  });
  assert.match(reply, /URL segura/);
});
