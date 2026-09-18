// Servidor HTTP para plataformas tipo Railway:
// - healthcheck en "/"
// - página de vinculación en "/qr": muestra el QR (imagen) y el código de 8 dígitos
// - "/status" devuelve el estado en JSON (la página se actualiza sola)
// - "POST /pair" pide el código de 8 dígitos para el número indicado
import http from "node:http";
import qrcodeTerminal from "qrcode-terminal";
import QRCode from "qrcode";
import { guardarSteamApiKey, getSteamApiKey, looksValidSteamKey } from "./steamkey.js";

const estado = {
  conectado: false,
  qr: "",          // texto crudo del QR
  qrAscii: "",     // QR en texto (respaldo)
  qrImagen: "",    // QR como imagen (data URL)
  pairingCode: "", // código de 8 dígitos
  codeAt: 0,       // cuándo se generó el código
  error: "",
};

let pairingRequester = null;

export function setPairingRequester(fn) {
  pairingRequester = typeof fn === "function" ? fn : null;
}

export function setConectado(valor) {
  estado.conectado = valor;
  if (valor) {
    estado.qr = "";
    estado.qrAscii = "";
    estado.qrImagen = "";
    estado.pairingCode = "";
    estado.error = "";
  }
}

export function setPairingCode(code) {
  estado.pairingCode = code || "";
  estado.codeAt = code ? Date.now() : 0;
}

export function setQr(qr) {
  estado.qr = qr || "";
  if (!qr) {
    estado.qrAscii = "";
    estado.qrImagen = "";
    return;
  }
  qrcodeTerminal.generate(qr, { small: true }, (ascii) => {
    estado.qrAscii = ascii;
  });
  QRCode.toDataURL(qr, { margin: 1, width: 320, errorCorrectionLevel: "L" })
    .then((url) => {
      if (estado.qr === qr) estado.qrImagen = url;
    })
    .catch(() => {});
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 10_000) req.destroy();
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const PAGINA = `<!doctype html><html lang="es"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vincular bot de WhatsApp</title>
<style>
  :root { color-scheme: dark }
  body { font-family: system-ui, sans-serif; background:#0f1115; color:#e8eaed; margin:0; padding:24px;
         display:flex; justify-content:center }
  .wrap { width:100%; max-width:760px }
  h1 { font-size:1.35rem; margin:0 0 4px }
  .sub { color:#9aa0a6; margin:0 0 20px; font-size:.95rem }
  .cards { display:grid; gap:16px; grid-template-columns:1fr }
  @media (min-width:680px) { .cards { grid-template-columns:1fr 1fr } }
  .card { background:#171a21; border:1px solid #262b36; border-radius:14px; padding:18px }
  .card h2 { font-size:1rem; margin:0 0 12px; color:#cfd4dc }
  img.qr { width:100%; max-width:300px; background:#fff; padding:10px; border-radius:10px; display:block }
  .code { font-size:2.2rem; font-weight:700; letter-spacing:.35rem; color:#7ee787; word-break:break-all }
  input, button { font-size:1rem; padding:10px 12px; border-radius:10px; border:1px solid #333a47;
                  background:#0f1115; color:#e8eaed }
  button { background:#2f81f7; border-color:#2f81f7; color:#fff; font-weight:600; cursor:pointer }
  button:disabled { opacity:.5; cursor:default }
  .muted { color:#9aa0a6; font-size:.9rem; line-height:1.45 }
  .ok { color:#7ee787; font-weight:600 }
  .err { color:#ff7b72 }
  form { display:flex; gap:8px; flex-wrap:wrap; margin:0 0 10px }
</style>
<div class="wrap">
  <h1>Vincular bot de WhatsApp</h1>
  <p class="sub" id="estado">Cargando…</p>
  <div class="cards">
    <div class="card">
      <h2>Opción 1 · Escanear QR</h2>
      <div id="qrbox"><p class="muted">Generando QR…</p></div>
      <p class="muted">WhatsApp &gt; Dispositivos vinculados &gt; Vincular un dispositivo.</p>
    </div>
    <div class="card">
      <h2>Opción 2 · Código de 8 dígitos</h2>
      <form id="f">
        <input name="numero" inputmode="numeric" placeholder="51987654321" required>
        <button type="submit">Pedir código</button>
      </form>
      <div id="codebox"><p class="muted">Escribe tu número con código de país, solo dígitos.</p></div>
      <p class="muted">WhatsApp &gt; Dispositivos vinculados &gt; Vincular con número de teléfono. El código dura ~1 minuto.</p>
    </div>
  </div>
  <div class="card" style="margin-top:16px">
    <h2>Steam API key</h2>
    <p class="muted" id="keyestado">Comprobando…</p>
    <form id="fk">
      <input name="key" placeholder="32 caracteres (ej. A1B2C3...)" minlength="32" maxlength="32" required>
      <button type="submit">Guardar clave</button>
    </form>
    <p class="muted">Consíguela gratis en <a href="https://steamcommunity.com/dev/apikey" target="_blank" style="color:#7ab8ff">steamcommunity.com/dev/apikey</a>. Se guarda en el servidor y se usa para los comandos de jugadores.</p>
  </div>
</div>
<script>
  const $ = (id) => document.getElementById(id);
  function pintar(s) {
    if (s.conectado) {
      $("estado").innerHTML = '<span class="ok">Bot conectado ✅ Ya puedes usar los comandos en WhatsApp.</span>';
      $("qrbox").innerHTML = '<p class="muted">Vinculado.</p>';
      $("codebox").innerHTML = '<p class="muted">Vinculado.</p>';
      return;
    }
    $("estado").textContent = "Esperando vinculación. Usa cualquiera de las dos opciones.";
    $("qrbox").innerHTML = s.qrImagen
      ? '<img class="qr" alt="QR" src="' + s.qrImagen + '">'
      : '<p class="muted">Generando QR… (se renueva solo)</p>';
    $("keyestado").innerHTML = s.steamKey
      ? '<span class="ok">Clave de Steam configurada ✅ (' + s.steamKey + ')</span>'
      : '<span class="err">Falta la clave de Steam: los comandos de jugadores no funcionarán.</span>';
    if (s.pairingCode) {
      const pretty = s.pairingCode.replace(/(.{4})(?=.)/g, "$1-");
      $("codebox").innerHTML = '<p class="code">' + pretty + '</p>';
    }
  }
  async function tick() {
    try { pintar(await (await fetch("/status", { cache: "no-store" })).json()); } catch {}
  }
  $("f").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    $("codebox").innerHTML = '<p class="muted">Pidiendo código…</p>';
    try {
      const r = await fetch("/pair", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ numero: e.target.numero.value }),
      });
      const d = await r.json();
      if (d.ok) {
        const pretty = d.code.replace(/(.{4})(?=.)/g, "$1-");
        $("codebox").innerHTML = '<p class="code">' + pretty + '</p>';
      } else {
        $("codebox").innerHTML = '<p class="err">' + d.error + '</p>';
      }
    } catch (err) {
      $("codebox").innerHTML = '<p class="err">Error de red, inténtalo otra vez.</p>';
    }
    btn.disabled = false;
  });
  $("fk").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("keyestado").textContent = "Guardando…";
    try {
      const r = await fetch("/steamkey", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ key: e.target.key.value }),
      });
      const d = await r.json();
      $("keyestado").innerHTML = d.ok
        ? '<span class="ok">Clave guardada ✅</span>'
        : '<span class="err">' + d.error + '</span>';
      if (d.ok) e.target.reset();
    } catch {
      $("keyestado").innerHTML = '<span class="err">Error de red.</span>';
    }
  });
  tick();
  setInterval(tick, 3000);
</script>
</html>`;

