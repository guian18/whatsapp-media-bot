import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "@/lib/utils";
function ScreenContainer({
  children,
  edges = ["top", "left", "right"],
  className,
  containerClassName,
  safeAreaClassName,
  style,
  ...props
}) {
  return /* @__PURE__ */ React.createElement(
    View,
    {
      className: cn(
        "flex-1",
        "bg-background",
        containerClassName
      ),
      ...props
    },
    /* @__PURE__ */ React.createElement(
      SafeAreaView,
      {
        edges,
        className: cn("flex-1", safeAreaClassName),
        style
      },
      /* @__PURE__ */ React.createElement(View, { className: cn("flex-1", className) }, children)
    )
  );
}
export {
  ScreenContainer
};
