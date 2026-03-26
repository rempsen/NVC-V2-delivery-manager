import React, { useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "nvc360_user_profile";

const ROLES = ["NVC360 Admin", "Dispatcher", "Technician", "Manager", "Office Staff"];

function SettingsField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  secureTextEntry?: boolean;
  hint?: string;
}) {
  const colors = useColors();
  const [showPass, setShowPass] = useState(false);
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted + "60"}
          keyboardType={keyboardType ?? "default"}
          secureTextEntry={secureTextEntry && !showPass}
          autoCapitalize={secureTextEntry ? "none" : "words"}
          autoCorrect={false}
          style={[styles.input, { color: colors.foreground }]}
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
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("Dan");
  const [lastName, setLastName] = useState("Rosenblat");
  const [email, setEmail] = useState("dan@nvc360.com");
  const [phone, setPhone] = useState("+1 (204) 555-0100");
  const [role, setRole] = useState("NVC360 Admin");
  const [title, setTitle] = useState("Dispatcher");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Required", "First and last name are required.");
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
      const profile = { firstName, lastName, email, phone, role, title };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Your profile has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

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
              <Text style={styles.avatarInitial}>
                {(firstName[0] ?? "") + (lastName[0] ?? "")}
              </Text>
            </View>
            <Pressable
              onPress={() => Alert.alert("Change Photo", "Photo upload will be available in the production build.")}
              style={[styles.changePhotoBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <IconSymbol name="camera.fill" size={14} color={NVC_BLUE} />
              <Text style={[styles.changePhotoText, { color: NVC_BLUE }]}>Change Photo</Text>
            </Pressable>
          </View>

          {/* Personal Info */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Personal Information</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <SettingsField label="First Name" value={firstName} onChangeText={setFirstName} placeholder="First" />
              </View>
              <View style={{ flex: 1 }}>
                <SettingsField label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Last" />
              </View>
            </View>
            <SettingsField label="Email Address" value={email} onChangeText={setEmail} placeholder="you@company.com" keyboardType="email-address" />
            <SettingsField label="Phone Number" value={phone} onChangeText={setPhone} placeholder="+1 (204) 555-0000" keyboardType="phone-pad" />
          </View>

          {/* Role */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Role & Title</Text>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>ROLE</Text>
              <View style={styles.roleChips}>
                {ROLES.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setRole(r)}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: role === r ? NVC_BLUE : colors.background,
                        borderColor: role === r ? NVC_BLUE : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.roleChipText, { color: role === r ? "#fff" : colors.foreground }]}>
                      {r}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <SettingsField label="Job Title" value={title} onChangeText={setTitle} placeholder="e.g. Dispatcher, Manager" />
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
  avatarInitial: { fontSize: 28, fontWeight: "800", color: "#fff" },
  changePhotoBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  changePhotoText: { fontSize: 13, fontWeight: "600" },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  cardSub: { fontSize: 12, lineHeight: 16, marginBottom: 4 },
  fieldGroup: { gap: 5, marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 48,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 10 },
  eyeBtn: { padding: 6 },
  hint: { fontSize: 11, lineHeight: 15 },
  row: { flexDirection: "row", gap: 10 },
  roleChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  roleChipText: { fontSize: 12, fontWeight: "600" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 16, marginTop: 4,
  },
  saveBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
});
