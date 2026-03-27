/**
 * Agent Task Workflow Screen — NVC360 2.0
 *
 * Tookan-style task execution for field technicians.
 * Layout mirrors the Tookan mock-up:
 *   • Header: task time/type, customer name (call button), address (navigate button)
 *   • Milestone bar: Start → Arrive → Successful
 *   • Expandable sections: NOTES (+), SIGNATURE (+), IMAGES (+), TOTAL BILL
 *   • Bottom bar: Failed ←toggle→ Successful  (or swipe-to-start pre-task)
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
  Linking,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { NVC_BLUE, NVC_ORANGE } from "@/constants/brand";
import { trpc } from "@/lib/trpc";
import { MOCK_TASKS, STATUS_COLORS, STATUS_LABELS, type Task } from "@/lib/nvc-types";
import { useTenant } from "@/hooks/use-tenant";
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from "@/lib/background-location-task";

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.62;
const GEOFENCE_RADIUS_M = 20;

const FAIL_REASONS = [
  "Jobsite Not Ready",
  "Materials Not Ready For Pickup",
  "Scheduling Problem",
  "Site Access Issue",
  "Client Not On Site / Home",
  "Personal Issue",
  "Issue With Materials or Product",
  "Other",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Swipe-to-Start Bar ───────────────────────────────────────────────────────

function SwipeStartBar({
  onComplete,
  loading,
}: {
  onComplete: () => void;
  loading?: boolean;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const TRACK_WIDTH = SCREEN_WIDTH - 48;
  const THUMB_SIZE = 56;
  const MAX_X = TRACK_WIDTH - THUMB_SIZE - 8;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !loading,
      onMoveShouldSetPanResponder: () => !loading,
      onPanResponderGrant: () => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gs) => {
        translateX.setValue(Math.max(0, Math.min(gs.dx, MAX_X)));
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx >= SWIPE_THRESHOLD) {
          Animated.timing(translateX, { toValue: MAX_X, duration: 150, useNativeDriver: true }).start(() => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onComplete();
          });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 100, friction: 8 }).start();
        }
      },
    }),
  ).current;

  const labelOpacity = translateX.interpolate({ inputRange: [0, MAX_X * 0.4], outputRange: [1, 0], extrapolate: "clamp" });

  return (
    <View style={swipeStyles.track}>
      <Animated.View style={[swipeStyles.labelWrap, { opacity: labelOpacity }]}>
        <Text style={swipeStyles.label}>Swipe to Start Job</Text>
        <Text style={swipeStyles.sublabel}>SMS notification will be sent to customer</Text>
      </Animated.View>
      {loading ? (
        <View style={[swipeStyles.thumb, { backgroundColor: "#8B5CF6" }]}>
          <ActivityIndicator color="#fff" size="small" />
        </View>
      ) : (
        <Animated.View
          style={[swipeStyles.thumb, { backgroundColor: "#8B5CF6", transform: [{ translateX }] }]}
          {...panResponder.panHandlers}
        >
          <IconSymbol name="arrow.right" size={24} color="#fff" />
        </Animated.View>
      )}
      <View style={swipeStyles.chevrons} pointerEvents="none">
        {[0, 1, 2].map((i) => (
          <IconSymbol key={i} name="chevron.right" size={13} color="#8B5CF660" />
        ))}
      </View>
    </View>
  );
}

// ─── Failed / Successful Toggle Bar ──────────────────────────────────────────

function OutcomeToggleBar({
  onFail,
  onSuccess,
  loadingFail,
  loadingSuccess,
}: {
  onFail: () => void;
  onSuccess: () => void;
  loadingFail?: boolean;
  loadingSuccess?: boolean;
}) {
  return (
    <View style={outcomeStyles.bar}>
      <Pressable
        style={({ pressed }) => [
          outcomeStyles.failBtn,
          pressed && { opacity: 0.85 },
        ] as ViewStyle[]}
        onPress={onFail}
        disabled={loadingFail || loadingSuccess}
      >
        {loadingFail ? (
          <ActivityIndicator size="small" color="#EF4444" />
        ) : (
          <>
            <View style={outcomeStyles.failDot} />
            <Text style={outcomeStyles.failText}>Failed</Text>
          </>
        )}
      </Pressable>

      {/* Toggle pill */}
      <View style={outcomeStyles.togglePill}>
        <View style={outcomeStyles.toggleKnob} />
      </View>

      <Pressable
        style={({ pressed }) => [
          outcomeStyles.successBtn,
          pressed && { opacity: 0.85 },
        ] as ViewStyle[]}
        onPress={onSuccess}
        disabled={loadingFail || loadingSuccess}
      >
        {loadingSuccess ? (
          <ActivityIndicator size="small" color="#22C55E" />
        ) : (
          <>
            <Text style={outcomeStyles.successText}>Successful</Text>
            <View style={outcomeStyles.successDot} />
          </>
        )}
      </Pressable>
    </View>
  );
}

// ─── Expandable Section ───────────────────────────────────────────────────────

