import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet,
  Alert, Platform, ActivityIndicator, KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE } from "@/constants/brand";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/hooks/use-tenant";

function SettingsField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  hint,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  secureTextEntry?: boolean;
  hint?: string;
  editable?: boolean;
}) {
  const colors = useColors();
  const [showPass, setShowPass] = useState(false);
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <View style={[
        styles.inputWrap,
        { backgroundColor: editable ? colors.background : colors.surface, borderColor: colors.border },
      ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted + "60"}
          keyboardType={keyboardType ?? "default"}
          secureTextEntry={secureTextEntry && !showPass}
          autoCapitalize={secureTextEntry ? "none" : "words"}
          autoCorrect={false}
          editable={editable}
          style={[styles.input, { color: editable ? colors.foreground : colors.muted }]}
          returnKeyType="next"
        />
        {secureTextEntry && (
          <Pressable onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
            <IconSymbol name={showPass ? "eye.slash.fill" : "eye.fill"} size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {hint && <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text>}
    </View>
  );
}

export default function EditProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { userId: tenantUserId, loading: tenantLoading } = useTenant();

  const profileQuery = trpc.users.getProfile.useQuery(
    { tenantUserId: tenantUserId! },
    { enabled: !!tenantUserId },
  );
  const updateProfileMutation = trpc.users.updateProfile.useMutation();
  const changePasswordMutation = trpc.users.changePassword.useMutation();

  const [saving, setSaving] = useState(false);

  // Profile fields — pre-populated from server
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Hydrate form when profile loads
  useEffect(() => {
    if (profileQuery.data) {
      setName(profileQuery.data.name ?? "");
      setPhone(profileQuery.data.phone ?? "");
    }
  }, [profileQuery.data]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Name is required.");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      Alert.alert("Password Mismatch", "New password and confirmation do not match.");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters.");
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      // Update profile fields
      await updateProfileMutation.mutateAsync({
        tenantUserId: tenantUserId!,
        name: name.trim(),
        phone: phone.trim() || undefined,
      });

      // Change password if requested
      if (newPassword && currentPassword) {
        await changePasswordMutation.mutateAsync({
          tenantUserId: tenantUserId!,
          currentPassword,
          newPassword,
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Your profile has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", err?.message ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const profile = profileQuery.data;
  const profileLoading = tenantLoading || profileQuery.isLoading;

  // Derive initials for avatar
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (profileLoading) {
    return (
      <ScreenContainer edges={["left", "right"]}>
        <NVCHeader title="Edit Profile" showBack />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={NVC_BLUE} />
          <Text style={{ color: colors.muted, marginTop: 12, fontSize: 14 }}>Loading profile...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["left", "right"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <NVCHeader title="Edit Profile" showBack />
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { backgroundColor: NVC_BLUE }]}>
              <Text style={styles.avatarInitial}>{initials || "?"}</Text>
            </View>
          </View>

          {/* Personal Info */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Personal Information</Text>
            <SettingsField
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
            />
            <SettingsField
              label="Email Address"
              value={profile?.email ?? ""}
              onChangeText={() => {}}
              placeholder="you@company.com"
              keyboardType="email-address"
              editable={false}
              hint="Email cannot be changed here. Contact your admin."
            />
            <SettingsField
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (204) 555-0000"
              keyboardType="phone-pad"
            />
          </View>

          {/* Role (read-only) */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Role</Text>
            <SettingsField
              label="Role"
              value={profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : ""}
              onChangeText={() => {}}
              editable={false}
              hint="Role is managed by your administrator."
            />
          </View>

          {/* Password */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Change Password</Text>
            <Text style={[styles.cardSub, { color: colors.muted }]}>Leave blank to keep your current password.</Text>
            <SettingsField
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="••••••••"
              secureTextEntry
            />
            <SettingsField
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="••••••••"
              secureTextEntry
              hint="Minimum 8 characters"
            />
            <SettingsField
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              secureTextEntry
            />
          </View>

          {/* Save */}
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: NVC_BLUE },
              pressed && { opacity: 0.85 },
              saving && { opacity: 0.6 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Profile</Text>
              </>
            )}
          </Pressable>
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNavBar />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16 },
  avatarSection: { alignItems: "center", gap: 12, paddingVertical: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
  },
  avatarInitial: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  cardSub: { fontSize: 12, lineHeight: 16, marginBottom: 4 },
  fieldGroup: { gap: 5, marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 48,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 10 },
  eyeBtn: { padding: 6 },
  hint: { fontSize: 11, lineHeight: 15 },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 16, marginTop: 4,
  },
  saveBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
});
