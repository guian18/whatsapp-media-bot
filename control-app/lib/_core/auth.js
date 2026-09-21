import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { SESSION_TOKEN_KEY, USER_INFO_KEY } from "@/constants/oauth";
async function getSessionToken() {
  try {
    if (Platform.OS === "web") {
      console.log("[Auth] Web platform uses cookie-based auth, skipping token retrieval");
      return null;
    }
    console.log("[Auth] Getting session token...");
    const token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
    console.log(
      "[Auth] Session token retrieved from SecureStore:",
      token ? `present (${token.substring(0, 20)}...)` : "missing"
    );
    return token;
  } catch (error) {
    console.error("[Auth] Failed to get session token:", error);
    return null;
  }
}
async function setSessionToken(token) {
  try {
    if (Platform.OS === "web") {
      console.log("[Auth] Web platform uses cookie-based auth, skipping token storage");
      return;
    }
    console.log("[Auth] Setting session token...", token.substring(0, 20) + "...");
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    console.log("[Auth] Session token stored in SecureStore successfully");
  } catch (error) {
    console.error("[Auth] Failed to set session token:", error);
    throw error;
  }
}
async function removeSessionToken() {
  try {
    if (Platform.OS === "web") {
      console.log("[Auth] Web platform uses cookie-based auth, skipping token removal");
      return;
    }
    console.log("[Auth] Removing session token...");
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    console.log("[Auth] Session token removed from SecureStore successfully");
  } catch (error) {
    console.error("[Auth] Failed to remove session token:", error);
  }
}
async function getUserInfo() {
  try {
    console.log("[Auth] Getting user info...");
    let info = null;
    if (Platform.OS === "web") {
      info = window.localStorage.getItem(USER_INFO_KEY);
    } else {
      info = await SecureStore.getItemAsync(USER_INFO_KEY);
    }
    if (!info) {
      console.log("[Auth] No user info found");
      return null;
    }
    const user = JSON.parse(info);
    console.log("[Auth] User info retrieved:", user);
    return user;
  } catch (error) {
    console.error("[Auth] Failed to get user info:", error);
    return null;
  }
}
async function setUserInfo(user) {
  try {
    console.log("[Auth] Setting user info...", user);
    if (Platform.OS === "web") {
      window.localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
      console.log("[Auth] User info stored in localStorage successfully");
      return;
    }
    await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(user));
    console.log("[Auth] User info stored in SecureStore successfully");
  } catch (error) {
    console.error("[Auth] Failed to set user info:", error);
  }
}
async function clearUserInfo() {
  try {
    if (Platform.OS === "web") {
      window.localStorage.removeItem(USER_INFO_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(USER_INFO_KEY);
  } catch (error) {
    console.error("[Auth] Failed to clear user info:", error);
  }
}
export {
  clearUserInfo,
  getSessionToken,
  getUserInfo,
  removeSessionToken,
  setSessionToken,
  setUserInfo
};
