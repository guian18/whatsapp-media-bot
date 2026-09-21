import { ThemedView } from "@/components/themed-view";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState("processing");
  const [errorMessage, setErrorMessage] = useState(null);
  useEffect(() => {
    const handleCallback = async () => {
      console.log("[OAuth] Callback handler triggered");
      console.log("[OAuth] Params received:", {
        code: params.code,
        state: params.state,
        error: params.error,
        sessionToken: params.sessionToken ? "present" : "missing",
        user: params.user ? "present" : "missing"
      });
      try {
        if (params.sessionToken) {
          console.log("[OAuth] Session token found in params (web callback)");
          await Auth.setSessionToken(params.sessionToken);
          if (params.user) {
            try {
              const userJson = typeof atob !== "undefined" ? atob(params.user) : Buffer.from(params.user, "base64").toString("utf-8");
              const userData = JSON.parse(userJson);
              const userInfo = {
                id: userData.id,
                openId: userData.openId,
                name: userData.name,
                email: userData.email,
                loginMethod: userData.loginMethod,
                lastSignedIn: new Date(userData.lastSignedIn || Date.now())
              };
              await Auth.setUserInfo(userInfo);
              console.log("[OAuth] User info stored:", userInfo);
            } catch (err) {
              console.error("[OAuth] Failed to parse user data:", err);
            }
          }
          setStatus("success");
          console.log("[OAuth] Web authentication successful, redirecting to home...");
          setTimeout(() => {
            router.replace("/(tabs)");
          }, 1e3);
          return;
        }
        let url = null;
        if (params.code || params.state || params.error) {
          console.log("[OAuth] Found params in route params");
          const urlParams = new URLSearchParams();
          if (params.code) urlParams.set("code", params.code);
          if (params.state) urlParams.set("state", params.state);
          if (params.error) urlParams.set("error", params.error);
          url = `?${urlParams.toString()}`;
          console.log("[OAuth] Constructed URL from params:", url);
        } else {
          console.log("[OAuth] No params found, checking Linking.getInitialURL()...");
          const initialUrl = await Linking.getInitialURL();
          console.log("[OAuth] Linking.getInitialURL():", initialUrl);
          if (initialUrl) {
            url = initialUrl;
          }
        }
        const error = params.error || (url ? new URL(url, "http://dummy").searchParams.get("error") : null);
        if (error) {
          console.error("[OAuth] Error parameter found:", error);
          setStatus("error");
          setErrorMessage(error || "OAuth error occurred");
          return;
        }
        let code = null;
        let state = null;
        let sessionToken = null;
        if (params.code && params.state) {
          console.log("[OAuth] Using code and state from route params");
          code = params.code;
          state = params.state;
        } else if (url) {
          console.log("[OAuth] Parsing code and state from URL:", url);
          try {
            const urlObj = new URL(url);
            code = urlObj.searchParams.get("code");
            state = urlObj.searchParams.get("state");
            sessionToken = urlObj.searchParams.get("sessionToken");
            console.log("[OAuth] Extracted from URL:", {
              code: code?.substring(0, 20) + "...",
              state: state?.substring(0, 20) + "...",
              sessionToken: sessionToken ? "present" : "missing"
            });
          } catch (e) {
            console.log("[OAuth] Failed to parse as full URL, trying regex:", e);
            const match = url.match(/[?&](code|state|sessionToken)=([^&]+)/g);
            if (match) {
              match.forEach((param) => {
                const [key, value] = param.substring(1).split("=");
                if (key === "code") code = decodeURIComponent(value);
                if (key === "state") state = decodeURIComponent(value);
                if (key === "sessionToken") sessionToken = decodeURIComponent(value);
              });
              console.log("[OAuth] Extracted from regex:", {
                code: code?.substring(0, 20) + "...",
                state: state?.substring(0, 20) + "...",
                sessionToken: sessionToken ? "present" : "missing"
              });
            }
          }
        }
        console.log("[OAuth] Final extracted values:", {
          hasCode: !!code,
          hasState: !!state,
          hasSessionToken: !!sessionToken
        });
        if (sessionToken) {
          console.log("[OAuth] Session token found in URL, storing...");
          await Auth.setSessionToken(sessionToken);
          console.log("[OAuth] Session token stored successfully");
          setStatus("success");
          console.log("[OAuth] Redirecting to home...");
          setTimeout(() => {
            router.replace("/(tabs)");
          }, 1e3);
          return;
        }
        if (!code || !state) {
          console.error("[OAuth] Missing code or state parameter", {
            hasCode: !!code,
            hasState: !!state
          });
          setStatus("error");
          setErrorMessage("Missing code or state parameter");
          return;
        }
        console.log("[OAuth] Exchanging code for session token...", {
          code: code.substring(0, 20) + "...",
          state: state.substring(0, 20) + "..."
        });
        const result = await Api.exchangeOAuthCode(code, state);
        console.log("[OAuth] Exchange result:", {
          hasSessionToken: !!result.sessionToken,
          hasUser: !!result.user
        });
        if (result.sessionToken) {
          console.log("[OAuth] Session token received, storing...");
          await Auth.setSessionToken(result.sessionToken);
          console.log("[OAuth] Session token stored successfully");
          if (result.user) {
            console.log("[OAuth] User data received:", result.user);
            const userInfo = {
              id: result.user.id,
              openId: result.user.openId,
              name: result.user.name,
              email: result.user.email,
              loginMethod: result.user.loginMethod,
              lastSignedIn: new Date(result.user.lastSignedIn || Date.now())
            };
            await Auth.setUserInfo(userInfo);
            console.log("[OAuth] User info stored:", userInfo);
          } else {
            console.log("[OAuth] No user data in result");
          }
          setStatus("success");
          console.log("[OAuth] Authentication successful, redirecting to home...");
          setTimeout(() => {
            console.log("[OAuth] Executing redirect...");
            router.replace("/(tabs)");
          }, 1e3);
        } else {
          console.error("[OAuth] No session token in result:", result);
          setStatus("error");
          setErrorMessage("No session token received");
        }
      } catch (error) {
        console.error("[OAuth] Callback error:", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to complete authentication"
        );
      }
    };
    handleCallback();
  }, [params.code, params.state, params.error, params.sessionToken, params.user, router]);
  return /* @__PURE__ */ React.createElement(SafeAreaView, { className: "flex-1", edges: ["top", "bottom", "left", "right"] }, /* @__PURE__ */ React.createElement(ThemedView, { className: "flex-1 items-center justify-center gap-4 p-5" }, status === "processing" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(ActivityIndicator, { size: "large" }), /* @__PURE__ */ React.createElement(Text, { className: "mt-4 text-base leading-6 text-center text-foreground" }, "Completing authentication...")), status === "success" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Text, { className: "text-base leading-6 text-center text-foreground" }, "Authentication successful!"), /* @__PURE__ */ React.createElement(Text, { className: "text-base leading-6 text-center text-foreground" }, "Redirecting...")), status === "error" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Text, { className: "mb-2 text-xl font-bold leading-7 text-error" }, "Authentication failed"), /* @__PURE__ */ React.createElement(Text, { className: "text-base leading-6 text-center text-foreground" }, errorMessage))));
}
export {
  OAuthCallback as default
};
