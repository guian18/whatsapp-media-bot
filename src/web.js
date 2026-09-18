// Pequeño servidor HTTP para plataformas tipo Railway:
// - responde al healthcheck en "/"
// - muestra el QR o el código de vinculación en "/qr" para escanearlo desde el navegador
// - permite pedir el código de 8 dígitos escribiendo el número en el formulario (POST /pair)
import http from "node:http";
import qrcode from "qrcode-terminal";

const estado = {
  conectado: false,
  qr: "",          // texto del QR actual (si toca vincular por QR)
  qrAscii: "",     // el mismo QR dibujado en texto
  pairingCode: "", // código de 8 dígitos (si se vincula por número)
};

// bot.js registra aquí la función que pide el código a WhatsApp
let pairingRequester = null;

export function setPairingRequester(fn) {
  pairingRequester = typeof fn === "function" ? fn : null;
}

export function setConectado(valor) {
  estado.conectado = valor;
  if (valor) {
    estado.qr = "";
    estado.qrAscii = "";
    estado.pairingCode = "";
  }
}

export function setPairingCode(code) {
  estado.pairingCode = code || "";
}

export function setQr(qr) {
  estado.qr = qr || "";
  if (!qr) {
    estado.qrAscii = "";
    return;
  }
  qrcode.generate(qr, { small: true }, (ascii) => {
    estado.qrAscii = ascii;
  });
}

const FORMULARIO = `
  <h2>Vincular con tu número</h2>
  <form method="post" action="/pair">
    <input name="numero" inputmode="numeric" placeholder="51987654321"
      style="font-size:1.2rem;padding:8px;width:220px" required>
    <button type="submit" style="font-size:1.2rem;padding:8px 16px">Pedir código</button>
  </form>
  <p>Escribe tu número con código de país, solo dígitos (sin + ni espacios).</p>`;

function pagina() {
  if (estado.conectado) {
    return "<h1>Bot conectado ✅</h1><p>Ya puedes usar los comandos en WhatsApp.</p>";
  }
  if (estado.pairingCode) {
    const pretty = estado.pairingCode.match(/.{1,4}/g)?.join("-") || estado.pairingCode;
    return `<h1>Código de vinculación</h1><p style="font-size:2rem;letter-spacing:.2rem">${pretty}</p>
      <p>WhatsApp &gt; Dispositivos vinculados &gt; Vincular un dispositivo &gt; Vincular con número de teléfono.</p>
      <hr>${FORMULARIO}`;
  }
  if (estado.qrAscii) {
    return `<h1>Escanea este QR</h1><pre style="line-height:1;font-size:10px">${estado.qrAscii}</pre>
      <hr>${FORMULARIO}`;
  }
  return `<h1>Esperando…</h1><p>Recarga en unos segundos.</p><hr>${FORMULARIO}`;
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 10_000) req.destroy(); // límite de seguridad
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function html(contenido) {
  return `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="10">
    <body style="font-family:system-ui;background:#111;color:#eee;padding:24px">${contenido}</body>`;
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
          res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          if (estado.conectado) {
            res.end(html('<h1>El bot ya está vinculado ✅</h1><p><a href="/qr" style="color:#8cf">Volver</a></p>'));
            return;
          }
          if (!/^\d{8,15}$/.test(numero)) {
            res.end(html(`<h1>Número inválido</h1><p>Usa solo dígitos con código de país (ej. 51987654321).</p>
              <p><a href="/qr" style="color:#8cf">Volver</a></p>`));
            return;
          }
          if (!pairingRequester) {
            res.end(html(`<h1>El bot aún no está listo</h1><p>Inténtalo de nuevo en unos segundos.</p>
              <p><a href="/qr" style="color:#8cf">Volver</a></p>`));
            return;
          }
          try {
            const code = await pairingRequester(numero);
            const pretty = code?.match(/.{1,4}/g)?.join("-") || code;
            res.end(html(`<h1>Código de vinculación</h1>
              <p style="font-size:2rem;letter-spacing:.2rem">${pretty}</p>
              <p>WhatsApp &gt; Dispositivos vinculados &gt; Vincular un dispositivo &gt; Vincular con número de teléfono.</p>
              <p>Escríbelo antes de que expire.</p>`));
          } catch (err) {
            res.end(html(`<h1>No se pudo generar el código</h1><p>${err?.message || err}</p>
              <p>Revisa el número o usa el QR.</p><p><a href="/qr" style="color:#8cf">Volver</a></p>`));
          }
        })
        .catch(() => {
          res.writeHead(400, { "content-type": "text/plain" });
          res.end("bad request");
        });
      return;
    }

    if (url === "/health" || url === "/") {
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      res.end(estado.conectado ? "ok" : "starting");
      return;
    }
    if (url === "/qr") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html(pagina()));
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
