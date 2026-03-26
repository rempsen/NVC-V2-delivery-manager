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
  Modal,
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
import { trpc } from "@/lib/trpc";
import { getApiBaseUrl } from "@/constants/oauth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole =
  | "nvc_super_admin" | "nvc_project_manager" | "nvc_support"
  | "company_admin" | "divisional_manager" | "dispatcher"
  | "field_technician" | "office_staff";

export interface AuthUser {
  id: string; name: string; email: string; role: UserRole;
  tenantId: number | null; tenantName: string | null;
  tenantColor: string | null; tenantLogo: string | null;
  avatarUrl: string | null; provider: "email" | "google" | "apple";
}

// ─── Mock Users ───────────────────────────────────────────────────────────────

const MOCK_USERS: Record<string, AuthUser> = {
  // tenantId values match the seeded DB rows: 1=Acme HVAC, 2=PlumbPro, 3=NVC360
  "admin@nvc360.com": { id: "u-nvc-001", name: "Dan Rosenblat", email: "admin@nvc360.com", role: "nvc_super_admin", tenantId: 3, tenantName: "NVC360", tenantColor: "#E85D04", tenantLogo: null, avatarUrl: null, provider: "email" },
  "pm@nvc360.com": { id: "u-nvc-002", name: "Sarah Mitchell", email: "pm@nvc360.com", role: "nvc_project_manager", tenantId: 3, tenantName: "NVC360", tenantColor: "#8B5CF6", tenantLogo: null, avatarUrl: null, provider: "email" },
  "dispatch@acmehvac.com": { id: "u-t1-001", name: "James Chen", email: "dispatch@acmehvac.com", role: "dispatcher", tenantId: 1, tenantName: "Acme HVAC Services", tenantColor: "#3B82F6", tenantLogo: null, avatarUrl: null, provider: "email" },
  "tech@acmehvac.com": { id: "u-t1-002", name: "Mike Torres", email: "tech@acmehvac.com", role: "field_technician", tenantId: 1, tenantName: "Acme HVAC Services", tenantColor: "#3B82F6", tenantLogo: null, avatarUrl: null, provider: "email" },
  "admin@plumbpro.com": { id: "u-t2-001", name: "Lisa Park", email: "admin@plumbpro.com", role: "company_admin", tenantId: 2, tenantName: "PlumbPro Solutions", tenantColor: "#22C55E", tenantLogo: null, avatarUrl: null, provider: "email" },
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

// ─── Cookie helper ────────────────────────────────────────────────────────────
// After emailLogin returns a JWT, call POST /api/auth/session DIRECTLY on the
// 3000-xxx.manus.computer domain (not through the Metro 8081 proxy).
// This ensures Express sees the real hostname and sets the cookie with
// domain=".manus.computer" so the browser sends it back on all subsequent
// requests to both 8081-xxx and 3000-xxx subdomains.

async function persistSessionCookie(token: string): Promise<void> {
  if (Platform.OS !== "web") return;
  try {
    const apiBase = getApiBaseUrl();
    if (!apiBase) return;
    // The /api/auth/session endpoint expects the token as a Bearer header
    // (not in the request body). This sets a properly-scoped cookie on the
    // 3000-xxx.manus.computer domain so subsequent /api/auth/me checks pass.
    await fetch(`${apiBase}/api/auth/session`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
  } catch (e) {
    console.warn("[auth] persistSessionCookie failed:", e);
  }
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
  // Forgot Password modal state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const haptic = () => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

  const emailLoginMutation = trpc.auth.emailLogin.useMutation();
  const forgotPasswordMutation = trpc.auth.forgotPassword.useMutation();

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { Alert.alert("Missing Email", "Please enter your work email address."); return; }
    haptic();
    try {
      await forgotPasswordMutation.mutateAsync({ email: forgotEmail.toLowerCase().trim(), tenantId: 1 });
      setForgotSent(true);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not send reset email. Please try again.");
    }
  };

  const saveAndNavigate = async (user: AuthUser, sessionToken?: string) => {
    if (Platform.OS !== "web") {
      await SecureStore.setItemAsync("nvc360_user", JSON.stringify(user));
      await SecureStore.setItemAsync("nvc360_token", sessionToken ?? `mock_jwt_${user.id}_${Date.now()}`);
    }
    if (user.role === "nvc_super_admin" || user.role === "nvc_project_manager") {
      router.replace("/super-admin" as any);
    } else if (user.role === "field_technician") {
      router.replace("/agent-home" as any);
    } else {
      router.replace("/(tabs)" as any);
    }
  };

  const handleGoogleSignIn = async () => {
    haptic(); setLoadingProvider("google");
    try {
      await new Promise((r) => setTimeout(r, 900));
      await saveAndNavigate({ id: "u-google-001", name: "Google Demo User", email: "demo@gmail.com", role: "dispatcher", tenantId: 1, tenantName: "Acme HVAC Services", tenantColor: "#3B82F6", tenantLogo: null, avatarUrl: null, provider: "google" });
    } catch { Alert.alert("Error", "Google sign-in failed."); }
    finally { setLoadingProvider(null); }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== "ios") { Alert.alert("Apple Sign-In", "Apple Sign-In is only available on iOS."); return; }
    setLoadingProvider("apple");
    try {
      const credential = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
      await saveAndNavigate({ id: credential.user, name: credential.fullName?.givenName ? `${credential.fullName.givenName} ${credential.fullName.familyName ?? ""}`.trim() : "Apple User", email: credential.email ?? "apple@privaterelay.appleid.com", role: "dispatcher", tenantId: 1, tenantName: "Acme HVAC Services", tenantColor: "#3B82F6", tenantLogo: null, avatarUrl: null, provider: "apple" });
    } catch (e: any) { if (e.code !== "ERR_REQUEST_CANCELED") Alert.alert("Apple Sign-In Failed", "Please try again."); }
    finally { setLoadingProvider(null); }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) { Alert.alert("Missing Fields", "Please enter your email and password."); return; }
    haptic(); setLoading(true);
    try {
      // Step 1: Authenticate with server — returns a signed JWT token
      const result = await emailLoginMutation.mutateAsync({ email: email.toLowerCase().trim(), password });

      // Step 2 (web only): Call /api/auth/session DIRECTLY on the 3000-xxx domain
      // so the cookie is scoped to .manus.computer (not 127.0.0.1 via Metro proxy)
      if (Platform.OS === "web" && result.token) {
        await persistSessionCookie(result.token);
      }

      // Step 3: Look up role for routing
      const user = MOCK_USERS[email.toLowerCase().trim()];
      if (!user) { Alert.alert("Login Failed", "Invalid credentials.\n\nHint: Use password 'demo123' with any demo account."); return; }
      await saveAndNavigate(user, result.token);
    } catch (err: any) {
      const msg = err?.message ?? "Login failed. Please try again.";
      Alert.alert("Login Failed", msg);
    } finally { setLoading(false); }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    haptic(); setLoading(true);
    try {
      const result = await emailLoginMutation.mutateAsync({ email: demoEmail, password: "demo123" });
      if (Platform.OS === "web" && result.token) {
        await persistSessionCookie(result.token);
      }
      const user = MOCK_USERS[demoEmail];
      if (user) await saveAndNavigate(user, result.token);
    } catch (err: any) {
      Alert.alert("Login Failed", err?.message ?? "Could not log in with demo account.");
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

              <Pressable style={styles.forgotBtn} onPress={() => { haptic(); setForgotEmail(email); setForgotSent(false); setShowForgot(true); }}>
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

      {/* ── Forgot Password Modal ── */}
      <Modal visible={showForgot} transparent animationType="fade" onRequestClose={() => setShowForgot(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowForgot(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {forgotSent ? (
              <View style={styles.modalSentWrap}>
                <View style={styles.modalSentIcon}>
                  <IconSymbol name="checkmark.circle.fill" size={40} color="#22C55E" />
                </View>
                <Text style={styles.modalTitle}>Check your inbox</Text>
                <Text style={styles.modalBody}>
                  If an account exists for <Text style={{ fontWeight: "700" }}>{forgotEmail}</Text>, a password reset link has been sent.
                </Text>
                <Pressable style={styles.modalDoneBtn} onPress={() => setShowForgot(false)}>
                  <Text style={styles.modalDoneBtnText}>Done</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalBody}>Enter your work email and we'll send you a reset link.</Text>
                <View style={[styles.inputWrapper, { marginTop: 16, marginBottom: 12 }]}>
                  <IconSymbol name="envelope.fill" size={16} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    placeholder="Work email address"
                    placeholderTextColor="#9CA3AF"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleForgotPassword}
                  />
                </View>
                <Pressable
                  style={({ pressed }) => [styles.loginBtn, (pressed || forgotPasswordMutation.isPending) && { opacity: 0.85 }] as ViewStyle[]}
                  onPress={handleForgotPassword}
                  disabled={forgotPasswordMutation.isPending}
                >
                  {forgotPasswordMutation.isPending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.loginBtnText}>Send Reset Link</Text>
                  }
                </Pressable>
                <Pressable style={[styles.forgotBtn, { alignSelf: "center", marginTop: 12 }]} onPress={() => setShowForgot(false)}>
                  <Text style={[styles.forgotText, { color: "#9CA3AF" }]}>Cancel</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

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
  modalOverlay: ViewStyle; modalCard: ViewStyle; modalTitle: TextStyle;
  modalBody: TextStyle; modalSentWrap: ViewStyle; modalSentIcon: ViewStyle;
  modalDoneBtn: ViewStyle; modalDoneBtnText: TextStyle;
}>({
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 32, paddingBottom: 40 },
  brandSection: { alignItems: "center", marginBottom: 28 },
  logoWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  logoImg: { width: 52, height: 52 },
  brandTitle: { fontSize: 26, fontWeight: "800", color: "#111827", letterSpacing: -0.5 },
  brandSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 3 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4, marginBottom: 16 },
  socialSection: { gap: 10, marginBottom: 20 },
  socialBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 48, borderRadius: 12, gap: 10 },
  googleBtn: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB" },
  googleIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  googleIconText: { fontSize: 12, fontWeight: "700", color: "#4285F4" },
  googleBtnText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  appleBtn: { height: 48, borderRadius: 12 },
  appleWebBtn: { backgroundColor: "#111827" },
  appleBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dividerText: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },
  form: { gap: 12 },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 14, height: 50, gap: 10 },
  input: { flex: 1, fontSize: 15, color: "#111827" },
  forgotBtn: { alignSelf: "flex-end", paddingVertical: 2 },
  forgotText: { fontSize: 13, color: NVC_BLUE, fontWeight: "500" },
  loginBtn: { backgroundColor: NVC_BLUE, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 4 },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  demoToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  demoToggleText: { fontSize: 13, color: "#9CA3AF", fontWeight: "500" },
  demoSection: { gap: 8, marginBottom: 16 },
  demoSectionTitle: { fontSize: 11, color: "#9CA3AF", fontWeight: "600", letterSpacing: 0.5, textAlign: "center", marginBottom: 4 },
  demoChip: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  demoChipDot: { width: 8, height: 8, borderRadius: 4 },
  demoChipInfo: { flex: 1 },
  demoChipRole: { fontSize: 12, fontWeight: "700" },
  demoChipEmail: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  footer: { alignItems: "center", gap: 6, marginTop: 8 },
  footerText: { fontSize: 12, color: "#9CA3AF", textAlign: "center", lineHeight: 18 },
  footerLink: { color: NVC_BLUE, fontWeight: "500" },
  footerVersion: { fontSize: 11, color: "#C4C9D4" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 6 },
  modalBody: { fontSize: 14, color: "#6B7280", lineHeight: 20 },
  modalSentWrap: { alignItems: "center", gap: 12 },
  modalSentIcon: { marginBottom: 4 },
  modalDoneBtn: { backgroundColor: "#22C55E", height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 16, width: "100%" },
  modalDoneBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
