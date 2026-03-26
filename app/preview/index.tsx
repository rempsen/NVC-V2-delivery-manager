/**
 * NVC360 Preview Switcher
 * Landing page to switch between Mobile App, Dispatcher Dashboard, and Customer Portal views
 * Route: /preview
 */
import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_BLUE_DARK, NVC_ORANGE, NVC_LOGO_DARK } from "@/constants/brand";

const VIEWS = [
  {
    id: "mobile",
    title: "Mobile App",
    subtitle: "Technician & Dispatcher",
    description:
      "The iOS/Android app used by field technicians and dispatchers on the go. Includes job management, real-time status updates, navigation, and photo capture.",
    icon: "iphone" as const,
    color: NVC_BLUE,
    route: "/(tabs)" as const,
    tags: ["iOS", "Android", "Expo Go"],
    features: [
      "Dashboard with live KPIs",
      "Work order management",
      "Field team tracker",
      "In-app messaging",
      "Job execution & signatures",
    ],
  },
  {
    id: "dashboard",
    title: "Dispatcher Dashboard",
    subtitle: "Desktop Web Portal",
    description:
      "Full-screen desktop interface for dispatchers and office managers. Includes live fleet map, work order table with filters, team status panel, and quick actions.",
    icon: "desktopcomputer" as const,
    color: "#8B5CF6",
    route: "/dashboard" as const,
    tags: ["Web", "Desktop", "Dispatcher"],
    features: [
      "Live fleet map with GPS pins",
      "Work orders table with filters",
      "Field team status grid",
      "Quick assign & alerts",
      "Daily KPI stats",
    ],
  },
  {
    id: "customer",
    title: "Customer Portal",
    subtitle: "Client-Facing Web",
    description:
      "The public-facing page your customers see when they receive a tracking link. Shows real-time technician location, ETA, job status, and company branding.",
    icon: "globe" as const,
    color: "#22C55E",
    route: "/track/demo-job-hash" as const,
    tags: ["Web", "Public", "Customer"],
    features: [
      "Real-time technician tracking",
      "ETA countdown",
      "Job status updates",
      "NVC360 branded experience",
      "Mobile-responsive",
    ],
  },
];

export default function PreviewSwitcher() {
  const colors = useColors();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: NVC_BLUE_DARK }]}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={NVC_LOGO_DARK} style={styles.logo} resizeMode="contain" />
        <View>
          <Text style={styles.headerTitle}>NVC360 Dispatch</Text>
          <Text style={styles.headerSub}>Preview Portal — Select a view to explore</Text>
        </View>
      </View>

      {/* Cards */}
      <ScrollView
        contentContainerStyle={styles.cardsContainer}
        horizontal={Platform.OS === "web"}
        showsHorizontalScrollIndicator={false}
      >
        {VIEWS.map((view) => (
          <Pressable
            key={view.id}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.surface, borderColor: view.color + "40", opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={() => router.push(view.route as any)}
          >
            {/* Top accent bar */}
            <View style={[styles.cardAccent, { backgroundColor: view.color }]} />

            {/* Icon */}
            <View style={[styles.cardIconWrap, { backgroundColor: view.color + "18" }]}>
              <IconSymbol name={view.icon as any} size={32} color={view.color} />
            </View>

            {/* Title */}
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{view.title}</Text>
            <Text style={[styles.cardSubtitle, { color: view.color }]}>{view.subtitle}</Text>

            {/* Tags */}
            <View style={styles.tagsRow}>
              {view.tags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: view.color + "15" }]}>
                  <Text style={[styles.tagText, { color: view.color }]}>{tag}</Text>
                </View>
              ))}
            </View>

            {/* Description */}
            <Text style={[styles.cardDesc, { color: colors.muted }]}>{view.description}</Text>

            {/* Feature list */}
            <View style={styles.featureList}>
              {view.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <View style={[styles.featureDot, { backgroundColor: view.color }]} />
                  <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
                </View>
              ))}
            </View>

            {/* CTA */}
            <Pressable
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: view.color, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => router.push(view.route as any)}
            >
              <Text style={styles.ctaText}>Open {view.title}</Text>
              <IconSymbol name="chevron.right" size={14} color="#fff" />
            </Pressable>
          </Pressable>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>NVC360.com · Dispatch Platform v2.0 · Built with Manus</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: "100%" as any,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  cardsContainer: {
    flexDirection: "row",
    gap: 20,
    padding: 32,
    flexWrap: "wrap" as any,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  card: {
    width: 320,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    paddingBottom: 20,
  },
  cardAccent: {
    height: 4,
    width: "100%",
  },
  cardIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    paddingHorizontal: 20,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 20,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 20,
    marginTop: 10,
    flexWrap: "wrap",
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  featureList: {
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 6,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  featureText: {
    fontSize: 12,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 20,
    marginTop: 18,
    paddingVertical: 11,
    borderRadius: 10,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  footerText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
  },
});
