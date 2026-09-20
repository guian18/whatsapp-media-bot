export function healthUrl(completionsUrl: string) {
  const value = completionsUrl.trim().replace(/\/$/, "");
  if (value.endsWith("/v1/chat/completions")) {
    return `${value.slice(0, -"/v1/chat/completions".length)}/health`;
  }
  return `${value}/health`;
}

export function validateInteger(value: string, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return false;
  }
  return true;
}
