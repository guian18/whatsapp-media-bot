import { Colors } from "@/constants/theme";
import { useColorScheme } from "./use-color-scheme.js";
function useColors(colorSchemeOverride) {
  const colorSchema = useColorScheme();
  const scheme = colorSchemeOverride ?? colorSchema ?? "light";
  return Colors[scheme];
}
export {
  useColors
};
