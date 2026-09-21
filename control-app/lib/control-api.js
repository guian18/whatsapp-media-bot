function normalizeControlApiUrl(value) {
  return value.trim().replace(/\/+$/, "").replace(/\/api\/control$/i, "");
}
async function controlRequest(apiUrl, token, path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15e3);
  try {
    const response = await fetch(`${normalizeControlApiUrl(apiUrl)}${path}`, {
      ...init,
      signal: init.signal || controller.signal,
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token.trim()}`,
        ...init.headers || {}
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Tiempo de espera agotado: revisa que el bot est\xE9 iniciado y que la URL sea accesible");
    }
    if (error instanceof TypeError) {
      throw new Error("No se pudo conectar: revisa la IP, el puerto 8787 y la misma red Wi\u2011Fi");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
function toControlPayload(settings) {
  return {
    provider: settings.provider,
    model: settings.model,
    llamaUrl: settings.llamaUrl,
    maxTokens: Number(settings.maxTokens),
    timeoutMs: Number(settings.timeoutMs),
    language: settings.language,
    tone: settings.tone,
    skipSearch: settings.skipSearch,
    fastMode: settings.fastMode,
    notificationJid: settings.notificationJid,
    commandAliases: settings.commandAliases
  };
}
export {
  controlRequest,
  normalizeControlApiUrl,
  toControlPayload
};
