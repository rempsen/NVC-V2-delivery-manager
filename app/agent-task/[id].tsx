/**
 * Agent Task Workflow Screen
 *
 * Tookan-style task execution for field technicians:
 *   1. Pre-start: job details + Swipe-to-Start bar
 *   2. En Route: live GPS tracking, geofence arrival detection (20m)
 *   3. On Site: notes, photo capture, checklist, signature, payment
 *   4. Complete: Swipe-to-Complete bar
 */
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  Image,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
  PanResponder,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { NVC_BLUE, NVC_ORANGE, NVC_LOGO_DARK } from "@/constants/brand";
import { trpc } from "@/lib/trpc";
import { MOCK_TASKS, STATUS_COLORS, STATUS_LABELS, type Task } from "@/lib/nvc-types";
import { useTenant } from "@/hooks/use-tenant";

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.65; // 65% of screen width to trigger
const GEOFENCE_RADIUS_M = 20; // 20-meter arrival threshold

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000; // Earth radius in metres
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Swipe Bar Component ──────────────────────────────────────────────────────

interface SwipeBarProps {
  label: string;
  sublabel?: string;
  color: string;
  icon: string;
  onComplete: () => void;
  disabled?: boolean;
  loading?: boolean;
}

function SwipeBar({ label, sublabel, color, icon, onComplete, disabled, loading }: SwipeBarProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [completed, setCompleted] = useState(false);
  const TRACK_WIDTH = SCREEN_WIDTH - 48;
  const THUMB_SIZE = 52;
  const MAX_X = TRACK_WIDTH - THUMB_SIZE - 8;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !loading,
      onMoveShouldSetPanResponder: () => !disabled && !loading,
      onPanResponderGrant: () => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(0, Math.min(gestureState.dx, MAX_X));
        translateX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= SWIPE_THRESHOLD) {
          Animated.timing(translateX, {
            toValue: MAX_X,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            setCompleted(true);
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onComplete();
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
        }
      },
    }),
  ).current;

  const opacity = translateX.interpolate({
    inputRange: [0, MAX_X * 0.5],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.swipeTrack, { backgroundColor: color + "18", borderColor: color + "40" }]}>
      {/* Label fades as thumb moves */}
      <Animated.View style={[styles.swipeLabelWrap, { opacity }]}>
        <Text style={[styles.swipeLabel, { color }]}>{label}</Text>
        {sublabel ? <Text style={[styles.swipeSublabel, { color: color + "99" }]}>{sublabel}</Text> : null}
      </Animated.View>

      {/* Thumb */}
      {loading ? (
        <View style={[styles.swipeThumb, { backgroundColor: color, left: 4 }]}>
          <ActivityIndicator color="#fff" size="small" />
        </View>
      ) : (
        <Animated.View
          style={[
            styles.swipeThumb,
            { backgroundColor: completed ? color : color, transform: [{ translateX }] },
          ]}
          {...panResponder.panHandlers}
        >
          <IconSymbol name={icon as any} size={22} color="#fff" />
        </Animated.View>
      )}

      {/* Chevrons hint */}
      <View style={styles.swipeChevrons} pointerEvents="none">
        {[0, 1, 2].map((i) => (
          <IconSymbol key={i} name="chevron.right" size={14} color={color + "60"} />
        ))}
      </View>
    </View>
  );
}

// ─── Photo Grid ───────────────────────────────────────────────────────────────

function PhotoGrid({ photos, onAdd, onRemove }: {
  photos: string[];
  onAdd: (uri: string) => void;
  onRemove: (uri: string) => void;
}) {
  const pickPhoto = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Camera", "Photo capture is available on iOS and Android devices.");
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera access is needed to take job photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      onAdd(result.assets[0].uri);
    }
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Photo library access is needed.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      onAdd(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.photoGrid}>
      {photos.map((uri, i) => (
        <View key={uri + i} style={styles.photoThumbWrap}>
          <Image source={{ uri }} style={styles.photoThumb} />
          <Pressable
            style={styles.photoRemoveBtn}
            onPress={() => onRemove(uri)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <IconSymbol name="xmark" size={10} color="#fff" />
          </Pressable>
        </View>
      ))}
      {/* Add photo button */}
      <Pressable
        style={({ pressed }) => [styles.photoAddBtn, pressed && { opacity: 0.7 }]}
        onPress={() => {
          Alert.alert("Add Photo", "Choose a source", [
            { text: "Camera", onPress: pickPhoto },
            { text: "Photo Library", onPress: pickFromLibrary },
            { text: "Cancel", style: "cancel" },
          ]);
        }}
      >
        <IconSymbol name="camera.fill" size={20} color={NVC_BLUE} />
        <Text style={styles.photoAddText}>Add Photo</Text>
      </Pressable>
    </View>
  );
}

