import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics
} from "react-native-safe-area-context";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
void SplashScreen.preventAutoHideAsync().catch(() => void 0);
const DEFAULT_WEB_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME = { x: 0, y: 0, width: 0, height: 0 };
const unstable_settings = {
  anchor: "(tabs)"
};
function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;
  const [insets, setInsets] = useState(initialInsets);
  const [frame, setFrame] = useState(initialFrame);
  useEffect(() => {
    initManusRuntime();
  }, []);
  const handleSafeAreaUpdate = useCallback((metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          // Disable automatic refetching on window focus for mobile
          refetchOnWindowFocus: false,
          // Retry failed requests once
          retry: 1
        }
      }
    })
  );
  const [trpcClient] = useState(() => createTRPCClient());
  const handleRootLayout = useCallback(() => {
    void SplashScreen.hideAsync().catch(() => void 0);
  }, []);
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12)
      }
    };
  }, [initialInsets, initialFrame]);
  const content = /* @__PURE__ */ React.createElement(GestureHandlerRootView, { style: { flex: 1 }, onLayout: handleRootLayout }, /* @__PURE__ */ React.createElement(trpc.Provider, { client: trpcClient, queryClient }, /* @__PURE__ */ React.createElement(QueryClientProvider, { client: queryClient }, /* @__PURE__ */ React.createElement(Stack, { screenOptions: { headerShown: false } }, /* @__PURE__ */ React.createElement(Stack.Screen, { name: "(tabs)" }), /* @__PURE__ */ React.createElement(Stack.Screen, { name: "oauth/callback" })), /* @__PURE__ */ React.createElement(StatusBar, { style: "auto" }))));
  const shouldOverrideSafeArea = Platform.OS === "web";
  if (shouldOverrideSafeArea) {
    return /* @__PURE__ */ React.createElement(ThemeProvider, null, /* @__PURE__ */ React.createElement(SafeAreaProvider, { initialMetrics: providerInitialMetrics }, /* @__PURE__ */ React.createElement(SafeAreaFrameContext.Provider, { value: frame }, /* @__PURE__ */ React.createElement(SafeAreaInsetsContext.Provider, { value: insets }, content))));
  }
  return /* @__PURE__ */ React.createElement(ThemeProvider, null, /* @__PURE__ */ React.createElement(SafeAreaProvider, { initialMetrics: providerInitialMetrics }, content));
}
export {
  RootLayout as default,
  unstable_settings
};
