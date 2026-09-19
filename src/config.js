export function getAuthDir() {
  return process.env.AUTH_DIR || "auth_info";
}

export function getPairingAdminToken() {
  return (process.env.PAIRING_ADMIN_TOKEN || "").trim();
}
