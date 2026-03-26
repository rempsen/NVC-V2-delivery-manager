import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  ViewStyle,
  TextStyle,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { NVC_BLUE, NVC_ORANGE, NVC_LOGO_DARK, WIDGET_SURFACE_LIGHT } from "@/constants/brand";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole =
  | "nvc_super_admin" | "nvc_project_manager" | "nvc_support"
  | "company_admin" | "divisional_manager" | "dispatcher"
  | "field_technician" | "office_staff";

export interface AuthUser {
  id: string; name: string; email: string; role: UserRole;
  tenantId: string | null; tenantName: string | null;
  tenantColor: string | null; tenantLogo: string | null;
  avatarUrl: string | null; provider: "email" | "google" | "apple";
}

// ─── Mock Users ───────────────────────────────────────────────────────────────

const MOCK_USERS: Record<string, AuthUser> = {
  "admin@nvc360.com": { id: "u-nvc-001", name: "Dan Rosenblat", email: "admin@nvc360.com", role: "nvc_super_admin", tenantId: null, tenantName: "NVC360", tenantColor: "#E85D04", tenantLogo: null, avatarUrl: null, provider: "email" },
  "pm@nvc360.com": { id: "u-nvc-002", name: "Sarah Mitchell", email: "pm@nvc360.com", role: "nvc_project_manager", tenantId: null, tenantName: "NVC360", tenantColor: "#8B5CF6", tenantLogo: null, avatarUrl: null, provider: "email" },
  "dispatch@acmehvac.com": { id: "u-t1-001", name: "James Chen", email: "dispatch@acmehvac.com", role: "dispatcher", tenantId: "t-001", tenantName: "Acme HVAC Services", tenantColor: "#3B82F6", tenantLogo: null, avatarUrl: null, provider: "email" },
  "tech@acmehvac.com": { id: "u-t1-002", name: "Mike Torres", email: "tech@acmehvac.com", role: "field_technician", tenantId: "t-001", tenantName: "Acme HVAC Services", tenantColor: "#3B82F6", tenantLogo: null, avatarUrl: null, provider: "email" },
  "admin@plumbpro.com": { id: "u-t2-001", name: "Lisa Park", email: "admin@plumbpro.com", role: "company_admin", tenantId: "t-002", tenantName: "PlumbPro Solutions", tenantColor: "#22C55E", tenantLogo: null, avatarUrl: null, provider: "email" },
};

const ROLE_LABELS: Record<UserRole, string> = {
  nvc_super_admin: "NVC360 Super Admin", nvc_project_manager: "NVC360 Project Manager",
  nvc_support: "NVC360 Support", company_admin: "Company Admin",
  divisional_manager: "Divisional Manager", dispatcher: "Dispatcher",
  field_technician: "Field Technician", office_staff: "Office Staff",
};

const ROLE_COLORS: Record<UserRole, string> = {
  nvc_super_admin: "#E85D04", nvc_project_manager: "#8B5CF6", nvc_support: "#3B82F6",
  company_admin: "#22C55E", divisional_manager: "#06B6D4", dispatcher: "#F59E0B",
  field_technician: "#6366F1", office_staff: "#6B7280",
};

// ─── Demo Chip ────────────────────────────────────────────────────────────────

