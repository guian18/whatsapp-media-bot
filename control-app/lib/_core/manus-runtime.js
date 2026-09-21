import { Platform } from "react-native";
const DEBUG = true;
const log = (msg) => {
  if (!DEBUG) return;
  const ts = (/* @__PURE__ */ new Date()).toISOString();
  console.log(`[ManusRuntime ${ts}] ${msg}`);
};
function isInIframe() {
  if (Platform.OS !== "web") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
function isWeb() {
  return Platform.OS === "web";
}
function sendToParent(type, payload = {}) {
  if (!isWeb() || !isInIframe()) return;
  const message = {
    type: "SpacePreviewerChannel",
    payload: { type, from: "content", to: "container", payload }
  };
  window.parent.postMessage(message, "*");
  log(`Sent to parent: ${type}`);
}
let initialized = false;
let safeAreaCallback = null;
function isValidInsets(payload) {
  return typeof payload.top === "number" && typeof payload.bottom === "number" && typeof payload.left === "number" && typeof payload.right === "number";
}
function handleMessage(event) {
  const data = event.data;
  if (!data || data.type !== "SpacePreviewerChannel") return;
  const { payload } = data;
  if (!payload || payload.to !== "content") return;
  if (payload.type === "setSafeAreaInsets" && isValidInsets(payload.payload) && safeAreaCallback) {
    const insets = payload.payload;
    const frame = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    safeAreaCallback({ insets, frame });
    log(
      `Received safe area insets from parent: top=${insets.top}, bottom=${insets.bottom}, left=${insets.left}, right=${insets.right}`
    );
  }
}
function subscribeSafeAreaInsets(callback) {
  safeAreaCallback = callback;
  return () => {
    if (safeAreaCallback === callback) {
      safeAreaCallback = null;
    }
  };
}
function initManusRuntime() {
  if (!isWeb() || !isInIframe()) return;
  if (initialized) return;
  initialized = true;
  log("initManusRuntime called");
  window.addEventListener("message", handleMessage);
  sendToParent("appDevServerReady", {});
}
function isRunningInPreviewIframe() {
  return isWeb() && isInIframe();
}
export {
  initManusRuntime,
  isRunningInPreviewIframe,
  subscribeSafeAreaInsets
};