function ExpandableSection({
  title,
  badge,
  children,
  defaultOpen = false,
  rightAction,
}: {
  title: string;
  badge?: string | number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  rightAction?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const rotation = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(rotation, {
      toValue: open ? 0 : 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
    setOpen((v) => !v);
  };

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] });

  return (
    <View style={sectionStyles.container}>
      <Pressable
        style={({ pressed }) => [sectionStyles.header, pressed && { backgroundColor: "#F9FAFB" }] as ViewStyle[]}
        onPress={toggle}
      >
        <Text style={sectionStyles.title}>{title}</Text>
        {badge !== undefined && badge !== 0 && (
          <View style={sectionStyles.badge}>
            <Text style={sectionStyles.badgeText}>{badge}</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        {rightAction}
        <Animated.View style={{ transform: [{ rotate }] }}>
          <IconSymbol name="plus" size={18} color="#9CA3AF" />
        </Animated.View>
      </Pressable>
      {open && <View style={sectionStyles.body}>{children}</View>}
    </View>
  );
}

// ─── Signature Canvas (SVG path-based) ───────────────────────────────────────

function SignatureCanvas({ onSave }: { onSave: (dataUri: string) => void }) {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [isSigned, setIsSigned] = useState(false);
  const canvasRef = useRef<View>(null);

  const handleTouchStart = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    setCurrentPath(`M${locationX.toFixed(1)},${locationY.toFixed(1)}`);
  };

  const handleTouchMove = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    setCurrentPath((p) => `${p} L${locationX.toFixed(1)},${locationY.toFixed(1)}`);
  };

  const handleTouchEnd = () => {
    if (currentPath) {
      setPaths((p) => [...p, currentPath]);
      setCurrentPath("");
    }
  };

  const clear = () => {
    setPaths([]);
    setCurrentPath("");
    setIsSigned(false);
  };

  const capture = () => {
    if (paths.length === 0) {
      Alert.alert("Empty Signature", "Please draw a signature before saving.");
      return;
    }
    // Build an SVG data URI from the captured paths
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150">${paths.map((d) => `<path d="${d}" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}</svg>`;
    const dataUri = `data:image/svg+xml;base64,${btoa(svgContent)}`;
    setIsSigned(true);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(dataUri);
  };

  if (isSigned) {
    return (
      <View style={sigStyles.capturedRow}>
        <IconSymbol name="checkmark.circle.fill" size={22} color="#22C55E" />
        <Text style={sigStyles.capturedText}>Signature captured</Text>
        <Pressable style={sigStyles.resignBtn} onPress={() => { setIsSigned(false); clear(); }}>
          <Text style={sigStyles.resignText}>Re-sign</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={sigStyles.wrapper}>
      <Text style={sigStyles.hint}>Have the customer sign in the box below</Text>
      <View
        ref={canvasRef}
        style={sigStyles.canvas}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
        onResponderMove={handleTouchMove}
        onResponderRelease={handleTouchEnd}
      >
        {/* Render SVG paths as a visual representation */}
        {paths.length === 0 && !currentPath ? (
          <Text style={sigStyles.placeholder}>Sign here</Text>
        ) : (
          <View style={sigStyles.pathsContainer}>
            {/* Visual feedback: show a "drawing in progress" indicator */}
            <Text style={sigStyles.drawingIndicator}>
              {paths.length} stroke{paths.length !== 1 ? "s" : ""} captured
            </Text>
          </View>
        )}
      </View>
      <View style={sigStyles.btnRow}>
        <Pressable
          style={({ pressed }) => [sigStyles.clearBtn, pressed && { opacity: 0.7 }] as ViewStyle[]}
          onPress={clear}
        >
          <Text style={sigStyles.clearText}>Clear</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [sigStyles.saveBtn, pressed && { opacity: 0.85 }] as ViewStyle[]}
          onPress={capture}
        >
          <IconSymbol name="checkmark" size={14} color="#fff" />
          <Text style={sigStyles.saveBtnText}>Save Signature</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Milestone Step Bar ───────────────────────────────────────────────────────

type WorkflowPhase = "pre_start" | "en_route" | "on_site" | "completed" | "failed";

const MILESTONE_STEPS: { key: WorkflowPhase; label: string }[] = [
  { key: "pre_start", label: "Assigned" },
  { key: "en_route", label: "Started" },
  { key: "on_site", label: "Arrived" },
  { key: "completed", label: "Successful" },
];

const PHASE_INDEX: Record<WorkflowPhase, number> = {
  pre_start: 0,
  en_route: 1,
  on_site: 2,
  completed: 3,
  failed: 3,
};

function MilestoneBar({ phase }: { phase: WorkflowPhase }) {
  const currentIdx = PHASE_INDEX[phase];
  return (
    <View style={milestoneStyles.container}>
      {MILESTONE_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx && phase !== "failed";
        const failed = phase === "failed" && i === currentIdx;
        const color = failed ? "#EF4444" : done || active ? "#22C55E" : "#D1D5DB";
        return (
          <React.Fragment key={step.key}>
            <View style={milestoneStyles.step}>
              <View style={[milestoneStyles.dot, { backgroundColor: color, borderColor: color }]}>
                {(done || active) && !failed && (
                  <IconSymbol name="checkmark" size={9} color="#fff" />
                )}
                {failed && <IconSymbol name="xmark" size={9} color="#fff" />}
              </View>
              <Text style={[milestoneStyles.label, { color: active || done ? "#374151" : "#9CA3AF" }]}>
                {step.label}
              </Text>
            </View>
            {i < MILESTONE_STEPS.length - 1 && (
              <View style={[milestoneStyles.line, { backgroundColor: i < currentIdx ? "#22C55E" : "#E5E7EB" }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AgentTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = parseInt(id ?? "0", 10);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tenantId, isDemo } = useTenant();

  // ── Task data ────────────────────────────────────────────────────────────────
  const { data: apiTask, isLoading } = trpc.tasks.getById.useQuery(
    { id: taskId, tenantId: tenantId ?? 0 },
    { enabled: !isDemo && taskId > 0 && tenantId != null },
  );

  const task = useMemo<Task | null>(() => {
    if (isDemo) {
      return MOCK_TASKS.find((t) => t.id === taskId) ?? MOCK_TASKS[0] ?? null;
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
  const [totalBill, setTotalBill] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [distanceToJob, setDistanceToJob] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "tracking" | "arrived">("idle");
  const [showFailModal, setShowFailModal] = useState(false);
  const [selectedFailReason, setSelectedFailReason] = useState("");
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  // ── tRPC mutations ─────────────────────────────────────────────────────
  const startTaskMutation = trpc.tasks.startTask.useMutation();
  const arriveTaskMutation = trpc.tasks.arriveTask.useMutation();
  const saveNotesMutation = trpc.tasks.saveTaskNotes.useMutation();
  const completeTaskMutation = trpc.tasks.completeTask.useMutation();
  const updateLocationMutation = trpc.technicians.updateLocation.useMutation();
  const createPaymentIntentMutation = trpc.stripe.createPaymentIntent.useMutation();
  const [stripeLoading, setStripeLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // ── Init phase from task status ──────────────────────────────────────────────
  useEffect(() => {
    if (!task) return;
    if (task.status === "en_route") setPhase("en_route");
    else if (task.status === "on_site") setPhase("on_site");
    else if (task.status === "completed") setPhase("completed");
    else if (task.status === "failed") setPhase("failed");
    else setPhase("pre_start");

    // Pre-fill from saved customFields
    const cf = (task as any).customFields ?? {};
    if (cf.agentNotes) setNotes(cf.agentNotes);
    if (cf.photoUris) setPhotos(cf.photoUris);
    if (cf.signatureUri) setSignatureUri(cf.signatureUri);
    if (cf.paymentAmount) setTotalBill(String(cf.paymentAmount));
    if (cf.paymentMethod) setPaymentMethod(cf.paymentMethod);
  }, [task]);

  // ── Geolocation tracking ─────────────────────────────────────────────────────
  // Push GPS coordinates to server so dispatcher map shows live positions
  const pushLocationToServer = useCallback((lat: number, lng: number) => {
    if (isDemo || !task?.technicianId) return;
    updateLocationMutation.mutate({
      id: task.technicianId,
      tenantId: tenantId ?? undefined,
      latitude: String(lat),
      longitude: String(lng),
    });
  }, [isDemo, task?.technicianId, updateLocationMutation]);

  const startLocationTracking = useCallback(async () => {
    if (Platform.OS === "web") {
      if (!navigator?.geolocation) return;
      setLocationStatus("tracking");
      const wid = navigator.geolocation.watchPosition(
        (pos) => {
          if (!task?.jobLatitude || !task?.jobLongitude) return;
          const dist = haversineDistance(pos.coords.latitude, pos.coords.longitude, task.jobLatitude, task.jobLongitude);
          setDistanceToJob(Math.round(dist));
          // Push live location to server every GPS update
          pushLocationToServer(pos.coords.latitude, pos.coords.longitude);
          if (dist <= GEOFENCE_RADIUS_M) triggerAutoArrive(pos.coords.latitude, pos.coords.longitude);
        },
        undefined,
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
      return () => navigator.geolocation.clearWatch(wid);
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    setLocationStatus("tracking");
    // Start foreground location watch (geofence detection + distance display)
    locationWatchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
      (loc) => {
        if (!task?.jobLatitude || !task?.jobLongitude) return;
        const dist = haversineDistance(loc.coords.latitude, loc.coords.longitude, task.jobLatitude, task.jobLongitude);
        setDistanceToJob(Math.round(dist));
        // Push live location to server every 5s / 5m movement
        pushLocationToServer(loc.coords.latitude, loc.coords.longitude);
        if (dist <= GEOFENCE_RADIUS_M) triggerAutoArrive(loc.coords.latitude, loc.coords.longitude);
      },
    );
    // Also start background tracking so GPS continues when app is backgrounded
    if (!isDemo && task?.technicianId) {
      const apiBase = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
      await startBackgroundLocationTracking(task.technicianId, apiBase);
    }
  }, [task, pushLocationToServer, isDemo]);

  const stopLocationTracking = useCallback(() => {
    locationWatchRef.current?.remove();
    locationWatchRef.current = null;
    setLocationStatus("idle");
    // Stop background tracking too
    stopBackgroundLocationTracking().catch(console.warn);
  }, []);

  useEffect(() => {
    if (phase === "en_route") startLocationTracking();
    else stopLocationTracking();
    return () => stopLocationTracking();
  }, [phase]);

  const triggerAutoArrive = useCallback((lat: number, lng: number) => {
    if (locationStatus === "arrived") return;
    setLocationStatus("arrived");
    stopLocationTracking();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("You've Arrived! 📍", "You are within 20 metres of the job site.", [
      { text: "Mark as Arrived", onPress: () => handleArrive(lat, lng) },
      { text: "Not Yet", style: "cancel", onPress: () => { setLocationStatus("tracking"); startLocationTracking(); } },
    ]);
  }, [locationStatus]);

  // ── Action handlers ──────────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    try {
      if (!isDemo) await startTaskMutation.mutateAsync({ taskId, tenantId: tenantId ?? 0 });
      setPhase("en_route");
    } catch { Alert.alert("Error", "Could not start task. Please try again."); }
  }, [taskId, isDemo]);

  const handleArrive = useCallback(async (lat?: number, lng?: number) => {
    try {
      if (!isDemo) await arriveTaskMutation.mutateAsync({ taskId, tenantId: tenantId ?? 0, latitude: lat, longitude: lng });
      setPhase("on_site");
    } catch { Alert.alert("Error", "Could not mark as arrived."); }
  }, [taskId, isDemo]);

  const handleSuccess = useCallback(async () => {
    try {
      if (!isDemo) {
        await completeTaskMutation.mutateAsync({
          taskId,
          tenantId: tenantId ?? 0,
          notes: notes || undefined,
          signatureUri: signatureUri || undefined,
          paymentAmount: totalBill ? parseFloat(totalBill) : undefined,
          paymentMethod: paymentMethod || undefined,
        });
      }
      setPhase("completed");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert("Error", "Could not complete task."); }
  }, [taskId, isDemo, notes, signatureUri, totalBill, paymentMethod]);

  const handleFail = useCallback(() => {
    setShowFailModal(true);
  }, []);

  const confirmFail = useCallback(async () => {
    if (!selectedFailReason) { Alert.alert("Select Reason", "Please select a reason for failing this task."); return; }
    setShowFailModal(false);
    try {
      if (!isDemo) {
        await saveNotesMutation.mutateAsync({
          taskId,
          tenantId: tenantId ?? 0,
          notes: `FAILED: ${selectedFailReason}${notes ? `\n${notes}` : ""}`,
        });
      }
      setPhase("failed");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch { Alert.alert("Error", "Could not mark task as failed."); }
  }, [selectedFailReason, taskId, isDemo, notes]);

  const handleSaveProgress = useCallback(async () => {
    if (!isDemo) {
      await saveNotesMutation.mutateAsync({
        taskId,
        tenantId: tenantId ?? 0,
        notes: notes || undefined,
        photoUris: photos.length > 0 ? photos : undefined,
        signatureUri: signatureUri || undefined,
        paymentAmount: totalBill ? parseFloat(totalBill) : undefined,
        paymentMethod: paymentMethod || undefined,
      });
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [taskId, isDemo, notes, photos, signatureUri, totalBill, paymentMethod]);

  const handleChargeCard = useCallback(async () => {
    const amountFloat = parseFloat(totalBill || "0");
    if (!amountFloat || amountFloat <= 0) {
      Alert.alert("Amount Required", "Please enter the total bill amount before charging the card.");
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStripeLoading(true);
    try {
      const result = await createPaymentIntentMutation.mutateAsync({
        amountCents: Math.round(amountFloat * 100),
        currency: "cad",
        taskId: typeof taskId === "string" ? parseInt(taskId) : (taskId as number),
        customerName: task?.customerName,
        customerEmail: task?.customerEmail,
        description: `Work Order #${taskId} — ${task?.customerName ?? ""}`,
      });
      Alert.alert(
        "Payment Intent Created",
        `Amount: $${amountFloat.toFixed(2)} CAD\nIntent ID: ${result.paymentIntentId}\n\nUse your Stripe card reader or share the payment link with the customer via the Stripe Dashboard.`,
        [{ text: "OK", style: "default" }],
      );
    } catch (e: any) {
      if (e?.message?.includes("STRIPE_SECRET_KEY")) {
        Alert.alert("Stripe Not Configured", "Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in Settings → Secrets to enable card payments.");
      } else {
        Alert.alert("Payment Error", e?.message ?? "Could not create payment intent.");
      }
    } finally {
      setStripeLoading(false);
    }
  }, [totalBill, taskId, task, createPaymentIntentMutation]);

  const handleDownloadInvoice = useCallback(async () => {
    if (isDemo) {
      Alert.alert("Demo Mode", "Invoice PDF download is not available in demo mode.");
      return;
    }
    const numericTaskId = typeof taskId === "string" ? parseInt(taskId) : (taskId as number);
    if (!numericTaskId || isNaN(numericTaskId)) {
      Alert.alert("Error", "Invalid task ID.");
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInvoiceLoading(true);
    try {
      // Fetch PDF from server
      const apiBase = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
      const url = `${apiBase}/trpc/export.invoicePdf?input=${encodeURIComponent(JSON.stringify({ json: { taskId: numericTaskId } }))}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const json = await res.json() as any;
      const pdfBase64: string = json?.result?.data?.json?.pdfBase64 ?? "";
      const filename: string = json?.result?.data?.json?.filename ?? `invoice-${numericTaskId}.pdf`;
      if (!pdfBase64) throw new Error("No PDF data returned");
      if (Platform.OS === "web") {
        // Web: trigger browser download
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${pdfBase64}`;
        link.download = filename;
        link.click();
      } else {
        // Native: save to cache and share
        const FileSystem = await import("expo-file-system/legacy");
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, pdfBase64, { encoding: FileSystem.EncodingType.Base64 });
        const Sharing = await import("expo-sharing");
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { mimeType: "application/pdf", dialogTitle: "Save Invoice PDF" });
        } else {
          Alert.alert("Sharing Not Available", `PDF saved to: ${fileUri}`);
        }
      }
    } catch (e: any) {
      Alert.alert("Export Failed", e?.message ?? "Could not generate invoice PDF.");
    } finally {
      setInvoiceLoading(false);
    }
  }, [taskId, isDemo]);

  const callCustomer = () => {
    if (task?.customerPhone) Linking.openURL(`tel:${task.customerPhone}`);
  };

  const navigateToJob = () => {
    if (task?.jobAddress) {
      const encoded = encodeURIComponent(task.jobAddress);
      const url = Platform.OS === "ios"
        ? `maps://?q=${encoded}`
        : `geo:0,0?q=${encoded}`;
      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://maps.google.com/?q=${encoded}`);
      });
    }
  };

  const addPhoto = async () => {
    if (Platform.OS === "web") { Alert.alert("Camera", "Photo capture is available on iOS and Android."); return; }
    Alert.alert("Add Photo", "Choose source", [
      {
        text: "Camera", onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission Required", "Camera access needed."); return; }
          const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.75 });
          if (!r.canceled && r.assets[0]) setPhotos((p) => [...p, r.assets[0].uri]);
        },
      },
      {
        text: "Photo Library", onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission Required", "Library access needed."); return; }
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.75 });
          if (!r.canceled && r.assets[0]) setPhotos((p) => [...p, r.assets[0].uri]);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // ── Formatted time ───────────────────────────────────────────────────────────
  const timeLabel = useMemo(() => {
    if (!task?.scheduledAt) return "ASAP";
    const d = new Date(task.scheduledAt);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }, [task?.scheduledAt]);

  const taskTypeLabel = task?.description
    ? task.description.split(" ").slice(0, 3).join(" ")
    : task?.orderRef ?? "Service Call";

  const isFinished = phase === "completed" || phase === "failed";
  const canWork = phase === "on_site";

  // ── Loading / not found ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <ScreenContainer edges={["left", "right"]}>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={NVC_BLUE} />
          <Text style={styles.centeredText}>Loading task...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!task) {
    return (
      <ScreenContainer edges={["left", "right"]}>
        <View style={styles.centeredContainer}>
          <IconSymbol name="exclamationmark.triangle.fill" size={40} color={NVC_ORANGE} />
          <Text style={styles.centeredText}>Task not found</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["left", "right"]} containerClassName="bg-[#F5F6FA]">
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={({ pressed }) => [styles.headerBackBtn, pressed && { opacity: 0.6 }] as ViewStyle[]}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconSymbol name="chevron.left" size={18} color="#374151" />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTime}>{timeLabel} — {taskTypeLabel}</Text>
          <View style={styles.headerStatusRow}>
            <View style={[styles.headerStatusDot, { backgroundColor: phase === "completed" ? "#22C55E" : phase === "failed" ? "#EF4444" : phase === "on_site" ? "#F59E0B" : NVC_BLUE }]} />
            <Text style={styles.headerStatusText}>
              {phase === "pre_start" ? "Assigned" : phase === "en_route" ? "En Route" : phase === "on_site" ? "On Site" : phase === "completed" ? "Completed" : "Failed"}
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.headerMsgBtn, pressed && { opacity: 0.7 }] as ViewStyle[]}
          onPress={() => router.push(`/messages/${task.id}` as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconSymbol name="message.fill" size={17} color={NVC_BLUE} />
        </Pressable>
      </View>

      {/* ── Customer Info Row ── */}
      <View style={styles.customerRow}>
        <View style={styles.customerAvatar}>
          <Text style={styles.customerAvatarText}>{task.customerName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{task.customerName}</Text>
          <Text style={styles.customerPhone}>{task.customerPhone || "No phone"}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.actionCircle, styles.callCircle, pressed && { opacity: 0.8 }] as ViewStyle[]}
          onPress={callCustomer}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <IconSymbol name="phone.fill" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* ── Address Row ── */}
      <Pressable
        style={({ pressed }) => [styles.addressRow, pressed && { backgroundColor: "#EEF2FF" }] as ViewStyle[]}
        onPress={navigateToJob}
      >
        <View style={styles.addressIconWrap}>
          <IconSymbol name="location.fill" size={14} color="#6366F1" />
        </View>
        <Text style={styles.addressText} numberOfLines={2}>{task.jobAddress}</Text>
        <View style={[styles.actionCircle, styles.navCircle]}>
          <IconSymbol name="arrow.up.right.square.fill" size={18} color="#fff" />
        </View>
      </Pressable>

      {/* ── Milestone Bar ── */}
      <View style={styles.milestoneWrap}>
        <MilestoneBar phase={phase} />
      </View>

      {/* ── En Route GPS Banner ── */}
      {phase === "en_route" && (
        <View style={styles.gpsBanner}>
          <View style={styles.gpsDot} />
          <Text style={styles.gpsText}>
            {distanceToJob !== null ? `${distanceToJob}m from job site` : "Calculating distance..."}
          </Text>
          {distanceToJob !== null && distanceToJob <= 50 && (
            <View style={styles.nearBadge}><Text style={styles.nearBadgeText}>Almost there!</Text></View>
          )}
          <Pressable
            style={({ pressed }) => [styles.manualArriveBtn, pressed && { opacity: 0.8 }] as ViewStyle[]}
            onPress={() => handleArrive()}
          >
            <Text style={styles.manualArriveBtnText}>I've Arrived</Text>
          </Pressable>
        </View>
      )}

      {/* ── Main Content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 130 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Task description */}
        {task.description ? (
          <View style={styles.descriptionCard}>
            <IconSymbol name="info.circle.fill" size={14} color="#6B7280" />
            <Text style={styles.descriptionText}>{task.description}</Text>
          </View>
        ) : null}

        {/* ── NOTES Section ── */}
        <ExpandableSection
          title="NOTES"
          badge={notes.length > 0 ? 1 : undefined}
          defaultOpen={canWork || isFinished}
        >
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add job notes, materials used, issues found..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            returnKeyType="done"
            editable={!isFinished}
          />
          {!isFinished && (
            <Pressable
              style={({ pressed }) => [styles.saveProgressBtn, pressed && { opacity: 0.8 }] as ViewStyle[]}
              onPress={handleSaveProgress}
            >
              {saveNotesMutation.isPending ? (
                <ActivityIndicator size="small" color={NVC_BLUE} />
              ) : (
                <Text style={styles.saveProgressText}>Save Progress</Text>
              )}
            </Pressable>
          )}
        </ExpandableSection>

        {/* ── SIGNATURE Section ── */}
        <ExpandableSection
          title="SIGNATURE"
          badge={signatureUri ? "✓" : undefined}
          defaultOpen={false}
        >
          {!isFinished ? (
            signatureUri ? (
              <View style={sigStyles.capturedRow}>
                <IconSymbol name="checkmark.circle.fill" size={22} color="#22C55E" />
                <Text style={sigStyles.capturedText}>Client signature captured</Text>
                <Pressable style={sigStyles.resignBtn} onPress={() => setSignatureUri(null)}>
                  <Text style={sigStyles.resignText}>Re-sign</Text>
                </Pressable>
              </View>
            ) : (
              <SignatureCanvas onSave={setSignatureUri} />
            )
          ) : (
            <Text style={styles.finishedFieldText}>
              {signatureUri ? "✓ Signature captured" : "No signature recorded"}
            </Text>
          )}
        </ExpandableSection>

        {/* ── IMAGES Section ── */}
        <ExpandableSection
          title="IMAGES"
          badge={photos.length > 0 ? photos.length : undefined}
          defaultOpen={false}
        >
          <View style={styles.photoGrid}>
            {photos.map((uri, i) => (
              <View key={uri + i} style={styles.photoThumbWrap}>
                <Image source={{ uri }} style={styles.photoThumb as any} />
                {!isFinished && (
                  <Pressable
                    style={styles.photoRemoveBtn}
                    onPress={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <IconSymbol name="xmark" size={9} color="#fff" />
                  </Pressable>
                )}
              </View>
            ))}
            {!isFinished && (
              <Pressable
                style={({ pressed }) => [styles.photoAddBtn, pressed && { opacity: 0.7 }] as ViewStyle[]}
                onPress={addPhoto}
              >
                <IconSymbol name="camera.fill" size={20} color={NVC_BLUE} />
                <Text style={styles.photoAddText}>Add Photo</Text>
              </Pressable>
            )}
          </View>
        </ExpandableSection>

        {/* ── TOTAL BILL Section ── */}
        <ExpandableSection
          title="TOTAL BILL"
          badge={totalBill ? `$${totalBill}` : undefined}
          defaultOpen={canWork || isFinished}
        >
          <View style={styles.billSection}>
            <View style={styles.billAmountRow}>
              <Text style={styles.billCurrency}>$</Text>
              <TextInput
                style={styles.billAmountInput}
                value={totalBill}
                onChangeText={setTotalBill}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                returnKeyType="done"
                editable={!isFinished}
              />
              {!isFinished && (
                <Pressable
                  style={styles.billEditIcon}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <IconSymbol name="pencil" size={14} color={NVC_BLUE} />
                </Pressable>
              )}
            </View>

            {/* Payment method chips */}
            {!isFinished && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodScroll}>
                {["Cash", "Card", "E-Transfer", "Invoice", "Paid Online"].map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.methodChip, paymentMethod === m && styles.methodChipActive]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <Text style={[styles.methodChipText, paymentMethod === m && styles.methodChipTextActive]}>{m}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            {/* Stripe Charge Card button — only when Card is selected */}
            {!isFinished && paymentMethod === "Card" && (
              <Pressable
                style={({ pressed }) => [styles.chargeCardBtn, pressed && { opacity: 0.85 }] as ViewStyle[]}
                onPress={handleChargeCard}
                disabled={stripeLoading}
              >
                {stripeLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <IconSymbol name="creditcard.fill" size={16} color="#fff" />
                    <Text style={styles.chargeCardBtnText}>Charge Card via Stripe</Text>
                  </>
                )}
              </Pressable>
            )}
            {isFinished && totalBill && (
              <Text style={styles.finishedFieldText}>Paid via {paymentMethod}</Text>
            )}
          </View>
        </ExpandableSection>

        {/* Completed / Failed banner */}
        {phase === "completed" && (
          <View style={styles.completedBanner}>
            <IconSymbol name="checkmark.circle.fill" size={36} color="#22C55E" />
            <Text style={styles.completedTitle}>Job Completed Successfully</Text>
            <Text style={styles.completedSubtitle}>This work order has been marked as complete.</Text>
            <TouchableOpacity
              style={[styles.invoiceBtn, invoiceLoading && { opacity: 0.6 }]}
              onPress={handleDownloadInvoice}
              disabled={invoiceLoading}
            >
              {invoiceLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <IconSymbol name="doc.text.fill" size={15} color="#fff" />
                  <Text style={styles.invoiceBtnText}>Download Invoice PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
        {phase === "failed" && (
          <View style={[styles.completedBanner, { borderColor: "#EF444430" }]}>
            <IconSymbol name="xmark.circle.fill" size={36} color="#EF4444" />
            <Text style={[styles.completedTitle, { color: "#EF4444" }]}>Job Marked as Failed</Text>
            {selectedFailReason ? <Text style={styles.completedSubtitle}>Reason: {selectedFailReason}</Text> : null}
          </View>
        )}
      </ScrollView>

      {/* ── Bottom Action Bar ── */}
      {!isFinished && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          {phase === "pre_start" && (
            <SwipeStartBar onComplete={handleStart} loading={startTaskMutation.isPending} />
          )}
          {(phase === "en_route" || phase === "on_site") && (
            <OutcomeToggleBar
              onFail={handleFail}
              onSuccess={phase === "on_site" ? handleSuccess : () => handleArrive()}
              loadingFail={false}
              loadingSuccess={completeTaskMutation.isPending || arriveTaskMutation.isPending}
            />
          )}
        </View>
      )}

      {/* ── Fail Reason Modal ── */}
      <Modal
        visible={showFailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFailModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>Select Fail Reason</Text>
            <Text style={modalStyles.subtitle}>Choose the reason for marking this task as failed</Text>
            <ScrollView style={modalStyles.reasonList} showsVerticalScrollIndicator={false}>
              {FAIL_REASONS.map((reason) => (
                <Pressable
                  key={reason}
                  style={[
                    modalStyles.reasonRow,
                    selectedFailReason === reason && modalStyles.reasonRowSelected,
                  ]}
                  onPress={() => setSelectedFailReason(reason)}
                >
                  <View style={[
                    modalStyles.radioOuter,
                    selectedFailReason === reason && modalStyles.radioOuterSelected,
                  ]}>
                    {selectedFailReason === reason && <View style={modalStyles.radioInner} />}
                  </View>
                  <Text style={[
                    modalStyles.reasonText,
                    selectedFailReason === reason && modalStyles.reasonTextSelected,
                  ]}>{reason}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={modalStyles.btnRow}>
              <Pressable
                style={({ pressed }) => [modalStyles.cancelBtn, pressed && { opacity: 0.7 }] as ViewStyle[]}
                onPress={() => setShowFailModal(false)}
              >
                <Text style={modalStyles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [modalStyles.confirmBtn, pressed && { opacity: 0.85 }] as ViewStyle[]}
                onPress={confirmFail}
              >
                <Text style={modalStyles.confirmBtnText}>Confirm Failed</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centeredContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 } as ViewStyle,
  centeredText: { fontSize: 15, color: "#6B7280" } as TextStyle,
  backBtn: { backgroundColor: NVC_BLUE, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 } as ViewStyle,
  backBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" } as TextStyle,

  // Header
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  } as ViewStyle,
  headerBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  headerCenter: { flex: 1, alignItems: "center", gap: 3 } as ViewStyle,
  headerTime: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#1F2937" } as TextStyle,
  headerStatusRow: { flexDirection: "row", alignItems: "center", gap: 5 } as ViewStyle,
  headerStatusDot: { width: 7, height: 7, borderRadius: 3.5 } as ViewStyle,
  headerStatusText: { fontSize: 11, color: "#6B7280", fontFamily: "Inter_600SemiBold" } as TextStyle,
  headerMsgBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: NVC_BLUE + "12",
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  // Customer row
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  } as ViewStyle,
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NVC_BLUE,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  customerAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" } as TextStyle,
  customerInfo: { flex: 1 } as ViewStyle,
  customerName: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#111827" } as TextStyle,
  customerPhone: { fontSize: 12, color: "#9CA3AF", marginTop: 1 } as TextStyle,
  actionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  callCircle: { backgroundColor: "#22C55E" } as ViewStyle,
  navCircle: { backgroundColor: "#6366F1" } as ViewStyle,

  // Address row
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  } as ViewStyle,
  addressIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  addressText: { flex: 1, fontSize: 13, color: "#374151", fontFamily: "Inter_500Medium" } as TextStyle,

  // Milestone
  milestoneWrap: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  } as ViewStyle,

  // GPS banner
  gpsBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8B5CF608",
    borderBottomWidth: 1,
    borderBottomColor: "#8B5CF620",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  } as ViewStyle,
  gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" } as ViewStyle,
  gpsText: { flex: 1, fontSize: 12, color: "#6B7280", fontFamily: "Inter_500Medium" } as TextStyle,
  nearBadge: { backgroundColor: "#22C55E15", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 } as ViewStyle,
  nearBadgeText: { fontSize: 10, color: "#22C55E", fontFamily: "Inter_700Bold" } as TextStyle,
  manualArriveBtn: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  } as ViewStyle,
  manualArriveBtnText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" } as TextStyle,

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8, gap: 1 },

  // Description card
  descriptionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FED7AA",
  } as ViewStyle,
  descriptionText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 18 } as TextStyle,

  // Notes
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
  saveProgressBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: NVC_BLUE + "15",
    borderRadius: 8,
    marginTop: 6,
  } as ViewStyle,
  saveProgressText: { fontSize: 12, fontFamily: "Inter_700Bold", color: NVC_BLUE } as TextStyle,

  // Photos
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 } as ViewStyle,
  photoThumbWrap: { width: 76, height: 76, borderRadius: 10, overflow: "hidden", position: "relative" } as ViewStyle,
  photoThumb: { width: 76, height: 76 },
  photoRemoveBtn: {
    position: "absolute", top: 3, right: 3,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center", justifyContent: "center",
  } as ViewStyle,
  photoAddBtn: {
    width: 76, height: 76, borderRadius: 10,
    borderWidth: 1.5, borderColor: NVC_BLUE + "40", borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 4,
    backgroundColor: NVC_BLUE + "06",
  } as ViewStyle,
  photoAddText: { fontSize: 10, color: NVC_BLUE, fontFamily: "Inter_600SemiBold", textAlign: "center" } as TextStyle,

  // Bill
  billSection: { gap: 10 } as ViewStyle,
  billAmountRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, gap: 4,
  } as ViewStyle,
  billCurrency: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#374151" } as TextStyle,
  billAmountInput: { flex: 1, fontSize: 26, fontFamily: "Inter_700Bold", color: "#111827" } as TextStyle,
  billEditIcon: { padding: 4 } as ViewStyle,
  methodScroll: { flexGrow: 0 },
  methodChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#F3F4F6", marginRight: 6,
    borderWidth: 1, borderColor: "#E5E7EB",
  } as ViewStyle,
  methodChipActive: { backgroundColor: "#10B98115", borderColor: "#10B98140" } as ViewStyle,
  methodChipText: { fontSize: 12, color: "#6B7280", fontFamily: "Inter_500Medium" } as TextStyle,
  methodChipTextActive: { color: "#10B981", fontFamily: "Inter_700Bold" } as TextStyle,

  // Finished field
  finishedFieldText: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic" } as TextStyle,

  // Completed / failed banners
  completedBanner: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "#22C55E30",
  } as ViewStyle,
  completedTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#111827" } as TextStyle,
  completedSubtitle: { fontSize: 13, color: "#6B7280", textAlign: "center" } as TextStyle,

  // Bottom bar
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: "#F3F4F6",
    shadowColor: "#000", shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 8,
  } as ViewStyle,
  // Stripe charge card button
  chargeCardBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 10, paddingVertical: 12, paddingHorizontal: 20,
    backgroundColor: "#635BFF", borderRadius: 10,
  } as ViewStyle,
  chargeCardBtnText: {
    color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold",
  } as TextStyle,
  invoiceBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 14, paddingVertical: 12, paddingHorizontal: 24,
    backgroundColor: "#22C55E", borderRadius: 10,
  } as ViewStyle,
  invoiceBtnText: {
    color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold",
  } as TextStyle,
});

