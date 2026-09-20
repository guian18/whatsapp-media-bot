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
};

function baseUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

export async function controlRequest<T>(apiUrl: string, token: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl(apiUrl)}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token.trim()}`,
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
  return data as T;
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
  };
}
