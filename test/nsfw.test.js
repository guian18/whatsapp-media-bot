import assert from "node:assert/strict";
import test from "node:test";
import axios from "axios";
import { handleCommand } from "../src/commands.js";
import { NSFW_COMMANDS, nsfwHelp, sendNsfwImage, validImageUrl } from "../src/nsfw.js";

test("adult-image commands are disabled by default", async () => {
  const previous = process.env.NSFW_ENABLED;
  process.env.NSFW_ENABLED = "false";
  assert.match(await sendNsfwImage("hentai", { jid: "group-id", isGroup: true, sendMessage() {} }), /desactivados/);
  if (previous === undefined) delete process.env.NSFW_ENABLED;
  else process.env.NSFW_ENABLED = previous;
});

test("missing NSFW settings allow HTTPS image sources by default", async () => {
  const previousEnabled = process.env.NSFW_ENABLED;
  const previousPrivate = process.env.NSFW_ALLOW_PRIVATE_CHATS;
  const previousExternal = process.env.NSFW_ALLOW_EXTERNAL_URLS;
  delete process.env.NSFW_ENABLED;
  delete process.env.NSFW_ALLOW_PRIVATE_CHATS;
  delete process.env.NSFW_ALLOW_EXTERNAL_URLS;
  assert.match(await sendNsfwImage("not-a-category", { jid: "new-install", isGroup: false, sendMessage() {} }), /!hentai/);
  assert.equal(validImageUrl("https://cdn.nekobot.xyz/a.jpg"), "https://cdn.nekobot.xyz/a.jpg");
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

test("external image URLs allow HTTPS by default and reject private hosts", () => {
  const previous = process.env.NSFW_ALLOW_EXTERNAL_URLS;
  delete process.env.NSFW_ALLOW_EXTERNAL_URLS;
  assert.equal(validImageUrl("https://images.example.test/adult.jpg"), "https://images.example.test/adult.jpg");
  process.env.NSFW_ALLOW_EXTERNAL_URLS = "false";
  assert.equal(validImageUrl("https://images.example.test/adult.jpg"), null);
  process.env.NSFW_ALLOW_EXTERNAL_URLS = "true";
  assert.equal(validImageUrl("https://images.example.test/adult.jpg"), "https://images.example.test/adult.jpg");
  assert.equal(validImageUrl("http://images.example.test/adult.jpg"), null);
  assert.equal(validImageUrl("https://user:password@images.example.test/adult.jpg"), null);
  assert.equal(validImageUrl("http://127.0.0.1/secret.jpg"), null);
  assert.equal(validImageUrl("http://169.254.169.254/latest/meta-data"), null);
  assert.equal(validImageUrl("http://localhost/admin.jpg"), null);
  assert.equal(validImageUrl("javascript:alert(1)"), null);
  if (previous === undefined) delete process.env.NSFW_ALLOW_EXTERNAL_URLS;
  else process.env.NSFW_ALLOW_EXTERNAL_URLS = previous;
});

test("uses Rule34 only with its closed explicit tag mapping", async (t) => {
  const originalGet = axios.get;
  const previous = Object.fromEntries(
    ["NSFW_ENABLED", "NSFW_API_URLS", "RULE34_USER_ID", "RULE34_API_KEY", "NSFW_API_RETRIES", "NSFW_DIRECT_URL"].map((key) => [key, process.env[key]]),
  );
  process.env.NSFW_ENABLED = "true";
  process.env.NSFW_API_URLS = "rule34";
  process.env.RULE34_USER_ID = "123";
  process.env.RULE34_API_KEY = "secret";
  process.env.NSFW_API_RETRIES = "0";
  process.env.NSFW_DIRECT_URL = "true";
  axios.get = async (url, options) => {
    assert.match(url, /api\.rule34\.xxx/);
    assert.match(options.params.tags, /rating:explicit/);
    assert.match(options.params.tags, /-loli/);
    return { data: [{ rating: "explicit", tags: "big_breasts rating:explicit", file_url: "https://cdn.example.test/boobs.jpg" }] };
  };
  t.after(() => {
    axios.get = originalGet;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  assert.equal(await sendNsfwImage("boobs", { jid: "rule34-test", isGroup: true, sendMessage() {} }), null);
});

test("falls through Reddit and Rule34 when credentials are absent", async (t) => {
  const originalGet = axios.get;
  const originalPost = axios.post;
  const previous = Object.fromEntries(
    ["NSFW_ENABLED", "NSFW_API_URLS", "REDDIT_ACCESS_TOKEN", "REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "REDDIT_REFRESH_TOKEN", "RULE34_USER_ID", "RULE34_API_KEY", "NSFW_API_RETRIES", "NSFW_DIRECT_URL"].map((key) => [key, process.env[key]]),
  );
  process.env.NSFW_ENABLED = "true";
  process.env.NSFW_API_URLS = "reddit,rule34,nekobot";
  for (const key of ["REDDIT_ACCESS_TOKEN", "REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "REDDIT_REFRESH_TOKEN", "RULE34_USER_ID", "RULE34_API_KEY"]) delete process.env[key];
  process.env.NSFW_API_RETRIES = "0";
  process.env.NSFW_DIRECT_URL = "true";
  axios.post = async () => { throw new Error("no Reddit credentials"); };
  const calls = [];
  axios.get = async (url) => {
    calls.push(url);
    return { data: { message: "https://cdn.nekobot.xyz/ass.jpg" } };
  };
  t.after(() => {
    axios.get = originalGet;
    axios.post = originalPost;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  assert.equal(await sendNsfwImage("ass", { jid: "fallback-test", isGroup: true, sendMessage() {} }), null);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /nekobot\.xyz/);
});

test("uses Waifu.im when explicitly configured", async (t) => {
  const originalGet = axios.get;
  const previous = Object.fromEntries(
    ["NSFW_ENABLED", "NSFW_API_URL", "NSFW_API_URLS", "NSFW_API_RETRIES", "NSFW_DIRECT_URL"].map((key) => [key, process.env[key]]),
  );
  const calls = [];
  process.env.NSFW_ENABLED = "true";
  delete process.env.NSFW_API_URL;
  process.env.NSFW_API_URLS = "waifuim";
  process.env.NSFW_API_RETRIES = "0";
  process.env.NSFW_DIRECT_URL = "true";
  axios.get = async (url) => {
    calls.push(url);
    return {
      data: {
        items: [{
          url: "https://cdn.waifu.im/primary.png",
          isNsfw: true,
          tags: [{ slug: "hentai" }],
        }],
      },
    };
  };
  t.after(() => {
    axios.get = originalGet;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const reply = await sendNsfwImage("hentai", {
    jid: "primary-provider",
    isGroup: true,
    sendMessage() {},
  });
  assert.equal(reply, null);
  assert.match(calls[0], /api\.waifu\.im/);
});

test("uses an exact Waifu.im tag and falls back for unsupported categories", async (t) => {
  const originalGet = axios.get;
  const previous = Object.fromEntries(
    ["NSFW_ENABLED", "NSFW_API_URLS", "NSFW_API_RETRIES", "NSFW_DIRECT_URL"].map((key) => [key, process.env[key]]),
  );
  const calls = [];
  process.env.NSFW_ENABLED = "true";
  process.env.NSFW_API_URLS = "waifuim,nekobot";
  process.env.NSFW_API_RETRIES = "0";
  process.env.NSFW_DIRECT_URL = "true";
  axios.get = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("waifu.im")) {
      assert.match(String(options.params), /IncludedTags=oppai/);
      return {
        data: {
          items: [{
            url: "https://cdn.waifu.im/oppai.png",
            isNsfw: true,
            tags: [{ slug: "oppai" }],
          }],
        },
      };
    }
    return { data: { message: "https://cdn.nekobot.xyz/feet.jpg" } };
  };
  t.after(() => {
    axios.get = originalGet;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const exact = await sendNsfwImage("boobs", {
    jid: "exact-tag",
    isGroup: true,
    sendMessage() {},
  });
  assert.equal(exact, null);
  assert.match(calls[0].url, /api\.waifu\.im/);

  calls.length = 0;
  const unsupported = await sendNsfwImage("feet", {
    jid: "unsupported-tag",
    isGroup: true,
    sendMessage() {},
  });
  assert.equal(unsupported, null);
  assert.match(calls[0].url, /nekobot\.xyz\/api\/image/);
});

test("uses automatic Waifu.im fallback when legacy Nekobot returns a temporary HTTP error", async (t) => {
  const originalGet = axios.get;
  const previous = Object.fromEntries(
    ["NSFW_ENABLED", "NSFW_API_URL", "NSFW_API_URLS", "NSFW_API_RETRIES", "NSFW_DIRECT_URL"].map((key) => [key, process.env[key]]),
  );
  const calls = [];
  const sent = [];
  process.env.NSFW_ENABLED = "true";
  process.env.NSFW_API_URL = "https://nekobot.xyz/api/image";
  delete process.env.NSFW_API_URLS;
  process.env.NSFW_API_RETRIES = "0";
  process.env.NSFW_DIRECT_URL = "true";
  axios.get = async (url) => {
    calls.push(url);
    if (url.includes("nekobot.xyz")) {
      const error = new Error("Cloudflare timeout");
      error.response = { status: 522 };
      throw error;
    }
    return {
      data: {
        items: [{
          url: "https://cdn.waifu.im/test-image.png",
          isNsfw: true,
          tags: [{ slug: "hentai" }],
        }],
      },
    };
  };
  t.after(() => {
    axios.get = originalGet;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const reply = await sendNsfwImage("hentai", {
    jid: "fallback-group",
    isGroup: true,
    sendMessage: async (_jid, payload) => sent.push(payload),
  });
  assert.equal(reply, null);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /nekobot\.xyz/);
  assert.match(calls[1], /api\.waifu\.im/);
  assert.equal(sent[0]?.image?.url, "https://cdn.waifu.im/test-image.png");
  assert.match(sent[0]?.caption, /Fuente: Waifu\.im/);
});

test("rejects Waifu.im responses without explicit NSFW marking or excluded tags", async () => {
  const originalGet = axios.get;
  const previous = Object.fromEntries(
    ["NSFW_ENABLED", "NSFW_API_URLS", "NSFW_API_RETRIES", "NSFW_DIRECT_URL"].map((key) => [key, process.env[key]]),
  );
  process.env.NSFW_ENABLED = "true";
  process.env.NSFW_API_URLS = "waifuim";
  process.env.NSFW_API_RETRIES = "0";
  process.env.NSFW_DIRECT_URL = "true";
  let response = { items: [{ url: "https://cdn.waifu.im/test.png", isNsfw: false, tags: [] }] };
  axios.get = async (_url, options) => {
    assert.equal(options.headers["accept-version"], "v7");
    assert.match(String(options.params), /IsNsfw=True/);
    assert.match(String(options.params), /ExcludedTags=loli/);
    return { data: response };
  };
  try {
    const first = await sendNsfwImage("hentai", {
      jid: "waifu-validation-1",
      isGroup: true,
      sendMessage() {},
    });
    assert.match(first, /no devolvió una imagen que no está marcada|No pude obtener esa imagen/);

    response = { items: [{ url: "https://cdn.waifu.im/test.png", isNsfw: true, tags: [{ slug: "loli" }] }] };
    const second = await sendNsfwImage("hentai", {
      jid: "waifu-validation-2",
      isGroup: true,
      sendMessage() {},
    });
    assert.match(second, /etiqueta excluida|No pude obtener esa imagen/);
  } finally {
    axios.get = originalGet;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