function json(res, code, data) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(data));
}

export function startWebServer() {
  const port = Number(process.env.PORT) || 0;
  if (!port) return null; // sin PORT (p. ej. en Termux) no hace falta servidor

  const server = http.createServer((req, res) => {
    const url = (req.url || "/").split("?")[0];

    if (req.method === "POST" && url === "/pair") {
      leerCuerpo(req)
        .then(async (body) => {
          const numero = (new URLSearchParams(body).get("numero") || "").replace(/\D/g, "");
          if (estado.conectado) return json(res, 200, { ok: false, error: "El bot ya está vinculado ✅" });
          if (!/^\d{8,15}$/.test(numero)) {
            return json(res, 200, { ok: false, error: "Número inválido: usa solo dígitos con código de país (ej. 51987654321)." });
          }
          if (!pairingRequester) {
            return json(res, 200, { ok: false, error: "El bot aún no está listo, inténtalo en unos segundos." });
          }
          try {
            const code = await pairingRequester(numero);
            setPairingCode(code);
            return json(res, 200, { ok: true, code });
          } catch (err) {
            return json(res, 200, { ok: false, error: String(err?.message || err) });
          }
        })
        .catch(() => json(res, 400, { ok: false, error: "bad request" }));
      return;
    }

    if (req.method === "POST" && url === "/steamkey") {
      leerCuerpo(req)
        .then((body) => {
          const key = (new URLSearchParams(body).get("key") || "").trim();
          if (!guardarSteamApiKey(key)) {
            return json(res, 200, { ok: false, error: "Clave inválida: deben ser 32 caracteres hexadecimales." });
          }
          return json(res, 200, { ok: true });
        })
        .catch(() => json(res, 400, { ok: false, error: "bad request" }));
      return;
    }

    if (url === "/status") {
      json(res, 200, {
        conectado: estado.conectado,
        qrImagen: estado.qrImagen,
        pairingCode: estado.pairingCode,
        steamKey: (() => {
          const k = getSteamApiKey();
          return looksValidSteamKey(k) ? k.slice(0, 4) + "…" + k.slice(-4) : "";
        })(),
      });
      return;
    }

    if (url === "/health") {
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      res.end(estado.conectado ? "ok" : "starting");
      return;
    }

    if (url === "/" || url === "/qr") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(PAGINA);
      return;
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`Servidor HTTP escuchando en el puerto ${port} (/qr para vincular).`);
  });
  return server;
}