// ─── Signature Pad (Canvas-based for web, touch-based for native) ─────────────

function SignaturePad({ onSave }: { onSave: (uri: string) => void }) {
  const [signed, setSigned] = useState(false);

  // For web: use a simple canvas-based approach
  // For native: use a drawing surface via touch events
  const handleCapture = () => {
    // In production, this would capture a real signature
    // For now, we record the intent and use a placeholder URI
    setSigned(true);
    onSave("signature://captured-" + Date.now());
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (signed) {
    return (
      <View style={styles.signatureCapture}>
        <IconSymbol name="checkmark.circle.fill" size={24} color="#22C55E" />
        <Text style={styles.signatureCapturedText}>Signature captured</Text>
      </View>
    );
  }

  return (
    <View style={styles.signaturePad}>
      <Text style={styles.signaturePadHint}>Have the customer sign below</Text>
      <View style={styles.signatureCanvas}>
        <Text style={styles.signatureCanvasPlaceholder}>Tap to sign</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.signatureCaptureBtn, pressed && { opacity: 0.8 }]}
        onPress={handleCapture}
      >
        <IconSymbol name="signature" size={16} color="#fff" />
        <Text style={styles.signatureCaptureBtnText}>Capture Signature</Text>
      </Pressable>
    </View>
  );
}

// ─── Payment Section ──────────────────────────────────────────────────────────

