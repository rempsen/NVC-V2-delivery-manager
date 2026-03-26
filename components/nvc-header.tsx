import { View, Text, Pressable, Image, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_BLUE_DARK, NVC_ORANGE, NVC_LOGO_DARK, NVC_LOGO_LIGHT } from "@/constants/brand";

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
  /**
   * Header variant:
   * - "blue"    — NVC royal-sky blue (default for all screens)
   * - "orange"  — NVC orange (legacy, avoid for new screens)
   * - "surface" — uses theme surface color (light/dark aware)
   */
  variant?: "blue" | "orange" | "surface";
  /** Show the NVC360 logo to the left of the title. Default: true */
  showLogo?: boolean;
}

/**
 * NVCHeader — universal navigation header used on every screen.
 *
 * Design principles:
 * - Royal-sky blue (#1E6FBF) as the standard header background
 * - NVC360 logo always visible on the left
 * - Back button present on all sub-screens
 * - Title centred; right slot is optional
 * - Respects safe-area top inset
 */
export function NVCHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightElement,
  variant = "blue",
  showLogo = true,
}: NVCHeaderProps) {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const bgColor =
    variant === "orange"
      ? NVC_ORANGE
      : variant === "surface"
      ? colors.surface
      : NVC_BLUE;

  const isDark = variant !== "surface";
  const textColor = isDark ? "#ffffff" : colors.foreground;
  const subColor = isDark ? "rgba(255,255,255,0.72)" : colors.muted;
  const iconColor = isDark ? "#ffffff" : colors.foreground;
  const logoSource = isDark ? NVC_LOGO_DARK : NVC_LOGO_LIGHT;

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
          borderBottomColor: isDark ? "rgba(255,255,255,0.12)" : colors.border,
        },
      ]}
    >
      {/* Left — logo + back button */}
      <View style={styles.left}>
        {showLogo && (
          <Image
            source={logoSource}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        {showBack && (
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol name="chevron.left" size={18} color={iconColor} />
          </Pressable>
        )}
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
      <View style={styles.right}>
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
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 48,
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 6,
  },
  backBtn: {
    padding: 4,
  },
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  right: {
    minWidth: 48,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