// Swipe bar styles
const swipeStyles = StyleSheet.create({
  track: {
    height: 62, borderRadius: 31,
    backgroundColor: "#8B5CF610",
    borderWidth: 1.5, borderColor: "#8B5CF630",
    overflow: "hidden", justifyContent: "center", alignItems: "center",
    position: "relative",
  } as ViewStyle,
  labelWrap: { position: "absolute", alignItems: "center", gap: 2 } as ViewStyle,
  label: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#8B5CF6", letterSpacing: 0.2 } as TextStyle,
  sublabel: { fontSize: 10, color: "#8B5CF680", fontFamily: "Inter_500Medium" } as TextStyle,
  thumb: {
    position: "absolute", left: 4,
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#8B5CF6", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  } as ViewStyle,
  chevrons: { position: "absolute", right: 14, flexDirection: "row", alignItems: "center" } as ViewStyle,
});

// Outcome toggle styles
const outcomeStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    height: 56,
  } as ViewStyle,
  failBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 12,
    backgroundColor: "#FEF2F2",
  } as ViewStyle,
  failDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" } as ViewStyle,
  failText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#EF4444" } as TextStyle,
  togglePill: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: "#E5E7EB",
    alignItems: "center", justifyContent: "center",
    marginHorizontal: 4,
  } as ViewStyle,
  toggleKnob: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#fff",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
  } as ViewStyle,
  successBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 12,
    backgroundColor: "#F0FDF4",
  } as ViewStyle,
  successText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#22C55E" } as TextStyle,
  successDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" } as ViewStyle,
});

