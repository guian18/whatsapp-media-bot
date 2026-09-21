import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
import { SchemeColors } from "@/constants/theme";
const ThemeContext = createContext(null);
function ThemeProvider({ children }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [colorScheme, setColorSchemeState] = useState(systemScheme);
  const applyScheme = useCallback((scheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = SchemeColors[scheme];
      Object.entries(palette).forEach(([token, value2]) => {
        root.style.setProperty(`--color-${token}`, value2);
      });
    }
  }, []);
  const setColorScheme = useCallback((scheme) => {
    setColorSchemeState(scheme);
    applyScheme(scheme);
  }, [applyScheme]);
  useEffect(() => {
    applyScheme(colorScheme);
  }, [applyScheme, colorScheme]);
  const themeVariables = useMemo(
    () => vars({
      "color-primary": SchemeColors[colorScheme].primary,
      "color-background": SchemeColors[colorScheme].background,
      "color-surface": SchemeColors[colorScheme].surface,
      "color-foreground": SchemeColors[colorScheme].foreground,
      "color-muted": SchemeColors[colorScheme].muted,
      "color-border": SchemeColors[colorScheme].border,
      "color-success": SchemeColors[colorScheme].success,
      "color-warning": SchemeColors[colorScheme].warning,
      "color-error": SchemeColors[colorScheme].error
    }),
    [colorScheme]
  );
  const value = useMemo(
    () => ({
      colorScheme,
      setColorScheme
    }),
    [colorScheme, setColorScheme]
  );
  console.log(value, themeVariables);
  return /* @__PURE__ */ React.createElement(ThemeContext.Provider, { value }, /* @__PURE__ */ React.createElement(View, { style: [{ flex: 1 }, themeVariables] }, children));
}
function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
export {
  ThemeProvider,
  useThemeContext
};
