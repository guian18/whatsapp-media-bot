import assert from "node:assert/strict";
import test from "node:test";
import { handleCommand } from "../src/commands.js";
import { enableAllCommands } from "../src/access-control.js";
import { recordBotMessage } from "../src/message-tracker.js";

test("!clear all deletes every tracked bot message for the current chat", async (t) => {
  const previousOwner = process.env.OWNER_NUMBER;
  const previousAdmin = process.env.ADMIN_NUMBER;
  process.env.OWNER_NUMBER = "51911111111";
  process.env.ADMIN_NUMBER = "51922222222";
  enableAllCommands();
  t.after(() => {
    enableAllCommands();
    if (previousOwner === undefined) delete process.env.OWNER_NUMBER;
    else process.env.OWNER_NUMBER = previousOwner;
    if (previousAdmin === undefined) delete process.env.ADMIN_NUMBER;
    else process.env.ADMIN_NUMBER = previousAdmin;
  });

  const deleted = [];
  recordBotMessage("all-clear-chat", { key: { id: "sfw-1", remoteJid: "all-clear-chat", fromMe: true } });
  recordBotMessage("all-clear-chat", { key: { id: "nsfw-1", remoteJid: "all-clear-chat", fromMe: true } });
  recordBotMessage("other-chat", { key: { id: "other-1", remoteJid: "other-chat", fromMe: true } });

  assert.match(await handleCommand("!clear all", {
    jid: "all-clear-chat",
    requesterId: "51911111111",
    deleteMessage: async (key) => deleted.push(key),
  }), /Eliminé 2 mensajes del bot/);
  assert.deepEqual(deleted.map(({ id }) => id), ["sfw-1", "nsfw-1"]);

  assert.match(await handleCommand("!clear all", {
    jid: "all-clear-chat",
    requesterId: "51911111111",
    deleteMessage: async () => {},
  }), /No hay mensajes del bot/);
});

test("!clear all rejects non-privileged users", async () => {
  const previousOwner = process.env.OWNER_NUMBER;
  const previousAdmin = process.env.ADMIN_NUMBER;
  process.env.OWNER_NUMBER = "51911111111";
  process.env.ADMIN_NUMBER = "51922222222";
  enableAllCommands();
  try {
    assert.match(await handleCommand("!clear all", {
      jid: "protected-chat",
      requesterId: "51933333333",
      deleteMessage: async () => {},
    }), /No tienes permiso/);
  } finally {
    enableAllCommands();
    if (previousOwner === undefined) delete process.env.OWNER_NUMBER;
    else process.env.OWNER_NUMBER = previousOwner;
    if (previousAdmin === undefined) delete process.env.ADMIN_NUMBER;
    else process.env.ADMIN_NUMBER = previousAdmin;
  }
});
