export function ownPrivateJid(sock) {
  const raw = String(sock?.user?.id || "").trim();
  if (!raw || raw.includes("@g.us")) return null;
  const [user, server = "s.whatsapp.net"] = raw.split("@");
  const normalizedUser = user.split(":")[0];
  return normalizedUser && server === "s.whatsapp.net" ? `${normalizedUser}@${server}` : null;
}

export function formatSafeSettingsChange(changed) {
  return Object.entries(changed)
    .filter(([key]) => !key.endsWith("_API_KEY") && key !== "AI_API_KEY")
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("\n");
}
