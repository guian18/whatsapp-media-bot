import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
function useAuth(options) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchUser = useCallback(async () => {
    console.log("[useAuth] fetchUser called");
    try {
      setLoading(true);
      setError(null);
      if (Platform.OS === "web") {
        console.log("[useAuth] Web platform: fetching user from API...");
        const apiUser = await Api.getMe();
        console.log("[useAuth] API user response:", apiUser);
        if (apiUser) {
          const userInfo = {
            id: apiUser.id,
            openId: apiUser.openId,
            name: apiUser.name,
            email: apiUser.email,
            loginMethod: apiUser.loginMethod,
            lastSignedIn: new Date(apiUser.lastSignedIn)
          };
          setUser(userInfo);
          await Auth.setUserInfo(userInfo);
          console.log("[useAuth] Web user set from API:", userInfo);
        } else {
          console.log("[useAuth] Web: No authenticated user from API");
          setUser(null);
          await Auth.clearUserInfo();
        }
        return;
      }
      console.log("[useAuth] Native platform: checking for session token...");
      const sessionToken = await Auth.getSessionToken();
      console.log(
        "[useAuth] Session token:",
        sessionToken ? `present (${sessionToken.substring(0, 20)}...)` : "missing"
      );
      if (!sessionToken) {
        console.log("[useAuth] No session token, setting user to null");
        setUser(null);
        return;
      }
      const cachedUser = await Auth.getUserInfo();
      console.log("[useAuth] Cached user:", cachedUser);
      if (cachedUser) {
        console.log("[useAuth] Using cached user info");
        setUser(cachedUser);
      } else {
        console.log("[useAuth] No cached user, setting user to null");
        setUser(null);
      }
    } catch (err) {
      const error2 = err instanceof Error ? err : new Error("Failed to fetch user");
      console.error("[useAuth] fetchUser error:", error2);
      setError(error2);
      setUser(null);
    } finally {
      setLoading(false);
      console.log("[useAuth] fetchUser completed, loading:", false);
    }
  }, []);
  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch (err) {
      console.error("[Auth] Logout API call failed:", err);
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
    }
  }, []);
  const isAuthenticated = useMemo(() => Boolean(user), [user]);
  useEffect(() => {
    console.log("[useAuth] useEffect triggered, autoFetch:", autoFetch, "platform:", Platform.OS);
    if (autoFetch) {
      if (Platform.OS === "web") {
        console.log("[useAuth] Web: fetching user from API...");
        fetchUser();
      } else {
        Auth.getUserInfo().then((cachedUser) => {
          console.log("[useAuth] Native cached user check:", cachedUser);
          if (cachedUser) {
            console.log("[useAuth] Native: setting cached user immediately");
            setUser(cachedUser);
            setLoading(false);
          } else {
            fetchUser();
          }
        });
      }
    } else {
      console.log("[useAuth] autoFetch disabled, setting loading to false");
      setLoading(false);
    }
  }, [autoFetch, fetchUser]);
  useEffect(() => {
    console.log("[useAuth] State updated:", {
      hasUser: !!user,
      loading,
      isAuthenticated,
      error: error?.message
    });
  }, [user, loading, isAuthenticated, error]);
  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    logout
  };
}
export {
  useAuth
};
