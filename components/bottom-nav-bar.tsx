/**
 * BottomNavBar — persistent bottom navigation for non-tab screens (dispatcher, agent detail, etc.)
 * Mirrors the main tab bar so users always have a way to navigate home.
 */
import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_ORANGE } from "@/constants/brand";

type NavItem = {
  label: string;
  icon: any;
  route: string;
  matchPaths?: string[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",    icon: "house.fill",                  route: "/",          matchPaths: ["/", "/index"] },
  { label: "Work Orders",  icon: "doc.text.fill",               route: "/(tabs)/tasks",    matchPaths: ["/tasks", "/(tabs)/tasks"] },
  { label: "Technicians",  icon: "person.2.fill",               route: "/(tabs)/agents",   matchPaths: ["/agents", "/(tabs)/agents", "/agent/"] },
  { label: "Customers",    icon: "person.text.rectangle.fill",  route: "/(tabs)/customers",matchPaths: ["/customers", "/(tabs)/customers", "/customer/"] },
  { label: "Settings",     icon: "gearshape.fill",              route: "/(tabs)/settings", matchPaths: ["/settings", "/(tabs)/settings"] },
];

export function BottomNavBar() {
  const colors = useColors();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const barHeight = 60 + bottomPadding;

  const isActive = (item: NavItem) => {
    if (item.matchPaths) {
      return item.matchPaths.some((p) => pathname === p || pathname.startsWith(p));
    }
    return pathname === item.route;
  };

  return (
    <View
      style={[
        styles.container,
        {
          height: barHeight,
          paddingBottom: bottomPadding,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      ] as ViewStyle[]}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item);
        const tintColor = active ? NVC_ORANGE : colors.muted;
        return (
          <Pressable
            key={item.route}
            style={({ pressed }) => [
              styles.navItem,
              { opacity: pressed ? 0.7 : 1 },
            ] as ViewStyle[]}
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              router.push(item.route as any);
            }}
          >
            <IconSymbol name={item.icon} size={26} color={tintColor} />
            <Text style={[styles.label, { color: tintColor }] as TextStyle[]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 8,
    borderTopWidth: 0.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
});
