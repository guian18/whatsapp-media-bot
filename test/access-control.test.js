import assert from "node:assert/strict";
import test from "node:test";
import { handleCommand } from "../src/commands.js";
import { enableAllCommands } from "../src/access-control.js";

test("only configured owner or admin can disable and re-enable all commands", async (t) => {
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

  assert.match(await handleCommand("!desactivar", { requesterId: "+51911111111", jid: "group@g.us" }), /desactivados/);
  assert.match(await handleCommand("!ping", { requesterId: "51933333333", jid: "group@g.us" }), /temporalmente desactivado/);
  assert.match(await handleCommand("!activar", { requesterId: "51933333333", jid: "group@g.us" }), /No tienes permiso/);
  assert.match(await handleCommand("!activar", { requesterId: "51922222222", jid: "group@g.us" }), /activados nuevamente/);
  assert.equal(await handleCommand("!ping", { requesterId: "51933333333", jid: "group@g.us" }), "Pong! 🏓 El bot está activo y listo.");
});

test("control commands are denied when owner and admin numbers are not configured", async (t) => {
  const previousOwner = process.env.OWNER_NUMBER;
  const previousAdmin = process.env.ADMIN_NUMBER;
  delete process.env.OWNER_NUMBER;
  delete process.env.ADMIN_NUMBER;
  enableAllCommands();
  t.after(() => {
    enableAllCommands();
    if (previousOwner === undefined) delete process.env.OWNER_NUMBER;
    else process.env.OWNER_NUMBER = previousOwner;
    if (previousAdmin === undefined) delete process.env.ADMIN_NUMBER;
    else process.env.ADMIN_NUMBER = previousAdmin;
  });

  assert.match(await handleCommand("!desactivar", { requesterId: "51911111111", jid: "private" }), /No tienes permiso/);
  assert.equal(await handleCommand("!ping", { requesterId: "51911111111", jid: "private" }), "Pong! 🏓 El bot está activo y listo.");
});


test("!admin menu is visible only to the configured owner and admin", async (t) => {
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

  const ownerMenu = await handleCommand("!admin menu", { requesterId: "51911111111", jid: "admin-chat" });
  assert.match(ownerMenu, /Menú de propietario y administrador/);
  assert.match(ownerMenu, /!clear all/);
  assert.match(await handleCommand("!admin menu", { requesterId: "51933333333", jid: "admin-chat" }), /No tienes permiso/);
});


test("owner authorization accepts an alternate WhatsApp phone identity in groups", async (t) => {
  const previousOwner = process.env.OWNER_NUMBER;
  const previousAdmin = process.env.ADMIN_NUMBER;
  process.env.OWNER_NUMBER = "51944444444";
  process.env.ADMIN_NUMBER = "";
  enableAllCommands();
  t.after(() => {
    enableAllCommands();
    if (previousOwner === undefined) delete process.env.OWNER_NUMBER;
    else process.env.OWNER_NUMBER = previousOwner;
    if (previousAdmin === undefined) delete process.env.ADMIN_NUMBER;
    else process.env.ADMIN_NUMBER = previousAdmin;
  });

  assert.match(await handleCommand("!clear all", {
    jid: "group@g.us",
    requesterId: "1234567890@lid",
    requesterIds: ["1234567890@lid", "51944444444@s.whatsapp.net"],
    deleteMessage: async () => {},
  }), /No hay mensajes del bot/);
});


test("admin authorization accepts an alternate WhatsApp phone identity in groups", async (t) => {
  const previousOwner = process.env.OWNER_NUMBER;
  const previousAdmin = process.env.ADMIN_NUMBER;
  process.env.OWNER_NUMBER = "";
  process.env.ADMIN_NUMBER = "51955555555";
  enableAllCommands();
  t.after(() => {
    enableAllCommands();
    if (previousOwner === undefined) delete process.env.OWNER_NUMBER;
    else process.env.OWNER_NUMBER = previousOwner;
    if (previousAdmin === undefined) delete process.env.ADMIN_NUMBER;
    else process.env.ADMIN_NUMBER = previousAdmin;
  });

  assert.match(await handleCommand("!admin menu", {
    jid: "group@g.us",
    requesterId: "9876543210@lid",
    requesterIds: ["9876543210@lid", "51955555555@s.whatsapp.net"],
  }), /Menú de propietario y administrador/);
});


test("owner and admin numbers match device-suffixed WhatsApp JIDs", async (t) => {
  const previousOwner = process.env.OWNER_NUMBER;
  const previousAdmin = process.env.ADMIN_NUMBER;
  process.env.OWNER_NUMBER = "393803893208";
  process.env.ADMIN_NUMBER = "393803893208";
  enableAllCommands();
  t.after(() => {
    enableAllCommands();
    if (previousOwner === undefined) delete process.env.OWNER_NUMBER;
    else process.env.OWNER_NUMBER = previousOwner;
    if (previousAdmin === undefined) delete process.env.ADMIN_NUMBER;
    else process.env.ADMIN_NUMBER = previousAdmin;
  });

  const context = {
    jid: "120363000000000000@g.us",
    requesterId: "393803893208:17@s.whatsapp.net",
    requesterIds: ["393803893208:17@s.whatsapp.net"],
  };
  assert.match(await handleCommand("!admin menu", context), /Menú de propietario y administrador/);
  assert.match(await handleCommand("!clear all", {
    ...context,
    deleteMessage: async () => {},
  }), /No hay mensajes del bot/);
});


test("configured owner is authorized when Baileys marks the message as fromMe", async (t) => {
  const previousOwner = process.env.OWNER_NUMBER;
  const previousAdmin = process.env.ADMIN_NUMBER;
  process.env.OWNER_NUMBER = "393803893208";
  process.env.ADMIN_NUMBER = "";
  enableAllCommands();
  t.after(() => {
    enableAllCommands();
    if (previousOwner === undefined) delete process.env.OWNER_NUMBER;
    else process.env.OWNER_NUMBER = previousOwner;
    if (previousAdmin === undefined) delete process.env.ADMIN_NUMBER;
    else process.env.ADMIN_NUMBER = previousAdmin;
  });

  assert.match(await handleCommand("!admin menu", {
    jid: "group@g.us",
    isFromMe: true,
    requesterId: "group@g.us",
  }), /Menú de propietario y administrador/);
  assert.match(await handleCommand("!clear all", {
    jid: "group@g.us",
    isFromMe: true,
    requesterId: "group@g.us",
    deleteMessage: async () => {},
  }), /No hay mensajes del bot/);
});