function PaymentSection({
  amount,
  method,
  onAmountChange,
  onMethodChange,
}: {
  amount: string;
  method: string;
  onAmountChange: (v: string) => void;
  onMethodChange: (v: string) => void;
}) {
  const METHODS = ["Cash", "Card", "E-Transfer", "Invoice", "Paid Online"];

  return (
    <View style={styles.paymentSection}>
      <View style={styles.paymentAmountRow}>
        <Text style={styles.paymentCurrencySymbol}>$</Text>
        <TextInput
          style={styles.paymentAmountInput}
          value={amount}
          onChangeText={onAmountChange}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#9CA3AF"
          returnKeyType="done"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paymentMethods}>
        {METHODS.map((m) => (
          <Pressable
            key={m}
            style={[
              styles.paymentMethodChip,
              method === m && styles.paymentMethodChipActive,
            ]}
            onPress={() => onMethodChange(m)}
          >
            <Text style={[
              styles.paymentMethodText,
              method === m && styles.paymentMethodTextActive,
            ]}>{m}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type WorkflowPhase = "pre_start" | "en_route" | "on_site" | "completed";

export default function AgentTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = parseInt(id ?? "0", 10);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tenantId, isDemo } = useTenant();

  // ── Task data ────────────────────────────────────────────────────────────────
  const { data: apiTask, isLoading } = trpc.tasks.getById.useQuery(
    { id: taskId },
    { enabled: !isDemo && taskId > 0 },
  );

  const task = useMemo<Task | null>(() => {
    if (isDemo) {
      const mock = MOCK_TASKS.find((t) => t.id === taskId) ?? MOCK_TASKS[0] ?? null;
      return mock;
    }
    if (!apiTask) return null;
    const t = apiTask as any;
    return {
      id: t.id,
      jobHash: t.jobHash ?? "",
      status: t.status,
      priority: t.priority ?? "normal",
      customerName: t.customerName ?? "",
      customerPhone: t.customerPhone ?? "",
      customerEmail: t.customerEmail,
      jobAddress: t.jobAddress ?? "",
      jobLatitude: parseFloat(t.jobLatitude ?? "0"),
      jobLongitude: parseFloat(t.jobLongitude ?? "0"),
      pickupAddress: t.pickupAddress,
      description: t.description,
      orderRef: t.orderRef,
      technicianId: t.technicianId,
      technicianName: t.technicianName,
      technicianPhone: t.technicianPhone,
      customFields: t.customFields,
      scheduledAt: t.scheduledAt ? new Date(t.scheduledAt).toISOString() : undefined,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
    };
  }, [apiTask, isDemo, taskId]);

  // ── Workflow state ───────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<WorkflowPhase>("pre_start");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [signatureUri, setSignatureUri] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [distanceToJob, setDistanceToJob] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "tracking" | "arrived">("idle");
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  // ── tRPC mutations ───────────────────────────────────────────────────────────
  const startTaskMutation = trpc.tasks.startTask.useMutation();
  const arriveTaskMutation = trpc.tasks.arriveTask.useMutation();
  const saveNotesMutation = trpc.tasks.saveTaskNotes.useMutation();
  const completeTaskMutation = trpc.tasks.completeTask.useMutation();

  // ── Determine initial phase from task status ─────────────────────────────────
  useEffect(() => {
    if (!task) return;
    if (task.status === "en_route") setPhase("en_route");
    else if (task.status === "on_site") setPhase("on_site");
    else if (task.status === "completed") setPhase("completed");
    else setPhase("pre_start");
  }, [task]);

  // ── Geolocation tracking ─────────────────────────────────────────────────────
  const startLocationTracking = useCallback(async () => {
    if (Platform.OS === "web") {
      // Web: use navigator.geolocation
      if (!navigator.geolocation) return;
      setLocationStatus("tracking");
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!task?.jobLatitude || !task?.jobLongitude) return;
          const dist = haversineDistance(
            pos.coords.latitude, pos.coords.longitude,
            task.jobLatitude, task.jobLongitude,
          );
          setDistanceToJob(Math.round(dist));
          if (dist <= GEOFENCE_RADIUS_M && locationStatus !== "arrived") {
            handleAutoArrive(pos.coords.latitude, pos.coords.longitude);
          }
        },
        undefined,
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    setLocationStatus("tracking");
    locationWatchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
      (loc) => {
        if (!task?.jobLatitude || !task?.jobLongitude) return;
        const dist = haversineDistance(
          loc.coords.latitude, loc.coords.longitude,
          task.jobLatitude, task.jobLongitude,
        );
        setDistanceToJob(Math.round(dist));
        if (dist <= GEOFENCE_RADIUS_M && locationStatus !== "arrived") {
          handleAutoArrive(loc.coords.latitude, loc.coords.longitude);
        }
      },
    );
  }, [task, locationStatus]);

  const stopLocationTracking = useCallback(() => {
    locationWatchRef.current?.remove();
    locationWatchRef.current = null;
    setLocationStatus("idle");
  }, []);

  useEffect(() => {
    if (phase === "en_route") {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
    return () => stopLocationTracking();
  }, [phase]);

  // ── Auto-arrive when within geofence ────────────────────────────────────────
  const handleAutoArrive = useCallback(async (lat: number, lng: number) => {
    if (locationStatus === "arrived") return;
    setLocationStatus("arrived");
    stopLocationTracking();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Alert.alert(
      "You've Arrived! 📍",
      "You are within 20 meters of the job site. Mark as arrived?",
      [
        {
          text: "Yes, I'm Here",
          onPress: async () => {
            if (!isDemo) {
              await arriveTaskMutation.mutateAsync({ taskId, latitude: lat, longitude: lng });
            }
            setPhase("on_site");
          },
        },
        {
          text: "Not Yet",
          style: "cancel",
          onPress: () => {
            setLocationStatus("tracking");
            startLocationTracking();
          },
        },
      ],
    );
  }, [locationStatus, taskId, isDemo]);

  // ── Swipe handlers ───────────────────────────────────────────────────────────
  const handleSwipeStart = useCallback(async () => {
    try {
      if (!isDemo) {
        await startTaskMutation.mutateAsync({ taskId });
      }
      setPhase("en_route");
    } catch (e) {
      Alert.alert("Error", "Could not start task. Please try again.");
    }
  }, [taskId, isDemo]);

  const handleManualArrive = useCallback(async () => {
    try {
      if (!isDemo) {
        await arriveTaskMutation.mutateAsync({ taskId });
      }
      setPhase("on_site");
    } catch (e) {
      Alert.alert("Error", "Could not mark as arrived. Please try again.");
    }
  }, [taskId, isDemo]);

  const handleSwipeComplete = useCallback(async () => {
    try {
      if (!isDemo) {
        await completeTaskMutation.mutateAsync({
          taskId,
          notes: notes || undefined,
          signatureUri: signatureUri || undefined,
          paymentAmount: paymentAmount ? parseFloat(paymentAmount) : undefined,
          paymentMethod: paymentMethod || undefined,
        });
      }
      setPhase("completed");
    } catch (e) {
      Alert.alert("Error", "Could not complete task. Please try again.");
    }
  }, [taskId, isDemo, notes, signatureUri, paymentAmount, paymentMethod]);

  const handleSaveNotes = useCallback(async () => {
    if (!isDemo) {
      await saveNotesMutation.mutateAsync({
        taskId,
        notes: notes || undefined,
        photoUris: photos.length > 0 ? photos : undefined,
        signatureUri: signatureUri || undefined,
        paymentAmount: paymentAmount ? parseFloat(paymentAmount) : undefined,
        paymentMethod: paymentMethod || undefined,
      });
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved", "Notes and photos saved successfully.");
  }, [taskId, isDemo, notes, photos, signatureUri, paymentAmount, paymentMethod]);

  // ── Render helpers ───────────────────────────────────────────────────────────
  const statusColor = task ? STATUS_COLORS[task.status] ?? NVC_BLUE : NVC_BLUE;
  const statusLabel = task ? STATUS_LABELS[task.status] ?? task.status : "";

  const formatScheduled = (iso?: string) => {
    if (!iso) return "ASAP";
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  if (isLoading) {
    return (
      <ScreenContainer edges={["left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={NVC_BLUE} />
          <Text style={styles.loadingText}>Loading task...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!task) {
    return (
      <ScreenContainer edges={["left", "right"]}>
        <View style={styles.loadingContainer}>
          <IconSymbol name="exclamationmark.triangle.fill" size={40} color={NVC_ORANGE} />
          <Text style={styles.loadingText}>Task not found</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["left", "right"]} containerClassName="bg-[#F0F4FA]">
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={({ pressed }) => [styles.headerBack, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconSymbol name="chevron.left" size={18} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerRef}>{task.orderRef ?? `#${task.id}`}</Text>
          <View style={[styles.headerStatusPill, { backgroundColor: statusColor + "30" }]}>
            <View style={[styles.headerStatusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.headerStatusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.headerAction, pressed && { opacity: 0.6 }]}
          onPress={() => router.push(`/messages/${task.id}` as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconSymbol name="message.fill" size={18} color="#fff" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 60}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 140 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Customer Card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBg, { backgroundColor: NVC_BLUE + "15" }]}>
                <IconSymbol name="person.fill" size={16} color={NVC_BLUE} />
              </View>
              <Text style={styles.cardTitle}>Customer</Text>
            </View>
            <Text style={styles.customerName}>{task.customerName}</Text>
            {task.customerPhone ? (
              <View style={styles.infoRow}>
                <IconSymbol name="phone.fill" size={13} color="#9CA3AF" />
                <Text style={styles.infoText}>{task.customerPhone}</Text>
              </View>
            ) : null}
            {task.customerEmail ? (
              <View style={styles.infoRow}>
                <IconSymbol name="envelope.fill" size={13} color="#9CA3AF" />
                <Text style={styles.infoText}>{task.customerEmail}</Text>
              </View>
            ) : null}
          </View>

          {/* ── Job Details Card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBg, { backgroundColor: NVC_ORANGE + "15" }]}>
                <IconSymbol name="briefcase.fill" size={16} color={NVC_ORANGE} />
              </View>
              <Text style={styles.cardTitle}>Job Details</Text>
              <View style={[styles.priorityBadge, { backgroundColor: "#F59E0B20" }]}>
                <Text style={styles.priorityText}>{task.priority.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <IconSymbol name="location.fill" size={13} color="#9CA3AF" />
              <Text style={styles.infoTextBold}>{task.jobAddress}</Text>
            </View>
            {task.description ? (
              <Text style={styles.descriptionText}>{task.description}</Text>
            ) : null}
            <View style={styles.infoRow}>
              <IconSymbol name="clock.fill" size={13} color="#9CA3AF" />
              <Text style={styles.infoText}>Scheduled: {formatScheduled(task.scheduledAt)}</Text>
            </View>
          </View>

          {/* ── En Route Status Card ── */}
          {phase === "en_route" && (
            <View style={[styles.card, styles.enRouteCard]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBg, { backgroundColor: "#8B5CF615" }]}>
                  <IconSymbol name="car.fill" size={16} color="#8B5CF6" />
                </View>
                <Text style={[styles.cardTitle, { color: "#8B5CF6" }]}>En Route</Text>
                {locationStatus === "tracking" && (
                  <View style={styles.trackingBadge}>
                    <View style={styles.trackingDot} />
                    <Text style={styles.trackingText}>GPS Active</Text>
                  </View>
                )}
              </View>

              {distanceToJob !== null ? (
                <View style={styles.distanceRow}>
                  <Text style={styles.distanceValue}>{distanceToJob}m</Text>
                  <Text style={styles.distanceLabel}>from job site</Text>
                  {distanceToJob <= 50 && (
                    <View style={styles.nearBadge}>
                      <Text style={styles.nearBadgeText}>Almost there!</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.distanceLoading}>Calculating distance...</Text>
              )}

              <Pressable
                style={({ pressed }) => [styles.manualArriveBtn, pressed && { opacity: 0.8 }]}
                onPress={handleManualArrive}
              >
                <IconSymbol name="mappin.and.ellipse" size={15} color="#8B5CF6" />
                <Text style={styles.manualArriveBtnText}>I've Arrived (Manual)</Text>
              </Pressable>
            </View>
          )}

          {/* ── On-Site Work Section ── */}
          {(phase === "on_site" || phase === "completed") && (
            <>
              {/* Notes */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconBg, { backgroundColor: "#22C55E15" }]}>
                    <IconSymbol name="pencil" size={16} color="#22C55E" />
                  </View>
                  <Text style={styles.cardTitle}>Field Notes</Text>
                  <Text style={styles.optionalLabel}>optional</Text>
                </View>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes about the job, materials used, issues found..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  returnKeyType="done"
                  editable={phase !== "completed"}
                />
              </View>

              {/* Photos */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconBg, { backgroundColor: "#3B82F615" }]}>
                    <IconSymbol name="camera.fill" size={16} color="#3B82F6" />
                  </View>
                  <Text style={styles.cardTitle}>Job Photos</Text>
                  <Text style={styles.optionalLabel}>{photos.length} added</Text>
                </View>
                {phase !== "completed" ? (
                  <PhotoGrid
                    photos={photos}
                    onAdd={(uri) => setPhotos((p) => [...p, uri])}
                    onRemove={(uri) => setPhotos((p) => p.filter((x) => x !== uri))}
                  />
                ) : (
                  <Text style={styles.completedFieldText}>
                    {photos.length > 0 ? `${photos.length} photo(s) attached` : "No photos attached"}
                  </Text>
                )}
              </View>

              {/* Signature */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconBg, { backgroundColor: "#F59E0B15" }]}>
                    <IconSymbol name="signature" size={16} color="#F59E0B" />
                  </View>
                  <Text style={styles.cardTitle}>Client Signature</Text>
                  {signatureUri && (
                    <View style={styles.capturedBadge}>
                      <IconSymbol name="checkmark" size={10} color="#22C55E" />
                      <Text style={styles.capturedBadgeText}>Captured</Text>
                    </View>
                  )}
                </View>
                {phase !== "completed" ? (
                  signatureUri ? (
                    <View style={styles.signatureCapture}>
                      <IconSymbol name="checkmark.circle.fill" size={20} color="#22C55E" />
                      <Text style={styles.signatureCapturedText}>Signature captured</Text>
                      <Pressable
                        style={styles.resignBtn}
                        onPress={() => setSignatureUri(null)}
                      >
                        <Text style={styles.resignBtnText}>Re-sign</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <SignaturePad onSave={setSignatureUri} />
                  )
                ) : (
                  <Text style={styles.completedFieldText}>
                    {signatureUri ? "Signature captured" : "No signature"}
                  </Text>
                )}
              </View>

              {/* Payment */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconBg, { backgroundColor: "#10B98115" }]}>
                    <IconSymbol name="creditcard.fill" size={16} color="#10B981" />
                  </View>
                  <Text style={styles.cardTitle}>Payment</Text>
                  <Text style={styles.optionalLabel}>optional</Text>
                </View>
                {phase !== "completed" ? (
                  <PaymentSection
                    amount={paymentAmount}
                    method={paymentMethod}
                    onAmountChange={setPaymentAmount}
                    onMethodChange={setPaymentMethod}
                  />
                ) : (
                  <Text style={styles.completedFieldText}>
                    {paymentAmount ? `$${paymentAmount} via ${paymentMethod}` : "No payment recorded"}
                  </Text>
                )}
              </View>

              {/* Save Notes Button (only in on_site phase) */}
              {phase === "on_site" && (
                <Pressable
                  style={({ pressed }) => [styles.saveNotesBtn, pressed && { opacity: 0.8 }]}
                  onPress={handleSaveNotes}
                >
                  {saveNotesMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <IconSymbol name="square.and.arrow.down.fill" size={15} color="#fff" />
                      <Text style={styles.saveNotesBtnText}>Save Progress</Text>
                    </>
                  )}
                </Pressable>
              )}
            </>
          )}

          {/* ── Completed Banner ── */}
          {phase === "completed" && (
            <View style={styles.completedBanner}>
              <IconSymbol name="checkmark.circle.fill" size={40} color="#22C55E" />
              <Text style={styles.completedTitle}>Job Complete!</Text>
              <Text style={styles.completedSubtitle}>
                This work order has been marked as completed.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.viewSummaryBtn, pressed && { opacity: 0.8 }]}
                onPress={() => router.push(`/task/${task.id}` as any)}
              >
                <Text style={styles.viewSummaryBtnText}>View Summary</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Bottom Action Bar ── */}
      {phase !== "completed" && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          {phase === "pre_start" && (
            <SwipeBar
              label="Swipe to Start Job"
              sublabel="SMS will be sent to customer"
              color="#8B5CF6"
              icon="arrow.right"
              onComplete={handleSwipeStart}
              loading={startTaskMutation.isPending}
            />
          )}
          {phase === "en_route" && (
            <SwipeBar
              label="Swipe when Arrived"
              sublabel="Marks you as on-site"
              color="#F59E0B"
              icon="mappin.and.ellipse"
              onComplete={handleManualArrive}
              loading={arriveTaskMutation.isPending}
            />
          )}
          {phase === "on_site" && (
            <SwipeBar
              label="Swipe to Complete Job"
              sublabel="Notifies dispatcher"
              color="#22C55E"
              icon="checkmark"
              onComplete={handleSwipeComplete}
              loading={completeTaskMutation.isPending}
            />
          )}
        </View>
      )}
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    backgroundColor: NVC_BLUE,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  } as ViewStyle,
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  } as ViewStyle,
  headerRef: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  } as TextStyle,
  headerStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  } as ViewStyle,
  headerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
  headerStatusText: {
    fontSize: 11,
    fontWeight: "600",
  } as TextStyle,
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 12,
  },

  // Cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  } as ViewStyle,
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  } as ViewStyle,
  cardIconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  } as TextStyle,

  // Customer
  customerName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  } as TextStyle,
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  } as ViewStyle,
  infoText: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  } as TextStyle,
  infoTextBold: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  } as TextStyle,
  descriptionText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 8,
  } as TextStyle,
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  } as ViewStyle,
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#F59E0B",
    letterSpacing: 0.5,
  } as TextStyle,

  // En Route
  enRouteCard: {
    borderWidth: 1.5,
    borderColor: "#8B5CF640",
    backgroundColor: "#8B5CF608",
  } as ViewStyle,
  trackingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#22C55E15",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  } as ViewStyle,
  trackingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  } as ViewStyle,
  trackingText: {
    fontSize: 11,
    color: "#22C55E",
    fontWeight: "600",
  } as TextStyle,
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  } as ViewStyle,
  distanceValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#8B5CF6",
  } as TextStyle,
  distanceLabel: {
    fontSize: 13,
    color: "#6B7280",
  } as TextStyle,
  distanceLoading: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
  } as TextStyle,
  nearBadge: {
    backgroundColor: "#22C55E15",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  } as ViewStyle,
  nearBadgeText: {
    fontSize: 11,
    color: "#22C55E",
    fontWeight: "600",
  } as TextStyle,
  manualArriveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#8B5CF615",
    borderWidth: 1,
    borderColor: "#8B5CF640",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
  } as ViewStyle,
  manualArriveBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8B5CF6",
  } as TextStyle,

  // Notes
  optionalLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontStyle: "italic",
  } as TextStyle,
  notesInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#374151",
    minHeight: 100,
    lineHeight: 20,
  } as TextStyle,

  // Photos
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  } as ViewStyle,
  photoThumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  } as ViewStyle,
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
  } as any,
  photoRemoveBtn: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  photoAddBtn: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: NVC_BLUE + "40",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: NVC_BLUE + "08",
  } as ViewStyle,
  photoAddText: {
    fontSize: 10,
    color: NVC_BLUE,
    fontWeight: "600",
    textAlign: "center",
  } as TextStyle,

  // Signature
  signaturePad: {
    gap: 10,
  } as ViewStyle,
  signaturePadHint: {
    fontSize: 12,
    color: "#9CA3AF",
  } as TextStyle,
  signatureCanvas: {
    height: 100,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  signatureCanvasPlaceholder: {
    fontSize: 13,
    color: "#D1D5DB",
    fontStyle: "italic",
  } as TextStyle,
  signatureCaptureBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F59E0B",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
  } as ViewStyle,
  signatureCaptureBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  } as TextStyle,
  signatureCapture: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  } as ViewStyle,
  signatureCapturedText: {
    fontSize: 13,
    color: "#22C55E",
    fontWeight: "600",
    flex: 1,
  } as TextStyle,
  resignBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  } as ViewStyle,
  resignBtnText: {
    fontSize: 12,
    color: "#6B7280",
  } as TextStyle,
  capturedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#22C55E15",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  } as ViewStyle,
  capturedBadgeText: {
    fontSize: 10,
    color: "#22C55E",
    fontWeight: "600",
  } as TextStyle,

  // Payment
  paymentSection: {
    gap: 10,
  } as ViewStyle,
  paymentAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  } as ViewStyle,
  paymentCurrencySymbol: {
    fontSize: 20,
    fontWeight: "700",
    color: "#374151",
  } as TextStyle,
  paymentAmountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  } as TextStyle,
  paymentMethods: {
    flexGrow: 0,
  },
  paymentMethodChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  } as ViewStyle,
  paymentMethodChipActive: {
    backgroundColor: "#10B98115",
    borderColor: "#10B98140",
  } as ViewStyle,
  paymentMethodText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  } as TextStyle,
  paymentMethodTextActive: {
    color: "#10B981",
    fontWeight: "700",
  } as TextStyle,

  // Save Notes
  saveNotesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: NVC_BLUE,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  } as ViewStyle,
  saveNotesBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  } as TextStyle,

  // Completed
  completedBanner: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: "#22C55E30",
  } as ViewStyle,
  completedTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  } as TextStyle,
  completedSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  } as TextStyle,
  completedFieldText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
  } as TextStyle,
  viewSummaryBtn: {
    backgroundColor: NVC_BLUE,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 6,
  } as ViewStyle,
  viewSummaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  } as TextStyle,

  // Bottom Swipe Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: "#F0F4FA",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  } as ViewStyle,

  // Swipe Track
  swipeTrack: {
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  } as ViewStyle,
  swipeLabelWrap: {
    position: "absolute",
    alignItems: "center",
    gap: 2,
  } as ViewStyle,
  swipeLabel: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  } as TextStyle,
  swipeSublabel: {
    fontSize: 11,
    fontWeight: "500",
  } as TextStyle,
  swipeThumb: {
    position: "absolute",
    left: 4,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  } as ViewStyle,
  swipeChevrons: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
  } as ViewStyle,

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  } as ViewStyle,
  loadingText: {
    fontSize: 15,
    color: "#6B7280",
  } as TextStyle,
  backBtn: {
    backgroundColor: NVC_BLUE,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  } as ViewStyle,
  backBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  } as TextStyle,
});
