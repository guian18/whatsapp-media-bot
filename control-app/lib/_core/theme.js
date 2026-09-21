import { Platform } from "react-native";
import themeConfig from "@/theme.config";
const ThemeColors = themeConfig.themeColors;
function buildSchemePalette(colors) {
  const palette = {
    light: {},
    dark: {}
  };
  Object.keys(colors).forEach((name) => {
    const swatch = colors[name];
    palette.light[name] = swatch.light;
    palette.dark[name] = swatch.dark;
  });
  return palette;
}
const SchemeColors = buildSchemePalette(ThemeColors);
function buildRuntimePalette(scheme) {
  const base = SchemeColors[scheme];
  return {
    ...base,
    text: base.foreground,
    background: base.background,
    tint: base.primary,
    icon: base.muted,
    tabIconDefault: base.muted,
    tabIconSelected: base.primary,
    border: base.border
  };
}
const Colors = {
  light: buildRuntimePalette("light"),
  dark: buildRuntimePalette("dark")
};
const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace"
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace"
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
  }
});
export {
  Colors,
  Fonts,
  SchemeColors,
  ThemeColors
};
