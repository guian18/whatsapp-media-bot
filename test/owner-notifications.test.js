import test from "node:test";
import assert from "node:assert/strict";
import { formatSafeSettingsChange, ownPrivateJid } from "../src/owner-notifications.js";

test("owner notification targets only the bot's private WhatsApp JID", () => {
  assert.equal(ownPrivateJid({ user: { id: "393803893208:19@s.whatsapp.net" } }), "393803893208@s.whatsapp.net");
  assert.equal(ownPrivateJid({ user: { id: `group-id@${["g", "us"].join(".")}` } }), null);
  assert.equal(ownPrivateJid({ user: { id: "46244198097050:19@lid" } }), null);
  assert.equal(ownPrivateJid(null), null);
});

test("owner notification never includes API keys", () => {
  const text = formatSafeSettingsChange({
    AI_PROVIDER: "local",
    AI_MODEL: "local-model",
    GROQ_API_KEY: "secret-key",
    AI_API_KEY: "another-secret",
  });
  assert.match(text, /AI_PROVIDER=local/);
  assert.match(text, /AI_MODEL=local-model/);
  assert.doesNotMatch(text, /secret-key|another-secret|API_KEY/);
});
