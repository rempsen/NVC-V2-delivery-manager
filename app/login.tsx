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
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

WebBrowser.maybeCompleteAuthSession();

// ─── Role Definitions ─────────────────────────────────────────────────────────

export type UserRole =
  | "nvc_super_admin"
  | "nvc_project_manager"
  | "nvc_support"
  | "company_admin"
  | "divisional_manager"
  | "dispatcher"
  | "field_technician"
  | "office_staff";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  tenantName: string | null;
  tenantColor: string | null;
  tenantLogo: string | null;
  avatarUrl: string | null;
  provider: "email" | "google" | "apple";
}

// ─── Mock Users for Demo ──────────────────────────────────────────────────────

const MOCK_USERS: Record<string, AuthUser> = {
  "admin@nvc360.com": {
    id: "u-nvc-001",
    name: "Dan Rosenblat",
    email: "admin@nvc360.com",
    role: "nvc_super_admin",
    tenantId: null,
    tenantName: "NVC360",
    tenantColor: "#E85D04",
    tenantLogo: null,
    avatarUrl: null,
    provider: "email",
  },
  "pm@nvc360.com": {
    id: "u-nvc-002",
    name: "Sarah Mitchell",
    email: "pm@nvc360.com",
    role: "nvc_project_manager",
    tenantId: null,
    tenantName: "NVC360",
    tenantColor: "#E85D04",
    tenantLogo: null,
    avatarUrl: null,
    provider: "email",
  },
  "dispatch@acmehvac.com": {
    id: "u-t1-001",
    name: "James Chen",
    email: "dispatch@acmehvac.com",
    role: "dispatcher",
    tenantId: "t-001",
    tenantName: "Acme HVAC Services",
    tenantColor: "#3B82F6",
    tenantLogo: null,
    avatarUrl: null,
    provider: "email",
  },
  "tech@acmehvac.com": {
    id: "u-t1-002",
    name: "Mike Torres",
    email: "tech@acmehvac.com",
    role: "field_technician",
    tenantId: "t-001",
    tenantName: "Acme HVAC Services",
    tenantColor: "#3B82F6",
    tenantLogo: null,
    avatarUrl: null,
    provider: "email",
  },
};

// ─── Google OAuth Discovery ───────────────────────────────────────────────────

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

// ─── Role Badge ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, string> = {
  nvc_super_admin: "NVC360 Super Admin",
  nvc_project_manager: "NVC360 Project Manager",
  nvc_support: "NVC360 Support",
  company_admin: "Company Admin",
  divisional_manager: "Divisional Manager",
  dispatcher: "Dispatcher",
  field_technician: "Field Technician",
  office_staff: "Office Staff",
};

const ROLE_COLORS: Record<UserRole, string> = {
  nvc_super_admin: "#E85D04",
  nvc_project_manager: "#8B5CF6",
  nvc_support: "#3B82F6",
  company_admin: "#22C55E",
  divisional_manager: "#06B6D4",
  dispatcher: "#F59E0B",
  field_technician: "#6366F1",
  office_staff: "#6B7280",
};

// ─── Demo Account Chip ────────────────────────────────────────────────────────

