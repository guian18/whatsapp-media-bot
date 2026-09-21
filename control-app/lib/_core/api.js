import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "./auth.js";
async function apiCall(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers || {}
  };
  if (Platform.OS !== "web") {
    const sessionToken = await Auth.getSessionToken();
    console.log("[API] apiCall:", {
      endpoint,
      hasToken: !!sessionToken,
      method: options.method || "GET"
    });
    if (sessionToken) {
      headers["Authorization"] = `Bearer ${sessionToken}`;
      console.log("[API] Authorization header added");
    }
  } else {
    console.log("[API] apiCall:", { endpoint, platform: "web", method: options.method || "GET" });
  }
  const baseUrl = getApiBaseUrl();
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = baseUrl ? `${cleanBaseUrl}${cleanEndpoint}` : endpoint;
  console.log("[API] Full URL:", url);
  try {
    console.log("[API] Making request...");
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include"
    });
    console.log("[API] Response status:", response.status, response.statusText);
    const responseHeaders = Object.fromEntries(response.headers.entries());
    console.log("[API] Response headers:", responseHeaders);
    const setCookie = response.headers.get("Set-Cookie");
    if (setCookie) {
      console.log("[API] Set-Cookie header received:", setCookie);
    }
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[API] Error response:", errorText);
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
      }
      throw new Error(errorMessage || `API call failed: ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      console.log("[API] JSON response received");
      return data;
    }
    const text = await response.text();
    console.log("[API] Text response received");
    return text ? JSON.parse(text) : {};
  } catch (error) {
    console.error("[API] Request failed:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error occurred");
  }
}
async function exchangeOAuthCode(code, state) {
  console.log("[API] exchangeOAuthCode called");
  const params = new URLSearchParams({ code, state });
  const endpoint = `/api/oauth/mobile?${params.toString()}`;
  console.log("[API] Calling OAuth mobile endpoint:", endpoint);
  const result = await apiCall(endpoint);
  const sessionToken = result.app_session_id;
  console.log("[API] OAuth exchange result:", {
    hasSessionToken: !!sessionToken,
    hasUser: !!result.user,
    sessionToken: sessionToken ? `${sessionToken.substring(0, 50)}...` : null
  });
  return {
    sessionToken,
    user: result.user
  };
}
async function logout() {
  await apiCall("/api/auth/logout", {
    method: "POST"
  });
}
async function getMe() {
  try {
    const result = await apiCall("/api/auth/me");
    return result.user || null;
  } catch (error) {
    console.error("[API] getMe failed:", error);
    return null;
  }
}
async function establishSession(token) {
  try {
    console.log("[API] establishSession: setting cookie on backend...");
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/auth/session`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      credentials: "include"
      // Important: allows Set-Cookie to be stored
    });
    if (!response.ok) {
      console.error("[API] establishSession failed:", response.status);
      return false;
    }
    console.log("[API] establishSession: cookie set successfully");
    return true;
  } catch (error) {
    console.error("[API] establishSession error:", error);
    return false;
  }
}
export {
  apiCall,
  establishSession,
  exchangeOAuthCode,
  getMe,
  logout
};
