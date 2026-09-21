import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
function HapticTab(props) {
  return /* @__PURE__ */ React.createElement(
    PlatformPressable,
    {
      ...props,
      onPressIn: (ev) => {
        if (process.env.EXPO_OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }
    }
  );
}
export {
  HapticTab
};
