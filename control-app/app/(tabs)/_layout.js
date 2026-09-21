import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;
  return /* @__PURE__ */ React.createElement(
    Tabs,
    {
      screenOptions: {
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5
        }
      }
    },
    /* @__PURE__ */ React.createElement(
      Tabs.Screen,
      {
        name: "index",
        options: {
          title: "Control",
          tabBarIcon: ({ color }) => /* @__PURE__ */ React.createElement(IconSymbol, { size: 28, name: "house.fill", color })
        }
      }
    )
  );
}
export {
  TabLayout as default
};
