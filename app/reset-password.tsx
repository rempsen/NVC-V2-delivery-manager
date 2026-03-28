/**
 * Reset Password Screen
 *
 * Reached via the link in the "Forgot Password" email:
 *   https://tookandeliv-ve29h94a.manus.space/reset-password?token=<hex>
 *
 * On web (Expo Router), query params are available via useLocalSearchParams().
 */
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

export default function ResetPasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const resetMutation = trpc.auth.resetPassword.useMutation();

  const handleReset = async () => {
    if (!token) {
      Alert.alert("Invalid Link", "This reset link is missing a token. Please request a new one.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Password Too Short", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords Don't Match", "Please make sure both passwords are identical.");
      return;
    }
    try {
      await resetMutation.mutateAsync({ token, newPassword: password });
      setDone(true);
    } catch (err: any) {
      Alert.alert("Reset Failed", err?.message ?? "This link may have expired. Please request a new one.");
    }
  };

  const s = styles(colors);

  if (done) {
    return (
      <View style={s.container}>
        <View style={s.card}>
          <Text style={s.successIcon}>✅</Text>
          <Text style={s.title}>Password Updated</Text>
          <Text style={s.body}>
            Your password has been reset successfully. You can now log in with your new password.
          </Text>
          <Pressable style={s.btn} onPress={() => router.replace("/login")}>
            <Text style={s.btnText}>Go to Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={s.card}>
        {/* NVC360 Logo / Header */}
        <View style={s.logoRow}>
          <View style={s.logoCircle}>
            <Text style={s.logoText}>NVC</Text>
          </View>
          <Text style={s.logoLabel}>NVC360 2.0</Text>
        </View>

        <Text style={s.title}>Set New Password</Text>
        <Text style={s.body}>
          Enter a new password for your account. It must be at least 6 characters.
        </Text>

        <Text style={s.label}>NEW PASSWORD</Text>
        <TextInput
          style={s.input}
          placeholder="Enter new password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="next"
          autoFocus
        />

        <Text style={s.label}>CONFIRM PASSWORD</Text>
        <TextInput
          style={s.input}
          placeholder="Confirm new password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          returnKeyType="done"
          onSubmitEditing={handleReset}
        />

        <Pressable
          style={[s.btn, resetMutation.isPending && s.btnDisabled]}
          onPress={handleReset}
          disabled={resetMutation.isPending}
        >
          {resetMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.btnText}>Reset Password</Text>
          )}
        </Pressable>

        <Pressable style={s.backLink} onPress={() => router.replace("/login")}>
          <Text style={s.backLinkText}>← Back to Login</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    card: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 32,
      borderWidth: 1,
      borderColor: colors.border,
    },
    logoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
      gap: 10,
    },
    logoCircle: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: "#0052CC",
      alignItems: "center",
      justifyContent: "center",
    },
    logoText: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    logoLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.foreground,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.foreground,
      marginBottom: 8,
    },
    body: {
      fontSize: 14,
      color: colors.muted,
      lineHeight: 20,
      marginBottom: 24,
    },
    label: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.muted,
      letterSpacing: 0.8,
      marginBottom: 6,
      marginTop: 12,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.foreground,
    },
    btn: {
      backgroundColor: "#0052CC",
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 24,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    btnText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },
    backLink: {
      marginTop: 16,
      alignItems: "center",
    },
    backLinkText: {
      fontSize: 14,
      color: colors.muted,
    },
    successIcon: {
      fontSize: 40,
      textAlign: "center",
      marginBottom: 16,
    },
  });
