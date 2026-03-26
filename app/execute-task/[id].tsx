import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { MOCK_TASKS } from "@/lib/nvc-types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  checked: boolean;
}

interface FieldNote {
  id: string;
  text: string;
  timestamp: Date;
  flagged: boolean;
}

interface PhotoAttachment {
  id: string;
  uri: string;
  caption: string;
  timestamp: Date;
}

interface VoiceNote {
  id: string;
  duration: number;
  timestamp: Date;
}

// ─── Mock Checklist (from template) ──────────────────────────────────────────

const MOCK_CHECKLIST: ChecklistItem[] = [
  { id: "c1", label: "Verify customer identity and address", required: true, checked: false },
  { id: "c2", label: "Inspect site conditions before starting", required: true, checked: false },
  { id: "c3", label: "Take before photos", required: true, checked: false },
  { id: "c4", label: "Complete all work as specified in order", required: true, checked: false },
  { id: "c5", label: "Test and verify work quality", required: true, checked: false },
  { id: "c6", label: "Take after photos", required: true, checked: false },
  { id: "c7", label: "Review work with customer", required: false, checked: false },
  { id: "c8", label: "Collect payment or authorization", required: false, checked: false },
  { id: "c9", label: "Obtain customer signature", required: true, checked: false },
  { id: "c10", label: "Clean up work area", required: false, checked: false },
];

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, icon, color }: { title: string; icon: any; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconBg, { backgroundColor: color + "20" }]}>
        <IconSymbol name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
    </View>
  );
}

// ─── Checklist Item ───────────────────────────────────────────────────────────

