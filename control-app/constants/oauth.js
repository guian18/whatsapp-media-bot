import * as Linking from "expo-linking";
import * as ReactNative from "react-native";
const bundleId = "com.app.whatsappmediabotcontrol";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;
const env = {
  portal: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  server: process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: process.env.EXPO_PUBLIC_APP_ID ?? "",
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  deepLinkScheme: schemeFromBundleId
};
const OAUTH_PORTAL_URL = env.portal;
const OAUTH_SERVER_URL = env.server;
const APP_ID = env.appId;
const OWNER_OPEN_ID = env.ownerId;
const OWNER_NAME = env.ownerName;
const API_BASE_URL = env.apiBaseUrl;
function getApiBaseUrl() {
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
  }
  return "";
}
const SESSION_TOKEN_KEY = "app_session_token";
const USER_INFO_KEY = "manus-runtime-user-info";
const encodeState = (value) => {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(value);
  }
  const BufferImpl = globalThis.Buffer;
  if (BufferImpl) {
    return BufferImpl.from(value, "utf-8").toString("base64");
  }
  return value;
};
const getRedirectUri = () => {
  if (ReactNative.Platform.OS === "web") {
    return `${getApiBaseUrl()}/api/oauth/callback`;
  } else {
    return Linking.createURL("/oauth/callback", {
      scheme: env.deepLinkScheme
    });
  }
};
const getLoginUrl = () => {
  const redirectUri = getRedirectUri();
  const state = encodeState(redirectUri);
  const url = new URL(`${OAUTH_PORTAL_URL}/app-auth`);
  url.searchParams.set("appId", APP_ID);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  return url.toString();
};
async function startOAuthLogin() {
  const loginUrl = getLoginUrl();
  if (ReactNative.Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.location.href = loginUrl;
    }
    return null;
  }
  const supported = await Linking.canOpenURL(loginUrl);
  if (!supported) {
    console.warn("[OAuth] Cannot open login URL: URL scheme not supported");
    return null;
  }
  try {
    await Linking.openURL(loginUrl);
  } catch (error) {
    console.error("[OAuth] Failed to open login URL:", error);
  }
  return null;
}
export {
  API_BASE_URL,
  APP_ID,
  OAUTH_PORTAL_URL,
  OAUTH_SERVER_URL,
  OWNER_NAME,
  OWNER_OPEN_ID,
  SESSION_TOKEN_KEY,
  USER_INFO_KEY,
  getApiBaseUrl,
  getLoginUrl,
  getRedirectUri,
  startOAuthLogin
};
