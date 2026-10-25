import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "./theme";
import { Icon } from "./ui";
import type { IconName } from "./ui";

// Design labels per route; route names (and so accessibility labels "<Route>, tab") are unchanged.
const tabs: Record<string, { label: string; icon: IconName }> = {
  Groups: { label: "Groups", icon: "people" },
  Setup: { label: "Setup", icon: "person" },
  Planning: { label: "Plans", icon: "calendar" },
  Events: { label: "Events", icon: "check" },
  Notifications: { label: "Alerts", icon: "bell" },
};

// Floating pill tab bar with a coral active pill.
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, type, bold } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: colors.bg, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12), paddingTop: 8 }}>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: colors.surface,
          borderRadius: 999,
          padding: 6,
          gap: 4,
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = tabs[route.name] ?? { label: route.name, icon: "dot" as IconName };
          const fg = focused ? colors.onCoral : colors.ink;
          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={`${descriptors[route.key]?.options.title ?? route.name}, tab, ${index + 1} of ${state.routes.length}`}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              style={{
                flex: 1,
                minHeight: 56,
                minWidth: 48,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                backgroundColor: focused ? colors.coral : "transparent",
              }}
            >
              <Icon name={meta.icon} size={18} color={fg} />
              <Text style={[type.label, bold, { color: fg, textTransform: "none", letterSpacing: 0, fontSize: 11 }]} numberOfLines={1}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
