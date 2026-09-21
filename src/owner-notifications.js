export function ownPrivateJid(sock) {
  const raw = String(sock?.user?.id || "").trim();
  if (!raw || raw.endsWith(["@", "g", "us"].join("."))) return null;
  const [user, server = "s.whatsapp.net"] = raw.split("@");
  const normalizedUser = user.split(":")[0];
  return normalizedUser && server === "s.whatsapp.net" ? `${normalizedUser}@${server}` : null;
}

export function normalizePrivateJid(value) {
  const raw = String(value || "").trim();
  const number = raw.replace(/@s\.whatsapp\.net$/i, "");
  if (!/^\d{6,15}$/.test(number)) throw new Error("notificationJid debe ser un número privado válido");
  return `${number}@s.whatsapp.net`;
}

export function formatSafeSettingsChange(changed) {
  return Object.entries(changed)
    .filter(([key]) => !key.endsWith("_API_KEY") && key !== "AI_API_KEY")
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("\n");
}
