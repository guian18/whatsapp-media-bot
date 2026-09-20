// Proxy compatible con el repositorio público proxy-openrouter:
// https://github.com/dexter-666/proxy-openrouter
// La clave se lee solo desde OPENROUTER_API_KEY y nunca se expone al cliente.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Falta la clave de OpenRouter" });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://github.com/guianpierrcastillolazo-rgb/infoplayerleft",
        "X-Title": process.env.OPENROUTER_APP_NAME || "InfoPlayer Left",
      },
      body: JSON.stringify(req.body || {}),
      signal: AbortSignal.timeout(60_000),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Error en proxy OpenRouter:", error);
    return res.status(502).json({ error: "Error comunicando con OpenRouter" });
  }
}
