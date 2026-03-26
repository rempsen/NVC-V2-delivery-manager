/**
 * NVC360 Real-Time Location Hub
 *
 * WebSocket server that broadcasts technician GPS updates to all connected
 * dispatcher dashboards in real time. Replaces the 30-second polling interval
 * with instant push-on-change updates.
 *
 * Protocol:
 *   Client → Server: { type: "subscribe", tenantId: number }
 *   Client → Server: { type: "location_update", technicianId: number, tenantId: number, lat: number, lng: number }
 *   Server → Client: { type: "location_update", technicianId: number, lat: number, lng: number, timestamp: string }
 *   Server → Client: { type: "technician_status", technicianId: number, status: string }
 *   Server → Client: { type: "ping" }
 */
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

interface LocationMessage {
  type: "location_update";
  technicianId: number;
  tenantId: number;
  lat: number;
  lng: number;
}

interface SubscribeMessage {
  type: "subscribe";
  tenantId: number;
}

interface PongMessage {
  type: "pong";
}

type InboundMessage = LocationMessage | SubscribeMessage | PongMessage;

// Map of tenantId → Set of WebSocket clients subscribed to that tenant
const tenantSubscribers = new Map<number, Set<WebSocket>>();

// Map of WebSocket → tenantId (for cleanup on disconnect)
const clientTenants = new Map<WebSocket, number>();

export function initLocationHub(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/location" });

  wss.on("connection", (ws) => {
    // Keep-alive ping every 30s
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30_000);

    ws.on("message", (raw) => {
      try {
        const msg: InboundMessage = JSON.parse(raw.toString());

        if (msg.type === "subscribe") {
          const { tenantId } = msg;
          // Remove from previous tenant if re-subscribing
          const prevTenant = clientTenants.get(ws);
          if (prevTenant !== undefined && prevTenant !== tenantId) {
            tenantSubscribers.get(prevTenant)?.delete(ws);
          }
          // Add to new tenant
          if (!tenantSubscribers.has(tenantId)) {
            tenantSubscribers.set(tenantId, new Set());
          }
          tenantSubscribers.get(tenantId)!.add(ws);
          clientTenants.set(ws, tenantId);
          ws.send(JSON.stringify({ type: "subscribed", tenantId }));
        } else if (msg.type === "location_update") {
          // Broadcast to all other subscribers of the same tenant
          const { tenantId, technicianId, lat, lng } = msg;
          const payload = JSON.stringify({
            type: "location_update",
            technicianId,
            lat,
            lng,
            timestamp: new Date().toISOString(),
          });
          const subscribers = tenantSubscribers.get(tenantId);
          if (subscribers) {
            for (const client of subscribers) {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(payload);
              }
            }
          }
        }
        // pong: no-op, just keeps the connection alive
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on("close", () => {
      clearInterval(pingInterval);
      const tenantId = clientTenants.get(ws);
      if (tenantId !== undefined) {
        tenantSubscribers.get(tenantId)?.delete(ws);
      }
      clientTenants.delete(ws);
    });

    ws.on("error", () => {
      ws.terminate();
    });
  });

  console.log("[ws] Location hub initialized at /ws/location");
  return wss;
}

/**
 * Broadcast a location update from server-side mutations (e.g., tRPC updateLocation).
 * Call this after writing to the DB so dispatcher dashboards update instantly.
 */
export function broadcastLocationUpdate(
  tenantId: number,
  technicianId: number,
  lat: number,
  lng: number,
): void {
  const subscribers = tenantSubscribers.get(tenantId);
  if (!subscribers || subscribers.size === 0) return;
  const payload = JSON.stringify({
    type: "location_update",
    technicianId,
    lat,
    lng,
    timestamp: new Date().toISOString(),
  });
  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

/**
 * Broadcast a technician status change (online/offline/busy).
 */
export function broadcastStatusChange(
  tenantId: number,
  technicianId: number,
  status: string,
): void {
  const subscribers = tenantSubscribers.get(tenantId);
  if (!subscribers || subscribers.size === 0) return;
  const payload = JSON.stringify({ type: "technician_status", technicianId, status });
  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
