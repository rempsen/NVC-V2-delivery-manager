import { Tabs, useRouter } from "expo-router";
import { Platform, View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_ORANGE, NVC_BLUE } from "@/constants/brand";
import * as SecureStore from "expo-secure-store";
import { getApiBaseUrl } from "@/constants/oauth";

// ─── Auth Guard ───────────────────────────────────────────────────────────────
// On web: check for session cookie via the API (called directly on 3000-xxx domain)
// On native: check for stored token in SecureStore
// If not authenticated → redirect to /login

function useAuthGuard() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        if (Platform.OS === "web") {
          // Web: call /api/auth/me DIRECTLY on the 3000-xxx domain (not Metro proxy)
          // so the .manus.computer-scoped cookie is sent and validated correctly.
          const apiBase = getApiBaseUrl();
          const url = apiBase ? `${apiBase}/api/auth/me` : "/api/auth/me";
          const res = await fetch(url, { credentials: "include" });
          if (!res.ok) {
            router.replace("/login" as any);
            return;
          }
        } else {
          // Native: check for stored session token
          const token = await SecureStore.getItemAsync("nvc360_token");
          if (!token) {
            router.replace("/login" as any);
            return;
          }
        }
      } catch {
        // Network error or API unavailable — fall through to show dashboard
        // (demo mode: no backend required)
      } finally {
        setChecked(true);
      }
    }
    check();
  }, [router]);

  return checked;
}

// ─── Tab Badge ────────────────────────────────────────────────────────────────

function TabBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 60 + bottomPadding;
  const authChecked = useAuthGuard();

  // Show a brief loading screen while auth check runs
  if (!authChecked) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: NVC_BLUE }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: NVC_ORANGE,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Work Orders",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="doc.text.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agents"
        options={{
          title: "Technicians",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="person.2.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: "Customers",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="person.text.rectangle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="gearshape.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
