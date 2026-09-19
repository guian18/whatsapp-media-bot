import { accessSync, constants } from "node:fs";

export function dataEscribible() {
  try {
    accessSync("/data", constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function getAuthDir() {
  return process.env.AUTH_DIR || (dataEscribible() ? "/data/auth_info" : "auth_info");
}

export function getPairingAdminToken() {
  return (process.env.PAIRING_ADMIN_TOKEN || "").trim();
}