// Section styles
const sectionStyles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  } as ViewStyle,
  title: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#6B7280",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  } as TextStyle,
  badge: {
    backgroundColor: NVC_BLUE + "15",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  } as ViewStyle,
  badgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: NVC_BLUE } as TextStyle,
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  } as ViewStyle,
});

// Signature styles
const sigStyles = StyleSheet.create({
  wrapper: { gap: 10 } as ViewStyle,
  hint: { fontSize: 12, color: "#9CA3AF" } as TextStyle,
  canvas: {
    height: 120,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  placeholder: { fontSize: 13, color: "#D1D5DB", fontStyle: "italic" } as TextStyle,
  pathsContainer: { alignItems: "center", justifyContent: "center", flex: 1 } as ViewStyle,
  drawingIndicator: { fontSize: 12, color: "#9CA3AF" } as TextStyle,
  btnRow: { flexDirection: "row", gap: 10, justifyContent: "flex-end" } as ViewStyle,
  clearBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, backgroundColor: "#F3F4F6",
  } as ViewStyle,
  clearText: { fontSize: 13, color: "#6B7280", fontFamily: "Inter_600SemiBold" } as TextStyle,
  saveBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, backgroundColor: "#F59E0B",
  } as ViewStyle,
  saveBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" } as TextStyle,
  capturedRow: { flexDirection: "row", alignItems: "center", gap: 8 } as ViewStyle,
  capturedText: { flex: 1, fontSize: 13, color: "#22C55E", fontFamily: "Inter_600SemiBold" } as TextStyle,
  resignBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: "#F3F4F6" } as ViewStyle,
  resignText: { fontSize: 12, color: "#6B7280" } as TextStyle,
});

