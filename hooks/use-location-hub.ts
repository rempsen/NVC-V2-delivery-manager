/**
 * useLocationHub — WebSocket hook for real-time technician location updates
 *
 * Connects to the /ws/location WebSocket endpoint and subscribes to a tenant's
 * location stream. Calls onLocationUpdate whenever a technician's position changes.
 *
 * Usage:
 * ```tsx
 * useLocationHub({
 *   tenantId: 1,
 *   onLocationUpdate: (techId, lat, lng) => {
 *     setTechPositions(prev => ({ ...prev, [techId]: { lat, lng } }));
 *   },
 * });
 * ```
 */
import { useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";

interface LocationUpdate {
  type: "location_update";
  technicianId: number;
  lat: number;
  lng: number;
  timestamp: string;
}

interface StatusUpdate {
  type: "technician_status";
  technicianId: number;
  status: string;
}

interface UseLocationHubOptions {
  tenantId: number | null | undefined;
  enabled?: boolean;
  onLocationUpdate?: (technicianId: number, lat: number, lng: number) => void;
  onStatusChange?: (technicianId: number, status: string) => void;
}

// Derive the WebSocket URL from the current API base URL
function getWsUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const apiBase = process.env.EXPO_PUBLIC_API_URL ?? window.location.origin;
    // Convert http(s):// to ws(s)://
    return apiBase.replace(/^http/, "ws") + "/ws/location";
  }
  // Native: use the API URL from env or fallback to localhost
  const apiBase = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
  return apiBase.replace(/^http/, "ws") + "/ws/location";
}

export function useLocationHub({
  tenantId,
  enabled = true,
  onLocationUpdate,
  onStatusChange,
}: UseLocationHubOptions): void {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!tenantId || !enabled || !mountedRef.current) return;

    // WebSocket is not available in all environments
    if (typeof WebSocket === "undefined") return;

    try {
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "subscribe", tenantId }));
      };

      ws.onmessage = (event) => {
        try {
          const msg: LocationUpdate | StatusUpdate | { type: "ping" | "subscribed" } = JSON.parse(
            event.data,
          );
          if (msg.type === "location_update") {
            onLocationUpdate?.(msg.technicianId, msg.lat, msg.lng);
          } else if (msg.type === "technician_status") {
            onStatusChange?.(msg.technicianId, msg.status);
          } else if (msg.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        // Auto-reconnect after 5 seconds if still mounted
        if (mountedRef.current && enabled) {
          reconnectTimerRef.current = setTimeout(connect, 5_000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket connection failed — fall back to polling (handled by caller)
    }
  }, [tenantId, enabled, onLocationUpdate, onStatusChange]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);
}

/**
 * Send a location update through the WebSocket (from agent-task screen).
 * This is a one-shot fire-and-forget — no hook needed on the sender side.
 */
export function sendLocationViaWebSocket(
  ws: WebSocket | null,
  tenantId: number,
  technicianId: number,
  lat: number,
  lng: number,
): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(
    JSON.stringify({
      type: "location_update",
      tenantId,
      technicianId,
      lat,
      lng,
    }),
  );
}
