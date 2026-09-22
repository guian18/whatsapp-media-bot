// Defaults de Railway: solo completan variables ausentes; las variables definidas
// explícitamente en el panel mantienen su valor.
const railwayDefaults = {
  GROUPS_ENABLED: "true",
  REPLY_IN_PRIVATE: "true",
  NSFW_ENABLED: "true",
  NSFW_ALLOW_PRIVATE_CHATS: "true",
  NSFW_ALLOW_EXTERNAL_URLS: "true",
  ALLOW_SELF: "true",
  AUTO_RESET: "true",
  CONTROL_API_ALLOW_PUBLIC: "true",
};

for (const [key, value] of Object.entries(railwayDefaults)) {
  if (process.env[key] === undefined || process.env[key] === "") process.env[key] = value;
}

await import("../bot.js");
