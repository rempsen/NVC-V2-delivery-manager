import { View, Text, Pressable, Image, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE, NVC_LOGO_DARK, NVC_LOGO_LIGHT } from "@/constants/brand";

export interface NVCHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  variant?: "blue" | "orange" | "surface";
  showLogo?: boolean;
}

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
  const subColor = isDark ? "rgba(255,255,255,0.68)" : colors.muted;
  const iconColor = isDark ? "#ffffff" : colors.foreground;
  const logoSource = isDark ? NVC_LOGO_DARK : NVC_LOGO_LIGHT;

  const handleBack = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onBack) onBack();
    else router.back();
  };

  const handleLogoPress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/" as any);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          paddingTop: insets.top + 12,
          borderBottomColor: isDark ? "rgba(255,255,255,0.10)" : colors.border,
          shadowColor: isDark ? NVC_BLUE : "#0F172A",
        },
      ]}
    >
      {/* Left — logo + back button */}
      <View style={styles.left}>
        {showLogo && (
          <Pressable
            onPress={handleLogoPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [styles.logoBtn, { opacity: pressed ? 0.65 : 1 }]}
          >
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          </Pressable>
        )}
        {showBack && (
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: pressed ? "rgba(255,255,255,0.12)" : "transparent" },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol name="chevron.left" size={20} color={iconColor} />
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
      <View style={styles.right}>{rightElement ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 13,
    borderBottomWidth: 0.5,
    minHeight: 58,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 52,
  },
  logoBtn: {
    borderRadius: 6,
    padding: 2,
  },
  logo: {
    width: 30,
    height: 30,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    letterSpacing: 0.1,
  },
  right: {
    minWidth: 52,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
