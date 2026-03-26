/**
 * Background Location Task
 *
 * This module defines the background GPS tracking task for NVC360 2.0.
 * It MUST be imported at the top level of the app entry point (app/_layout.tsx)
 * so the task is defined before any React components mount — this is required
 * by expo-task-manager for background execution to work correctly.
 *
 * When a technician is en-route or on-site, this task sends GPS coordinates
 * to the NVC360 server every 10 seconds (or every 10 meters of movement),
 * even when the app is backgrounded or the screen is locked.
 */

import { Platform } from "react-native";
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";

export const BACKGROUND_LOCATION_TASK = "nvc360-background-location";

// ─── Task Definition (must be in global scope) ────────────────────────────────
// This runs in a separate JS context when the app is in the background.
// We cannot use React hooks or tRPC here — we use fetch() directly.

if (Platform.OS !== "web") {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
    if (error) {
      console.error("[BGLocation] Task error:", error.message);
      return;
    }

    if (!data) return;

    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const latest = locations[locations.length - 1];
    const { latitude, longitude } = latest.coords;

    // Read the technician ID that was stored when the task was started
    // We use a global variable set by startBackgroundLocationTracking()
    const techId = (global as any).__nvc360_tech_id as number | undefined;
    const apiBase = (global as any).__nvc360_api_base as string | undefined;

    if (!techId || !apiBase) {
      console.warn("[BGLocation] No technician ID or API base — skipping update");
      return;
    }

    try {
      await fetch(`${apiBase}/trpc/technicians.updateLocation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: { id: techId, lat: latitude, lng: longitude },
        }),
      });
      console.log(`[BGLocation] Updated location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    } catch (err) {
      console.warn("[BGLocation] Failed to push location:", err);
    }
  });
}

// ─── Helper: Start Background Tracking ───────────────────────────────────────

export async function startBackgroundLocationTracking(
  technicianId: number,
  apiBaseUrl: string
): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    // Store context for the background task
    (global as any).__nvc360_tech_id = technicianId;
    (global as any).__nvc360_api_base = apiBaseUrl;

    // Check if already running
    const isRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      console.log("[BGLocation] Task already running");
      return true;
    }

    // Request background location permission
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== "granted") {
      console.warn("[BGLocation] Foreground location permission denied");
      return false;
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== "granted") {
      console.warn("[BGLocation] Background location permission denied — falling back to foreground only");
      // Return true anyway — foreground tracking is still active via watchPositionAsync
      return true;
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10_000,       // 10 seconds
      distanceInterval: 10,       // 10 meters
      showsBackgroundLocationIndicator: true,  // iOS blue bar
      foregroundService: {
        notificationTitle: "NVC360 — Job Tracking Active",
        notificationBody: "Your location is being shared with dispatch.",
        notificationColor: "#0052CC",
      },
      pausesUpdatesAutomatically: false,
    });

    console.log("[BGLocation] Background location tracking started for tech:", technicianId);
    return true;
  } catch (err) {
    console.error("[BGLocation] Failed to start background tracking:", err);
    return false;
  }
}

// ─── Helper: Stop Background Tracking ────────────────────────────────────────

export async function stopBackgroundLocationTracking(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const isRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log("[BGLocation] Background location tracking stopped");
    }
    // Clear stored context
    (global as any).__nvc360_tech_id = undefined;
    (global as any).__nvc360_api_base = undefined;
  } catch (err) {
    console.warn("[BGLocation] Error stopping background tracking:", err);
  }
}

// ─── Helper: Check if Task is Running ────────────────────────────────────────

export async function isBackgroundLocationRunning(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}
