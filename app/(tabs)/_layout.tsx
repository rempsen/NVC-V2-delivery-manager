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

function useAuthGuard() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        if (Platform.OS === "web") {
          const apiBase = getApiBaseUrl();
          const url = apiBase ? `${apiBase}/api/auth/me` : "/api/auth/me";
          const res = await fetch(url, { credentials: "include" });
          if (!res.ok) {
            router.replace("/login" as any);
            return;
          }
        } else {
          const token = await SecureStore.getItemAsync("nvc360_token");
          if (!token) {
            router.replace("/login" as any);
            return;
          }
        }
      } catch {
        // Network error — fall through to show dashboard (demo mode)
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

  if (!authChecked) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <View style={styles.loadingCard}>
          <View style={[styles.logoMark, { backgroundColor: NVC_BLUE }]}>
            <Text style={styles.logoText}>N</Text>
          </View>
          <ActivityIndicator size="small" color={NVC_ORANGE} style={{ marginTop: 20 }} />
          <Text style={[styles.loadingLabel, { color: colors.muted }]}>Loading NVC360…</Text>
        </View>
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
          paddingTop: 6,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          // Subtle elevation for the tab bar
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Inter_600SemiBold",
          marginTop: 2,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Work Orders",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="doc.text.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agents"
        options={{
          title: "Technicians",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="person.2.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: "Customers",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="person.text.rectangle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="gearshape.fill" color={color} />
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
  loadingCard: {
    alignItems: "center",
    padding: 40,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#fff",
    fontSize: 32,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -1,
  },
  loadingLabel: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.1,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#DC2626",
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
    fontFamily: "Inter_700Bold",
  },
});
