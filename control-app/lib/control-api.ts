export type ControlSettingsPayload = {
  provider: string;
  model: string;
  llamaUrl: string;
  maxTokens: string;
  timeoutMs: string;
  language: string;
  tone: string;
  skipSearch: boolean;
  fastMode: boolean;
  notificationJid: string;
  commandAliases: string;
};

export function normalizeControlApiUrl(value: string) {
  return value.trim().replace(/\/+$/, "").replace(/\/api\/control$/i, "");
}

export async function controlRequest<T>(apiUrl: string, token: string, path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${normalizeControlApiUrl(apiUrl)}${path}`, {
      ...init,
      signal: init.signal || controller.signal,
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token.trim()}`,
        ...(init.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Tiempo de espera agotado: revisa que el bot esté iniciado y que la URL sea accesible");
    }
    if (error instanceof TypeError) {
      throw new Error("No se pudo conectar: revisa la IP, el puerto 8787 y la misma red Wi‑Fi");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function toControlPayload(settings: ControlSettingsPayload) {
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
    commandAliases: settings.commandAliases,
  };
}
