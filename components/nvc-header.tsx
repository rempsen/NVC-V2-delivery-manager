import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export interface NVCHeaderProps {
  /** Screen title shown in the centre */
  title: string;
  /** Optional subtitle shown below the title */
  subtitle?: string;
  /** Show a back chevron on the left — defaults to true for non-root screens */
  showBack?: boolean;
  /** Override the back handler (defaults to router.back()) */
  onBack?: () => void;
  /** Optional right-side element (icon button, text button, etc.) */
  rightElement?: React.ReactNode;
  /** Use the NVC orange primary colour as background (for top-level screens) */
  variant?: "primary" | "dark" | "surface";
}

/**
 * NVCHeader — a consistent, fixed navigation header used across every screen.
 *
 * Design principles:
 * - Always visible, never white-on-white
 * - Back button is always present on sub-screens
 * - Title is centred; right slot is optional
 * - Respects safe-area top inset so it never overlaps the status bar
 */
export function NVCHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightElement,
  variant = "dark",
}: NVCHeaderProps) {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const bgColor =
    variant === "primary"
      ? colors.primary
      : variant === "surface"
      ? colors.surface
      : "#0a0a0a";

  const textColor = variant === "surface" ? colors.foreground : "#ffffff";
  const subColor = variant === "surface" ? colors.muted : "rgba(255,255,255,0.75)";
  const iconColor = variant === "surface" ? colors.foreground : "#ffffff";

  const handleBack = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onBack) onBack();
    else router.back();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          paddingTop: insets.top + 4,
          borderBottomColor:
            variant === "surface" ? colors.border : "rgba(255,255,255,0.1)",
        },
      ]}
    >
      {/* Left — back button or spacer */}
      <View style={styles.side}>
        {showBack ? (
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol name="chevron.left" size={20} color={iconColor} />
          </Pressable>
        ) : null}
      </View>

      {/* Centre — title + optional subtitle */}
      <View style={styles.centre}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: subColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right — optional action slot */}
      <View style={styles.side}>
        {rightElement ?? null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    minHeight: 52,
  },
  side: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  backBtn: {
    padding: 4,
  },
});
