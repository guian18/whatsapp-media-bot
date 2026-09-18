// Pequeño servidor HTTP para plataformas tipo Railway:
// - responde al healthcheck en "/"
// - muestra el QR o el código de vinculación en "/qr" para escanearlo desde el navegador
import http from "node:http";
import qrcode from "qrcode-terminal";

const estado = {
  conectado: false,
  qr: "",          // texto del QR actual (si toca vincular por QR)
  qrAscii: "",     // el mismo QR dibujado en texto
  pairingCode: "", // código de 8 dígitos (si se vincula por número)
};

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

function pagina() {
  if (estado.conectado) {
    return "<h1>Bot conectado ✅</h1><p>Ya puedes usar los comandos en WhatsApp.</p>";
  }
  if (estado.pairingCode) {
    const pretty = estado.pairingCode.match(/.{1,4}/g)?.join("-") || estado.pairingCode;
    return `<h1>Código de vinculación</h1><p style="font-size:2rem;letter-spacing:.2rem">${pretty}</p>
      <p>WhatsApp &gt; Dispositivos vinculados &gt; Vincular un dispositivo &gt; Vincular con número de teléfono.</p>`;
  }
  if (estado.qrAscii) {
    return `<h1>Escanea este QR</h1><pre style="line-height:1;font-size:10px">${estado.qrAscii}</pre>`;
  }
  return "<h1>Esperando…</h1><p>Recarga en unos segundos.</p>";
}

export function startWebServer() {
  const port = Number(process.env.PORT) || 0;
  if (!port) return null; // sin PORT (p. ej. en Termux) no hace falta servidor

  const server = http.createServer((req, res) => {
    const url = (req.url || "/").split("?")[0];
    if (url === "/health" || url === "/") {
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      res.end(estado.conectado ? "ok" : "starting");
      return;
    }
    if (url === "/qr") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(
        `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="10">
         <body style="font-family:system-ui;background:#111;color:#eee;padding:24px">${pagina()}</body>`,
      );
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
