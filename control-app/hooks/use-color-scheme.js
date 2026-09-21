import { useThemeContext } from "@/lib/theme-provider";
function useColorScheme() {
  return useThemeContext().colorScheme;
}
export {
  useColorScheme
};