function DemoChip({ email, role, onPress }: { email: string; role: UserRole; onPress: () => void }) {
  const roleColor = ROLE_COLORS[role];
  return (
    <Pressable
      style={({ pressed }) => [styles.demoChip, { backgroundColor: roleColor + "12", borderColor: roleColor + "35", opacity: pressed ? 0.8 : 1 }] as ViewStyle[]}
      onPress={onPress}
    >
      <View style={[styles.demoChipDot, { backgroundColor: roleColor }] as ViewStyle[]} />
      <View style={styles.demoChipInfo}>
        <Text style={[styles.demoChipRole, { color: roleColor }] as TextStyle[]}>{ROLE_LABELS[role]}</Text>
        <Text style={styles.demoChipEmail}>{email}</Text>
      </View>
      <IconSymbol name="arrow.right.circle.fill" size={16} color={roleColor} />
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  const haptic = () => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

  const saveAndNavigate = async (user: AuthUser) => {
    if (Platform.OS !== "web") {
      await SecureStore.setItemAsync("nvc360_user", JSON.stringify(user));
      await SecureStore.setItemAsync("nvc360_token", `mock_jwt_${user.id}_${Date.now()}`);
    }
    if (user.role === "nvc_super_admin" || user.role === "nvc_project_manager") {
      router.replace("/super-admin" as any);
    } else if (user.role === "field_technician") {
      // Technicians go to the agent home (no fleet map, task-focused)
      router.replace("/agent-home" as any);
    } else {
      // Dispatchers, company admins, managers → main dashboard
      router.replace("/(tabs)" as any);
    }
  };

  const handleGoogleSignIn = async () => {
    haptic(); setLoadingProvider("google");
    try {
      await new Promise((r) => setTimeout(r, 900));
      await saveAndNavigate({ id: "u-google-001", name: "Google Demo User", email: "demo@gmail.com", role: "dispatcher", tenantId: "t-001", tenantName: "Acme HVAC Services", tenantColor: "#3B82F6", tenantLogo: null, avatarUrl: null, provider: "google" });
    } catch { Alert.alert("Error", "Google sign-in failed."); }
    finally { setLoadingProvider(null); }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== "ios") { Alert.alert("Apple Sign-In", "Apple Sign-In is only available on iOS."); return; }
    setLoadingProvider("apple");
    try {
      const credential = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
      await saveAndNavigate({ id: credential.user, name: credential.fullName?.givenName ? `${credential.fullName.givenName} ${credential.fullName.familyName ?? ""}`.trim() : "Apple User", email: credential.email ?? "apple@privaterelay.appleid.com", role: "dispatcher", tenantId: "t-001", tenantName: "Acme HVAC Services", tenantColor: "#3B82F6", tenantLogo: null, avatarUrl: null, provider: "apple" });
    } catch (e: any) { if (e.code !== "ERR_REQUEST_CANCELED") Alert.alert("Apple Sign-In Failed", "Please try again."); }
    finally { setLoadingProvider(null); }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) { Alert.alert("Missing Fields", "Please enter your email and password."); return; }
    haptic(); setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const user = MOCK_USERS[email.toLowerCase().trim()];
      if (!user || password !== "demo123") { Alert.alert("Login Failed", "Invalid credentials.\n\nHint: Use password 'demo123' with any demo account."); return; }
      await saveAndNavigate(user);
    } finally { setLoading(false); }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    haptic(); setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      const user = MOCK_USERS[demoEmail];
      if (user) await saveAndNavigate(user);
    } finally { setLoading(false); }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-[#EFF2F7]">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* ── Brand Header ── */}
          <View style={styles.brandSection}>
            <View style={styles.logoWrap}>
              <Image source={NVC_LOGO_DARK as any} style={styles.logoImg as any} resizeMode="contain" />
            </View>
            <Text style={styles.brandTitle}>NVC360</Text>
            <Text style={styles.brandSubtitle}>Field Service Management Platform</Text>
          </View>

          {/* ── Auth Card ── */}
          <View style={styles.card}>

            {/* Social Buttons */}
            <View style={styles.socialSection}>
              <Pressable
                style={({ pressed }) => [styles.socialBtn, styles.googleBtn, pressed && { opacity: 0.85 }] as ViewStyle[]}
                onPress={handleGoogleSignIn}
                disabled={loadingProvider !== null || loading}
              >
                {loadingProvider === "google" ? <ActivityIndicator size="small" color="#374151" /> : (
                  <>
                    <View style={styles.googleIcon}><Text style={styles.googleIconText}>G</Text></View>
                    <Text style={styles.googleBtnText}>Continue with Google</Text>
                  </>
                )}
              </Pressable>

              {Platform.OS === "ios" ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={12}
                  style={styles.appleBtn}
                  onPress={handleAppleSignIn}
                />
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.socialBtn, styles.appleWebBtn, pressed && { opacity: 0.85 }] as ViewStyle[]}
                  onPress={handleAppleSignIn}
                  disabled={loadingProvider !== null || loading}
                >
                  {loadingProvider === "apple" ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <IconSymbol name="apple.logo" size={18} color="#fff" />
                      <Text style={styles.appleBtnText}>Continue with Apple</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign in with email</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email Form */}
            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <IconSymbol name="envelope.fill" size={16} color="#9CA3AF" />
                <TextInput
                  style={styles.input}
                  placeholder="Work email address"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputWrapper}>
                <IconSymbol name="lock.fill" size={16} color="#9CA3AF" />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleEmailLogin}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <IconSymbol name={showPassword ? "eye.slash.fill" : "eye.fill"} size={16} color="#9CA3AF" />
                </Pressable>
              </View>

              <Pressable style={styles.forgotBtn} onPress={() => Alert.alert("Reset Password", "A password reset link will be sent to your email.")}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.loginBtn, (pressed || loading) && { opacity: 0.85 }] as ViewStyle[]}
                onPress={handleEmailLogin}
                disabled={loading || loadingProvider !== null}
              >
                {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.loginBtnText}>Sign In</Text>}
              </Pressable>
            </View>
          </View>

          {/* ── Demo Accounts ── */}
          <Pressable
            style={({ pressed }) => [styles.demoToggle, pressed && { opacity: 0.7 }] as ViewStyle[]}
            onPress={() => setShowDemo((v) => !v)}
          >
            <IconSymbol name="person.2.fill" size={14} color="#9CA3AF" />
            <Text style={styles.demoToggleText}>{showDemo ? "Hide" : "Show"} demo accounts</Text>
            <IconSymbol name={showDemo ? "chevron.up" : "chevron.down"} size={12} color="#9CA3AF" />
          </Pressable>

          {showDemo && (
            <View style={styles.demoSection}>
              <Text style={styles.demoSectionTitle}>TAP TO LOGIN — password: demo123</Text>
              {Object.entries(MOCK_USERS).map(([demoEmail, user]) => (
                <DemoChip key={demoEmail} email={demoEmail} role={user.role} onPress={() => handleDemoLogin(demoEmail)} />
              ))}
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By signing in, you agree to NVC360's{" "}
              <Text style={styles.footerLink}>Terms of Service</Text>
              {" "}and{" "}
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Text>
            <Text style={styles.footerVersion}>NVC360 v2.0 · nvc360.com</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create<{
  scroll: ViewStyle; brandSection: ViewStyle; logoWrap: ViewStyle;
  logoImg: ViewStyle; brandTitle: TextStyle; brandSubtitle: TextStyle;
  card: ViewStyle; socialSection: ViewStyle; socialBtn: ViewStyle;
  googleBtn: ViewStyle; googleIcon: ViewStyle; googleIconText: TextStyle;
  googleBtnText: TextStyle; appleBtn: ViewStyle; appleWebBtn: ViewStyle;
  appleBtnText: TextStyle; divider: ViewStyle; dividerLine: ViewStyle;
  dividerText: TextStyle; form: ViewStyle; inputWrapper: ViewStyle;
  input: TextStyle; forgotBtn: ViewStyle; forgotText: TextStyle;
  loginBtn: ViewStyle; loginBtnText: TextStyle; demoToggle: ViewStyle;
  demoToggleText: TextStyle; demoSection: ViewStyle; demoSectionTitle: TextStyle;
  demoChip: ViewStyle; demoChipDot: ViewStyle; demoChipInfo: ViewStyle;
  demoChipRole: TextStyle; demoChipEmail: TextStyle; footer: ViewStyle;
  footerText: TextStyle; footerLink: TextStyle; footerVersion: TextStyle;
}>({
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },

  // Brand
  brandSection: { alignItems: "center", paddingTop: 40, paddingBottom: 28, gap: 8 },
  logoWrap: {
    width: 88, height: 88, borderRadius: 24,
    backgroundColor: NVC_BLUE,
    alignItems: "center", justifyContent: "center",
    shadowColor: NVC_BLUE, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38, shadowRadius: 20, elevation: 10, marginBottom: 6,
  },
  logoImg: { width: 62, height: 62 },
  brandTitle: { fontSize: 32, fontWeight: "900", color: "#1A1E2A", letterSpacing: -1 },
  brandSubtitle: { fontSize: 15, color: "#6B7280", textAlign: "center" },

  // Card
  card: {
    backgroundColor: WIDGET_SURFACE_LIGHT, borderRadius: 20,
    padding: 24, marginBottom: 16,
    shadowColor: "#1E3A5F", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 5,
  },

  // Social
  socialSection: { gap: 12, marginBottom: 4 },
  socialBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    height: 56, borderRadius: 14, gap: 12,
  },
  googleBtn: { backgroundColor: "#F9FAFB", borderWidth: 1.5, borderColor: "#E5E7EB" },
  googleIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  googleIconText: { fontSize: 14, fontWeight: "800", color: "#4285F4" },
  googleBtnText: { fontSize: 16, fontWeight: "600", color: "#374151" },
  appleBtn: { width: "100%", height: 56 },
  appleWebBtn: { backgroundColor: "#000" },
  appleBtnText: { fontSize: 16, fontWeight: "600", color: "#fff" },

  // Divider
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dividerText: { fontSize: 12, fontWeight: "500", color: "#9CA3AF" },

  // Form
  form: { gap: 14 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", height: 56,
    borderRadius: 14, borderWidth: 1.5, borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB", paddingHorizontal: 16, gap: 12,
  },
  input: { flex: 1, fontSize: 16, color: "#1A1E2A" },
  forgotBtn: { alignSelf: "flex-end" },
  forgotText: { fontSize: 14, fontWeight: "600", color: NVC_BLUE },
  loginBtn: {
    height: 56, borderRadius: 14, backgroundColor: NVC_BLUE,
    alignItems: "center", justifyContent: "center", marginTop: 6,
  },
  loginBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },

  // Demo
  demoToggle: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 12,
  },
  demoToggleText: { fontSize: 13, fontWeight: "500", color: "#9CA3AF" },
  demoSection: { gap: 8, marginBottom: 8 },
  demoSectionTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textAlign: "center", color: "#9CA3AF", marginBottom: 4 },
  demoChip: {
    flexDirection: "row", alignItems: "center",
    padding: 14, borderRadius: 14, borderWidth: 1.5, gap: 12,
    minHeight: 56,
  },
  demoChipDot: { width: 10, height: 10, borderRadius: 5 },
  demoChipInfo: { flex: 1 },
  demoChipRole: { fontSize: 13, fontWeight: "700" },
  demoChipEmail: { fontSize: 12, marginTop: 2, color: "#9CA3AF" },

  // Footer
  footer: { alignItems: "center", gap: 6, marginTop: 16 },
  footerText: { fontSize: 11, textAlign: "center", lineHeight: 16, color: "#9CA3AF" },
  footerLink: { color: NVC_BLUE, fontWeight: "600" },
  footerVersion: { fontSize: 11, color: "#C0C8D8" },
});
