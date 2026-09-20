import { describe, expect, it } from "vitest";

import { healthUrl, validateInteger } from "../lib/control-settings";
import { toControlPayload } from "../lib/control-api";

describe("control settings helpers", () => {
  it("derives the llama.cpp health endpoint", () => {
    expect(healthUrl("http://127.0.0.1:8080/v1/chat/completions")).toBe("http://127.0.0.1:8080/health");
    expect(healthUrl("https://bot.example.test/")).toBe("https://bot.example.test/health");
  });

  it("validates bounded integer settings", () => {
    expect(validateInteger("64", 8, 4096)).toBe(true);
    expect(validateInteger("7", 8, 4096)).toBe(false);
    expect(validateInteger("64.5", 8, 4096)).toBe(false);
    expect(validateInteger("nope", 8, 4096)).toBe(false);
  });

  it("builds a remote-safe settings payload without secrets", () => {
    const payload = toControlPayload({ provider: "local", model: "local-model", llamaUrl: "http://127.0.0.1:8080/v1/chat/completions", maxTokens: "64", timeoutMs: "120000", language: "es-ES", tone: "breve", skipSearch: true, fastMode: true });
    expect(payload).toMatchObject({ provider: "local", maxTokens: 64, timeoutMs: 120000, fastMode: true });
    expect(payload).not.toHaveProperty("controlToken");
    expect(payload).not.toHaveProperty("GROQ_API_KEY");
  });
});