// Milestone styles
const milestoneStyles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center" } as ViewStyle,
  step: { alignItems: "center", gap: 4 } as ViewStyle,
  dot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2,
  } as ViewStyle,
  label: { fontSize: 10, fontFamily: "Inter_600SemiBold", textAlign: "center" } as TextStyle,
  line: { flex: 1, height: 2, marginBottom: 14 } as ViewStyle,
});

// Modal styles
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  } as ViewStyle,
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 32,
    maxHeight: "75%",
  } as ViewStyle,
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 16,
  } as ViewStyle,
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#111827", marginBottom: 4 } as TextStyle,
  subtitle: { fontSize: 13, color: "#6B7280", marginBottom: 16 } as TextStyle,
  reasonList: { maxHeight: 320 },
  reasonRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  } as ViewStyle,
  reasonRowSelected: { backgroundColor: "#FEF2F2" } as ViewStyle,
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: "#D1D5DB",
    alignItems: "center", justifyContent: "center",
  } as ViewStyle,
  radioOuterSelected: { borderColor: "#EF4444" } as ViewStyle,
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF4444" } as ViewStyle,
  reasonText: { flex: 1, fontSize: 14, color: "#374151" } as TextStyle,
  reasonTextSelected: { color: "#EF4444", fontFamily: "Inter_600SemiBold" } as TextStyle,
  btnRow: { flexDirection: "row", gap: 10, marginTop: 20 } as ViewStyle,
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: "#F3F4F6", alignItems: "center",
  } as ViewStyle,
  cancelBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#6B7280" } as TextStyle,
  confirmBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: "#EF4444", alignItems: "center",
  } as ViewStyle,
  confirmBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" } as TextStyle,
});