function DemoChip({
  email,
  role,
  onPress,
}: {
  email: string;
  role: UserRole;
  onPress: () => void;
}) {
  const colors = useColors();
  const roleColor = ROLE_COLORS[role];
  return (
    <Pressable
      style={({ pressed }) => [
        styles.demoChip,
        { backgroundColor: roleColor + "15", borderColor: roleColor + "40", opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.demoChipDot, { backgroundColor: roleColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.demoChipRole, { color: roleColor }]}>{ROLE_LABELS[role]}</Text>
        <Text style={[styles.demoChipEmail, { color: colors.muted }]}>{email}</Text>
      </View>
      <IconSymbol name="arrow.right.circle.fill" size={16} color={roleColor} />
    </Pressable>
  );
}

// ─── Main Login Screen ────────────────────────────────────────────────────────

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  // ── Google OAuth ──────────────────────────────────────────────────────────

  const redirectUri = AuthSession.makeRedirectUri({ scheme: "nvc360" });

  const [googleRequest, googleResponse, promptGoogleAsync] = AuthSession.useAuthRequest(
    {
      clientId: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
      redirectUri,
      scopes: ["openid", "profile", "email"],
      responseType: AuthSession.ResponseType.Token,
    },
    GOOGLE_DISCOVERY,
  );

  React.useEffect(() => {
    if (googleResponse?.type === "success") {
      const { access_token } = googleResponse.params;
      handleGoogleToken(access_token);
    } else if (googleResponse?.type === "error") {
      Alert.alert("Google Sign-In Failed", "Please try again or use email login.");
      setLoadingProvider(null);
    }
  }, [googleResponse]);

  const handleGoogleToken = async (token: string) => {
    try {
      // In production: exchange token with your backend to verify and create session
      // For demo: simulate a successful Google login
      const mockUser: AuthUser = {
        id: "u-google-001",
        name: "Google User",
        email: "user@gmail.com",
        role: "dispatcher",
        tenantId: "t-001",
        tenantName: "Acme HVAC Services",
        tenantColor: "#3B82F6",
        tenantLogo: null,
        avatarUrl: null,
        provider: "google",
      };
      await saveAndNavigate(mockUser);
    } catch {
      Alert.alert("Error", "Failed to complete Google sign-in.");
    } finally {
      setLoadingProvider(null);
    }
  };

  // ── Apple Sign-In ─────────────────────────────────────────────────────────

  const handleAppleSignIn = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert("Apple Sign-In", "Apple Sign-In is only available on iOS devices.");
      return;
    }
    setLoadingProvider("apple");
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      // In production: send credential.identityToken to your backend
      const mockUser: AuthUser = {
        id: credential.user,
        name:
          credential.fullName?.givenName
            ? `${credential.fullName.givenName} ${credential.fullName.familyName ?? ""}`.trim()
            : "Apple User",
        email: credential.email ?? "apple_user@privaterelay.appleid.com",
        role: "dispatcher",
        tenantId: "t-001",
        tenantName: "Acme HVAC Services",
        tenantColor: "#3B82F6",
        tenantLogo: null,
        avatarUrl: null,
        provider: "apple",
      };
      await saveAndNavigate(mockUser);
    } catch (e: any) {
      if (e.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Apple Sign-In Failed", "Please try again or use email login.");
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  // ── Email Login ───────────────────────────────────────────────────────────

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 800));
      const user = MOCK_USERS[email.toLowerCase().trim()];
      if (!user || password !== "demo123") {
        Alert.alert("Login Failed", "Invalid email or password.\n\nHint: Use password 'demo123' with any demo account.");
        return;
      }
      await saveAndNavigate(user);
    } finally {
      setLoading(false);
    }
  };

  // ── Demo Quick Login ──────────────────────────────────────────────────────

  const handleDemoLogin = async (demoEmail: string) => {
    setLoading(true);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const user = MOCK_USERS[demoEmail];
      if (user) await saveAndNavigate(user);
    } finally {
      setLoading(false);
    }
  };

  // ── Save & Navigate ───────────────────────────────────────────────────────

  const saveAndNavigate = async (user: AuthUser) => {
    if (Platform.OS !== "web") {
      await SecureStore.setItemAsync("nvc360_user", JSON.stringify(user));
      await SecureStore.setItemAsync("nvc360_token", `mock_jwt_${user.id}_${Date.now()}`);
    }
    // Role-based routing
    if (user.role === "nvc_super_admin" || user.role === "nvc_project_manager") {
      router.replace("/super-admin" as any);
    } else if (user.role === "dispatcher" || user.role === "company_admin" || user.role === "divisional_manager") {
      router.replace("/(tabs)" as any);
    } else {
      router.replace("/(tabs)" as any);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Logo & Brand ── */}
          <View style={styles.brandSection}>
            <View style={[styles.logoCircle, { borderColor: colors.border }]}>
              <Text style={[styles.logoText, { color: colors.foreground }]}>NVC</Text>
            </View>
            <Text style={[styles.brandTitle, { color: colors.foreground }]}>NVC360</Text>
            <Text style={[styles.brandSubtitle, { color: colors.muted }]}>
              Field Service Management Platform
            </Text>
          </View>

          {/* ── Social Auth Buttons ── */}
          <View style={styles.socialSection}>
            {/* Google */}
            <Pressable
              style={({ pressed }) => [
                styles.socialBtn,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={async () => {
                setLoadingProvider("google");
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // In production, this would use the real Google OAuth flow
                // For demo, simulate success
                await new Promise((r) => setTimeout(r, 800));
                const mockUser: AuthUser = {
                  id: "u-google-demo",
                  name: "Google Demo User",
                  email: "demo@gmail.com",
                  role: "dispatcher",
                  tenantId: "t-001",
                  tenantName: "Acme HVAC Services",
                  tenantColor: "#3B82F6",
                  tenantLogo: null,
                  avatarUrl: null,
                  provider: "google",
                };
                await saveAndNavigate(mockUser);
                setLoadingProvider(null);
              }}
              disabled={loadingProvider !== null || loading}
            >
              {loadingProvider === "google" ? (
                <ActivityIndicator size="small" color={colors.foreground} />
              ) : (
                <>
                  <View style={styles.googleIcon}>
                    <Text style={styles.googleIconText}>G</Text>
                  </View>
                  <Text style={[styles.socialBtnText, { color: colors.foreground }]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </Pressable>

            {/* Apple — iOS only */}
            {Platform.OS === "ios" && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={12}
                style={styles.appleBtn}
                onPress={handleAppleSignIn}
              />
            )}

            {/* Apple — non-iOS fallback */}
            {Platform.OS !== "ios" && (
              <Pressable
                style={({ pressed }) => [
                  styles.socialBtn,
                  { backgroundColor: "#000", borderColor: "#000", opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={handleAppleSignIn}
                disabled={loadingProvider !== null || loading}
              >
                {loadingProvider === "apple" ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <IconSymbol name="apple.logo" size={18} color="#fff" />
                    <Text style={[styles.socialBtnText, { color: "#fff" }]}>
                      Continue with Apple
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>

          {/* ── Divider ── */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.muted }]}>or sign in with email</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* ── Email / Password Form ── */}
          <View style={styles.form}>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="envelope.fill" size={16} color={colors.muted} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Work email address"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="lock.fill" size={16} color={colors.muted} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Password"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleEmailLogin}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={{ padding: 4 }}>
                <IconSymbol
                  name={showPassword ? "eye.slash.fill" : "eye.fill"}
                  size={16}
                  color={colors.muted}
                />
              </Pressable>
            </View>

            <Pressable style={styles.forgotBtn} onPress={() => Alert.alert("Reset Password", "A password reset link will be sent to your email.")}>
              <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.loginBtn,
                { backgroundColor: colors.primary, opacity: pressed || loading ? 0.85 : 1 },
              ]}
              onPress={handleEmailLogin}
              disabled={loading || loadingProvider !== null}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Sign In</Text>
              )}
            </Pressable>
          </View>

          {/* ── Demo Accounts ── */}
          <Pressable
            style={({ pressed }) => [
              styles.demoToggle,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => setShowDemoAccounts((v) => !v)}
          >
            <IconSymbol name="person.2.fill" size={14} color={colors.muted} />
            <Text style={[styles.demoToggleText, { color: colors.muted }]}>
              {showDemoAccounts ? "Hide" : "Show"} demo accounts
            </Text>
            <IconSymbol
              name={showDemoAccounts ? "chevron.up" : "chevron.down"}
              size={12}
              color={colors.muted}
            />
          </Pressable>

          {showDemoAccounts && (
            <View style={styles.demoSection}>
              <Text style={[styles.demoSectionTitle, { color: colors.muted }]}>
                TAP TO LOGIN AS — password: demo123
              </Text>
              {Object.entries(MOCK_USERS).map(([demoEmail, user]) => (
                <DemoChip
                  key={demoEmail}
                  email={demoEmail}
                  role={user.role}
                  onPress={() => handleDemoLogin(demoEmail)}
                />
              ))}
            </View>
          )}

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.muted }]}>
              By signing in, you agree to NVC360's{" "}
              <Text style={{ color: colors.primary }}>Terms of Service</Text>
              {" "}and{" "}
              <Text style={{ color: colors.primary }}>Privacy Policy</Text>
            </Text>
            <Text style={[styles.footerVersion, { color: colors.muted }]}>
              NVC360 2.0 · nvc360.com
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  brandSection: { alignItems: "center", paddingTop: 24, paddingBottom: 32, gap: 8 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  logoText: { fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  brandTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  brandSubtitle: { fontSize: 14, textAlign: "center" },
  socialSection: { gap: 12, marginBottom: 8 },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 10,
  },
  googleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconText: { fontSize: 13, fontWeight: "800", color: "#4285F4" },
  socialBtnText: { fontSize: 15, fontWeight: "600" },
  appleBtn: { width: "100%", height: 52 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: "500" },
  form: { gap: 12 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15 },
  forgotBtn: { alignSelf: "flex-end" },
  forgotText: { fontSize: 13, fontWeight: "600" },
  loginBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  loginBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  demoToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  demoToggleText: { fontSize: 13, fontWeight: "500" },
  demoSection: { gap: 8, marginTop: 12 },
  demoSectionTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textAlign: "center" },
  demoChip: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  demoChipDot: { width: 8, height: 8, borderRadius: 4 },
  demoChipRole: { fontSize: 12, fontWeight: "700" },
  demoChipEmail: { fontSize: 11, marginTop: 1 },
  footer: { alignItems: "center", gap: 6, marginTop: 28 },
  footerText: { fontSize: 11, textAlign: "center", lineHeight: 16 },
  footerVersion: { fontSize: 11 },
});