function CheckItem({
  item,
  onToggle,
}: {
  item: ChecklistItem;
  onToggle: (id: string) => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.checkRow,
        { borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle(item.id);
      }}
    >
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: item.checked ? "#22C55E" : "transparent",
            borderColor: item.checked ? "#22C55E" : colors.border,
          },
        ]}
      >
        {item.checked && <IconSymbol name="checkmark" size={12} color="#fff" />}
      </View>
      <Text
        style={[
          styles.checkLabel,
          {
            color: item.checked ? colors.muted : colors.foreground,
            textDecorationLine: item.checked ? "line-through" : "none",
          },
        ]}
      >
        {item.label}
      </Text>
      {item.required && !item.checked && (
        <View style={[styles.requiredBadge, { backgroundColor: "#EF444420" }]}>
          <Text style={styles.requiredText}>Required</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Photo Placeholder ────────────────────────────────────────────────────────

function PhotoGrid({
  photos,
  onAdd,
}: {
  photos: PhotoAttachment[];
  onAdd: (source: "camera" | "gallery") => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.photoGrid}>
      {photos.map((p) => (
        <View
          key={p.id}
          style={[styles.photoThumb, { backgroundColor: colors.border }]}
        >
          <IconSymbol name="photo.fill" size={20} color={colors.muted} />
          <Text style={[styles.photoCaption, { color: colors.muted }]} numberOfLines={1}>
            {p.caption || "Photo"}
          </Text>
        </View>
      ))}
      <Pressable
        style={({ pressed }) => [
          styles.photoAddBtn,
          { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={() =>
          Alert.alert("Add Photo", "Choose source", [
            { text: "Camera", onPress: () => onAdd("camera") },
            { text: "Gallery", onPress: () => onAdd("gallery") },
            { text: "Cancel", style: "cancel" },
          ])
        }
      >
        <IconSymbol name="camera.fill" size={22} color={colors.primary} />
        <Text style={[styles.photoAddText, { color: colors.primary }]}>Add Photo</Text>
      </Pressable>
    </View>
  );
}

// ─── Signature Pad (Simulated) ────────────────────────────────────────────────

function SignaturePad({
  signed,
  onSign,
  onClear,
}: {
  signed: boolean;
  onSign: () => void;
  onClear: () => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.sigPad, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {signed ? (
        <View style={styles.sigSigned}>
          <IconSymbol name="checkmark.seal.fill" size={28} color="#22C55E" />
          <Text style={[styles.sigSignedText, { color: "#22C55E" }]}>Signature Captured</Text>
          <Text style={[styles.sigLockedText, { color: colors.muted }]}>
            Locked to record · {new Date().toLocaleTimeString()}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.sigClearBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={onClear}
          >
            <Text style={[styles.sigClearText, { color: colors.error }]}>Clear Signature</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.sigEmpty, { opacity: pressed ? 0.75 : 1 }]}
          onPress={onSign}
        >
          <IconSymbol name="pencil" size={24} color={colors.muted} />
          <Text style={[styles.sigEmptyText, { color: colors.muted }]}>
            Tap to capture customer signature
          </Text>
          <Text style={[styles.sigEmptyNote, { color: colors.border }]}>
            Signature is cryptographically locked to this work order
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Payment Section ──────────────────────────────────────────────────────────

function PaymentSection({
  amount,
  onAmountChange,
  method,
  onMethodChange,
  authorized,
  onAuthorize,
}: {
  amount: string;
  onAmountChange: (v: string) => void;
  method: string;
  onMethodChange: (v: string) => void;
  authorized: boolean;
  onAuthorize: () => void;
}) {
  const colors = useColors();
  const METHODS = ["Cash", "Credit Card", "E-Transfer", "Invoice", "Waived"];
  return (
    <View style={styles.paymentSection}>
      <View style={styles.paymentRow}>
        <Text style={[styles.paymentLabel, { color: colors.muted }]}>Amount ($)</Text>
        <TextInput
          style={[
            styles.paymentInput,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          value={amount}
          onChangeText={onAmountChange}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
        />
      </View>
      <Text style={[styles.paymentLabel, { color: colors.muted, marginBottom: 6 }]}>
        Payment Method
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodScroll}>
        {METHODS.map((m) => (
          <Pressable
            key={m}
            style={[
              styles.methodChip,
              {
                backgroundColor: method === m ? colors.primary + "20" : colors.surface,
                borderColor: method === m ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onMethodChange(m)}
          >
            <Text style={[styles.methodText, { color: method === m ? colors.primary : colors.muted }]}>
              {m}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {authorized ? (
        <View style={[styles.authorizedBanner, { backgroundColor: "#22C55E15", borderColor: "#22C55E40" }]}>
          <IconSymbol name="checkmark.circle.fill" size={18} color="#22C55E" />
          <Text style={[styles.authorizedText, { color: "#22C55E" }]}>
            Payment Authorized · ${amount} via {method}
          </Text>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.authorizeBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={onAuthorize}
        >
          <IconSymbol name="creditcard.fill" size={16} color="#fff" />
          <Text style={styles.authorizeBtnText}>Authorize Payment</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ExecuteTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();

  const task = MOCK_TASKS.find((t) => t.id === Number(id));

  const [checklist, setChecklist] = useState<ChecklistItem[]>(MOCK_CHECKLIST);
  const [photos, setPhotos] = useState<PhotoAttachment[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [fieldNotes, setFieldNotes] = useState<FieldNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [flagNote, setFlagNote] = useState(false);
  const [signed, setSigned] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(task?.totalCents ? String(task.totalCents / 100) : "");
  const [paymentMethod, setPaymentMethod] = useState("Credit Card");
  const [paymentAuthorized, setPaymentAuthorized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const mandatoryItems = checklist.filter((c) => c.required);
  const completedMandatory = mandatoryItems.filter((c) => c.checked).length;
  const allMandatoryDone = completedMandatory === mandatoryItems.length;
  const totalChecked = checklist.filter((c) => c.checked).length;
  const progress = totalChecked / checklist.length;

  const handleToggleCheck = (itemId: string) => {
    setChecklist((prev) =>
      prev.map((c) => (c.id === itemId ? { ...c, checked: !c.checked } : c)),
    );
  };

  const handleAddPhoto = (source: "camera" | "gallery") => {
    const newPhoto: PhotoAttachment = {
      id: Date.now().toString(),
      uri: `photo_${Date.now()}`,
      caption: source === "camera" ? "Live photo" : "Gallery photo",
      timestamp: new Date(),
    };
    setPhotos((prev) => [...prev, newPhoto]);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Photo Added", `${source === "camera" ? "Live" : "Gallery"} photo attached to work order.`);
  };

  const handleVoiceNote = () => {
    if (isRecording) {
      setIsRecording(false);
      const note: VoiceNote = {
        id: Date.now().toString(),
        duration: Math.floor(Math.random() * 60) + 5,
        timestamp: new Date(),
      };
      setVoiceNotes((prev) => [...prev, note]);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setIsRecording(true);
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    const note: FieldNote = {
      id: Date.now().toString(),
      text: noteText.trim(),
      timestamp: new Date(),
      flagged: flagNote,
    };
    setFieldNotes((prev) => [...prev, note]);
    setNoteText("");
    setFlagNote(false);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleComplete = () => {
    if (!allMandatoryDone) {
      Alert.alert(
        "Incomplete Checklist",
        `Please complete all ${mandatoryItems.length} required checklist items before finishing.`,
      );
      return;
    }
    if (!signed) {
      Alert.alert("Signature Required", "Please capture the customer signature before completing.");
      return;
    }
    Alert.alert(
      "Complete Work Order",
      "Mark this work order as completed? All data will be saved and locked.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: () => {
            if (Platform.OS !== "web")
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace("/(tabs)/tasks");
          },
        },
      ],
    );
  };

  if (!task) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={{ color: colors.muted }}>Work order not found.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["left", "right"]}>
      <NVCHeader
        title="Execute Work Order"
        subtitle={task.customerName}
        rightElement={
          <View style={[styles.progressCircle, { borderColor: allMandatoryDone ? "#22C55E" : "#fff" }]}>
            <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
          </View>
        }
      />

      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress * 100}%` as any,
              backgroundColor: allMandatoryDone ? "#22C55E" : colors.primary,
            },
          ]}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── CHECKLIST ── */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader title="Job Checklist" icon="checkmark.circle.fill" color="#22C55E" />
          <View style={styles.checklistMeta}>
            <Text style={[styles.checklistProgress, { color: colors.muted }]}>
              {totalChecked}/{checklist.length} items · {completedMandatory}/{mandatoryItems.length} required
            </Text>
          </View>
          {checklist.map((item) => (
            <CheckItem key={item.id} item={item} onToggle={handleToggleCheck} />
          ))}
        </View>

        {/* ── PHOTOS ── */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader title="Photos & Media" icon="camera.fill" color="#3B82F6" />
          <Text style={[styles.sectionNote, { color: colors.muted }]}>
            Attach before/after photos. Images are locked to this work order record.
          </Text>
          <PhotoGrid photos={photos} onAdd={handleAddPhoto} />
        </View>

        {/* ── VOICE NOTES ── */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader title="Voice Notes" icon="mic.fill" color="#8B5CF6" />
          <Text style={[styles.sectionNote, { color: colors.muted }]}>
            Record audio notes attached to this work order.
          </Text>
          {voiceNotes.map((vn) => (
            <View
              key={vn.id}
              style={[styles.voiceNoteRow, { backgroundColor: "#8B5CF615", borderColor: "#8B5CF640" }]}
            >
              <IconSymbol name="waveform" size={18} color="#8B5CF6" />
              <Text style={[styles.voiceNoteText, { color: colors.foreground }]}>
                Voice note · {vn.duration}s
              </Text>
              <Text style={[styles.voiceNoteTime, { color: colors.muted }]}>
                {vn.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
              <Pressable style={styles.voicePlayBtn}>
                <IconSymbol name="play.fill" size={14} color="#8B5CF6" />
              </Pressable>
            </View>
          ))}
          <Pressable
            style={({ pressed }) => [
              styles.voiceRecordBtn,
              {
                backgroundColor: isRecording ? "#EF444420" : "#8B5CF620",
                borderColor: isRecording ? "#EF4444" : "#8B5CF6",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={handleVoiceNote}
          >
            <IconSymbol
              name={isRecording ? "stop.circle.fill" : "mic.fill"}
              size={18}
              color={isRecording ? "#EF4444" : "#8B5CF6"}
            />
            <Text
              style={[
                styles.voiceRecordText,
                { color: isRecording ? "#EF4444" : "#8B5CF6" },
              ]}
            >
              {isRecording ? "Stop Recording" : "Record Voice Note"}
            </Text>
            {isRecording && (
              <View style={[styles.recordingDot, { backgroundColor: "#EF4444" }]} />
            )}
          </Pressable>
        </View>

        {/* ── FIELD NOTES ── */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader title="Field Notes" icon="doc.text.fill" color="#F59E0B" />
          <Text style={[styles.sectionNote, { color: colors.muted }]}>
            Notes flagged as important are highlighted for the dispatcher.
          </Text>
          {fieldNotes.map((fn) => (
            <View
              key={fn.id}
              style={[
                styles.fieldNoteRow,
                {
                  backgroundColor: fn.flagged ? "#EF444410" : colors.background,
                  borderColor: fn.flagged ? "#EF444440" : colors.border,
                  borderLeftColor: fn.flagged ? "#EF4444" : colors.border,
                  borderLeftWidth: fn.flagged ? 3 : 1,
                },
              ]}
            >
              {fn.flagged && (
                <IconSymbol name="exclamationmark.triangle.fill" size={14} color="#EF4444" />
              )}
              <View style={styles.fieldNoteContent}>
                <Text style={[styles.fieldNoteText, { color: colors.foreground }]}>{fn.text}</Text>
                <Text style={[styles.fieldNoteTime, { color: colors.muted }]}>
                  {fn.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {fn.flagged ? " · Flagged for dispatcher" : ""}
                </Text>
              </View>
            </View>
          ))}
          <TextInput
            style={[
              styles.noteInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="Add a field note..."
            placeholderTextColor={colors.muted}
            value={noteText}
            onChangeText={setNoteText}
            multiline
            numberOfLines={3}
            returnKeyType="done"
          />
          <View style={styles.noteActions}>
            <Pressable
              style={[
                styles.flagToggle,
                {
                  backgroundColor: flagNote ? "#EF444420" : colors.background,
                  borderColor: flagNote ? "#EF4444" : colors.border,
                },
              ]}
              onPress={() => setFlagNote((v) => !v)}
            >
              <IconSymbol
                name="exclamationmark.triangle.fill"
                size={14}
                color={flagNote ? "#EF4444" : colors.muted}
              />
              <Text style={[styles.flagToggleText, { color: flagNote ? "#EF4444" : colors.muted }]}>
                Flag for Dispatcher
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.addNoteBtn,
                {
                  backgroundColor: noteText.trim() ? colors.primary : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={handleAddNote}
              disabled={!noteText.trim()}
            >
              <Text style={[styles.addNoteBtnText, { color: noteText.trim() ? "#fff" : colors.muted }]}>
                Add Note
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── PAYMENT ── */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader title="Payment" icon="creditcard.fill" color="#22C55E" />
          <PaymentSection
            amount={paymentAmount}
            onAmountChange={setPaymentAmount}
            method={paymentMethod}
            onMethodChange={setPaymentMethod}
            authorized={paymentAuthorized}
            onAuthorize={() => {
              if (!paymentAmount.trim() || parseFloat(paymentAmount) <= 0) {
                Alert.alert("Enter Amount", "Please enter the payment amount.");
                return;
              }
              Alert.alert(
                "Authorize Payment",
                `Authorize $${paymentAmount} via ${paymentMethod}?`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Authorize",
                    onPress: () => {
                      setPaymentAuthorized(true);
                      if (Platform.OS !== "web")
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    },
                  },
                ],
              );
            }}
          />
        </View>

        {/* ── SIGNATURE ── */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader title="Customer Signature" icon="signature" color="#3B82F6" />
          <Text style={[styles.sectionNote, { color: colors.muted }]}>
            Required to complete this work order. Signature is cryptographically locked to this record.
          </Text>
          <SignaturePad
            signed={signed}
            onSign={() => {
              Alert.alert(
                "Capture Signature",
                "Hand the device to the customer to sign.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Signature Captured",
                    onPress: () => {
                      setSigned(true);
                      if (Platform.OS !== "web")
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    },
                  },
                ],
              );
            }}
            onClear={() => setSigned(false)}
          />
        </View>

        {/* ── COMPLETE BUTTON ── */}
        <View style={styles.completeSection}>
          {!allMandatoryDone && (
            <View style={[styles.blockBanner, { backgroundColor: "#EF444415", borderColor: "#EF444440" }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#EF4444" />
              <Text style={[styles.blockText, { color: "#EF4444" }]}>
                Complete all {mandatoryItems.length - completedMandatory} required checklist items to finish
              </Text>
            </View>
          )}
          {!signed && (
            <View style={[styles.blockBanner, { backgroundColor: "#F59E0B15", borderColor: "#F59E0B40" }]}>
              <IconSymbol name="signature" size={16} color="#F59E0B" />
              <Text style={[styles.blockText, { color: "#F59E0B" }]}>
                Customer signature required
              </Text>
            </View>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.completeBtn,
              {
                backgroundColor: allMandatoryDone && signed ? "#22C55E" : colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleComplete}
          >
            <IconSymbol
              name="checkmark.circle.fill"
              size={20}
              color={allMandatoryDone && signed ? "#fff" : colors.muted}
            />
            <Text
              style={[
                styles.completeBtnText,
                { color: allMandatoryDone && signed ? "#fff" : colors.muted },
              ]}
            >
              Complete Work Order
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  progressCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  progressText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  progressBar: { height: 3 },
  progressFill: { height: 3 },
  scroll: { paddingBottom: 40 },
  section: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  sectionNote: { fontSize: 13, lineHeight: 18 },
  checklistMeta: { marginBottom: 4 },
  checklistProgress: { fontSize: 12, fontWeight: "600" },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: { flex: 1, fontSize: 14, lineHeight: 20 },
  requiredBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  requiredText: { fontSize: 10, fontWeight: "700", color: "#EF4444" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  photoCaption: { fontSize: 9, textAlign: "center" },
  photoAddBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  photoAddText: { fontSize: 11, fontWeight: "600" },
  voiceNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  voiceNoteText: { flex: 1, fontSize: 13, fontWeight: "500" },
  voiceNoteTime: { fontSize: 11 },
  voicePlayBtn: { padding: 4 },
  voiceRecordBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  voiceRecordText: { fontSize: 14, fontWeight: "600" },
  recordingDot: { width: 8, height: 8, borderRadius: 4 },
  fieldNoteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  fieldNoteContent: { flex: 1 },
  fieldNoteText: { fontSize: 14, lineHeight: 20 },
  fieldNoteTime: { fontSize: 11, marginTop: 2 },
  noteInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  noteActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  flagToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    flex: 1,
  },
  flagToggleText: { fontSize: 12, fontWeight: "600" },
  addNoteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addNoteBtnText: { fontSize: 13, fontWeight: "700" },
  paymentSection: { gap: 10 },
  paymentRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  paymentLabel: { fontSize: 12, fontWeight: "600", flex: 1 },
  paymentInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: "700",
    width: 120,
    textAlign: "right",
  },
  methodScroll: { marginBottom: 4 },
  methodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
  },
  methodText: { fontSize: 13, fontWeight: "600" },
  authorizedBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  authorizedText: { fontSize: 13, fontWeight: "600" },
  authorizeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  authorizeBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  sigPad: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    minHeight: 120,
    overflow: "hidden",
  },
  sigEmpty: {
    flex: 1,
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 20,
  },
  sigEmptyText: { fontSize: 14, fontWeight: "500", textAlign: "center" },
  sigEmptyNote: { fontSize: 11, textAlign: "center" },
  sigSigned: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 6,
  },
  sigSignedText: { fontSize: 15, fontWeight: "700" },
  sigLockedText: { fontSize: 12 },
  sigClearBtn: { marginTop: 4 },
  sigClearText: { fontSize: 12, fontWeight: "600" },
  completeSection: { margin: 16, marginTop: 8, gap: 10 },
  blockBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  blockText: { fontSize: 13, fontWeight: "500", flex: 1 },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  completeBtnText: { fontSize: 17, fontWeight: "800" },
});
