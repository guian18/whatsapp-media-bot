import { View } from "react-native";
import { cn } from "@/lib/utils";
function ThemedView({ className, ...otherProps }) {
  return /* @__PURE__ */ React.createElement(View, { className: cn("bg-background", className), ...otherProps });
}
export {
  ThemedView
};
