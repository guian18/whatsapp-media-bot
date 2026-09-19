// Consultas A2S (Source Engine Query) y al Master Server de Steam, en Node puro.
import dgram from "node:dgram";

const HEADER = Buffer.from([0xff, 0xff, 0xff, 0xff]);
const MASTER_HOST = "hl2master.steampowered.com";
const MASTER_PORT = 27011;

function sendUdp(host, port, payload, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const sock = dgram.createSocket("udp4");
    const timer = setTimeout(() => {
      sock.close();
      reject(new Error("timeout"));
    }, timeout);
    sock.on("message", (msg) => {
      clearTimeout(timer);
      sock.close();
      resolve(msg);
    });
    sock.on("error", (err) => {
      clearTimeout(timer);
      try { sock.close(); } catch {}
      reject(err);
    });
    sock.connect(port, host, () => sock.send(payload));
  });
}

class Reader {
  constructor(buf, offset = 0) {
    this.buf = buf;
    this.o = offset;
  }
  ensure(size) { if (this.o + size > this.buf.length) throw new Error("respuesta A2S truncada"); }
  byte() { this.ensure(1); return this.buf[this.o++]; }
  short() { this.ensure(2); const v = this.buf.readInt16LE(this.o); this.o += 2; return v; }
  long() { this.ensure(4); const v = this.buf.readInt32LE(this.o); this.o += 4; return v; }
  float() { this.ensure(4); const v = this.buf.readFloatLE(this.o); this.o += 4; return v; }
  string() {
    this.ensure(1);
    const end = this.buf.indexOf(0, this.o);
    const stop = end === -1 ? this.buf.length : end;
    const s = this.buf.toString("utf8", this.o, stop);
    this.o = stop + 1;
    return s;
  }
}

/** A2S_INFO -> { name, map, folder, game, players, maxPlayers, bots } */
export async function serverInfo(host, port, timeout = 2000) {
  const query = (challenge) =>
    Buffer.concat([
      HEADER,
      Buffer.from("T"),
      Buffer.from("Source Engine Query\0"),
      challenge ?? Buffer.alloc(0),
    ]);

  let res = await sendUdp(host, port, query(), timeout);
  if (res.length < 5 || !res.subarray(0, 4).equals(HEADER)) throw new Error("respuesta A2S inválida");
  if (res.readInt32LE(0) === -2) throw new Error("respuesta fragmentada no soportada");
  if (res[4] === 0x41) {
    if (res.length < 9) throw new Error("challenge A2S truncado");
    res = await sendUdp(host, port, query(res.subarray(5, 9)), timeout);
  }
  if (res.length < 5 || !res.subarray(0, 4).equals(HEADER)) throw new Error("respuesta A2S inválida");
  if (res[4] !== 0x49) throw new Error("respuesta A2S_INFO inválida");

  const r = new Reader(res, 5);
  r.byte(); // protocolo
  const name = r.string();
  const map = r.string();
  const folder = r.string();
  const game = r.string();
  const appId = r.short();
  const players = r.byte();
  const maxPlayers = r.byte();
  const bots = r.byte();
  return { name, map, folder, game, appId, players, maxPlayers, bots };
}

/** A2S_PLAYER -> [{ name, score, duration }] */
export async function serverPlayers(host, port, timeout = 2000) {
  const query = (challenge) =>
    Buffer.concat([HEADER, Buffer.from("U"), challenge]);

  let res = await sendUdp(host, port, query(Buffer.from([0xff, 0xff, 0xff, 0xff])), timeout);
  if (res.length < 5 || !res.subarray(0, 4).equals(HEADER)) throw new Error("respuesta A2S inválida");
  if (res.readInt32LE(0) === -2) throw new Error("respuesta fragmentada no soportada");
  if (res[4] === 0x41) {
    if (res.length < 9) throw new Error("challenge A2S truncado");
    res = await sendUdp(host, port, query(res.subarray(5, 9)), timeout);
  }
  if (res.length < 5 || !res.subarray(0, 4).equals(HEADER)) throw new Error("respuesta A2S inválida");
  if (res[4] !== 0x44) throw new Error("respuesta A2S_PLAYER inválida");

  const r = new Reader(res, 5);
  const count = r.byte();
  const out = [];
  for (let i = 0; i < count; i++) {
    if (r.o >= res.length) break;
    r.byte(); // índice
    const name = r.string();
    const score = r.long();
    const duration = r.float();
    out.push({ name, score, duration });
  }
  return out;
}

/**
 * Lista servidores del Master Server de Steam con paginación.
 * filter por defecto: Left 4 Dead 2.
 */
export async function masterServerList({
  filter = "\\gamedir\\left4dead2\\",
  limit = 400,
  timeout = 4000,
} = {}) {
  const servers = [];
  let seed = "0.0.0.0:0";

  while (servers.length < limit) {
    const req = Buffer.concat([
      Buffer.from([0x31, 0xff]),
      Buffer.from(seed + "\0"),
      Buffer.from(filter + "\0"),
    ]);

    let data;
    try {
      data = await sendUdp(MASTER_HOST, MASTER_PORT, req, timeout);
    } catch {
      break;
    }
    if (!data || data.length < 6) break;

    let last = null;
    let done = false;
    for (let i = 6; i + 6 <= data.length; i += 6) {
      const ip = `${data[i]}.${data[i + 1]}.${data[i + 2]}.${data[i + 3]}`;
      const port = data.readUInt16BE(i + 4);
      last = `${ip}:${port}`;
      if (ip === "0.0.0.0" && port === 0) { done = true; break; }
      servers.push({ ip, port });
    }
    if (done || !last || last === seed) break;
    seed = last;
  }

  return servers.slice(0, limit);
}

export function parseAddress(text) {
  if (!text || !text.includes(":")) return null;
  const idx = text.trim().lastIndexOf(":");
  const ip = text.trim().slice(0, idx);
  const port = Number(text.trim().slice(idx + 1));
  if (!ip || !Number.isInteger(port) || port <= 0 || port > 65535) return null;
  if (/[\s/\\]/.test(ip) || ip.length > 253) return null;
  if (ip === "localhost" || ip === "localhost.localdomain" || ip.endsWith(".local")) return null;
  const allowPrivate = process.env.ALLOW_PRIVATE_SERVERS === "true";
  if (!allowPrivate && (/^127\./.test(ip) || /^10\./.test(ip) || /^192\.168\./.test(ip) ||
      /^169\.254\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
      /^224\./.test(ip) || ip === "0.0.0.0")) return null;
  return { ip, port };
}
