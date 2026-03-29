/**
 * Manus Runtime - Communication layer between Expo web app and parent container (next-agent-webapp)
 *
 * Simplified flow:
 * 1. initManusRuntime() called
 * 2. Send 'appDevServerReady' to parent to signal app is ready
 *
 * User will manually login via the app's login page - no automatic cookie injection.
 */

import { Platform } from "react-native";
import type { Metrics } from "react-native-safe-area-context";

// Debug logging with timestamps
const DEBUG = true;

const log = (msg: string) => {
  if (!DEBUG) return;
  const ts = new Date().toISOString();
  console.log(`[ManusRuntime ${ts}] ${msg}`);
};

type MessageType = "appDevServerReady";
type SafeAreaInsets = { top: number; right: number; bottom: number; left: number };
type SafeAreaCallback = (metrics: Metrics) => void;

interface SpacePreviewerMessage {
  type: "SpacePreviewerChannel";
  payload: {
    type: string;
    from: "container" | "content";
    to: "container" | "content";
    payload: Record<string, unknown>;
  };
}

function isInIframe(): boolean {
  if (Platform.OS !== "web") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isWeb(): boolean {
  return Platform.OS === "web";
}

function getParentOrigin(): string {
  // Detect parent origin from document.referrer or fall back to known domain pattern
  if (document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer);
      return referrerUrl.origin;
    } catch {
      // If referrer is invalid, fall back to detection
    }
  }

  // Fall back to detecting from window location if in iframe on same domain family
  try {
    const currentUrl = new URL(window.location.href);
    // If we're on a manus.computer subdomain, parent should also be on manus.computer
    if (currentUrl.hostname.endsWith("manus.computer")) {
      return "https://manus.computer";
    }
  } catch {
    // ignore
  }

  // Default fallback - require explicit origin validation in production
  return window.location.origin;
}

function isAllowedOrigin(origin: string): boolean {
  // Validate that the message origin is from an allowed parent
  try {
    const originUrl = new URL(origin);

    // Allow manus.computer and all subdomains
    if (originUrl.hostname === "manus.computer" || originUrl.hostname.endsWith(".manus.computer")) {
      return true;
    }

    // Allow manus.space deployed apps
    if (originUrl.hostname.endsWith(".manus.space")) {
      return true;
    }

    // Allow localhost for development
    if (originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1") {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function sendToParent(type: MessageType, payload: Record<string, unknown> = {}): void {
  if (!isWeb() || !isInIframe()) return;

  const message: SpacePreviewerMessage = {
    type: "SpacePreviewerChannel",
    payload: { type, from: "content", to: "container", payload },
  };

  const parentOrigin = getParentOrigin();
  window.parent.postMessage(message, parentOrigin);
  log(`Sent to parent (origin: ${parentOrigin}): ${type}`);
}

let initialized = false;
let safeAreaCallback: SafeAreaCallback | null = null;

function isValidInsets(payload: Record<string, unknown>): payload is SafeAreaInsets {
  return (
    typeof payload.top === "number" &&
    typeof payload.bottom === "number" &&
    typeof payload.left === "number" &&
    typeof payload.right === "number"
  );
}

function handleMessage(event: MessageEvent<unknown>): void {
  // Validate event.origin before processing
  if (!isAllowedOrigin(event.origin)) {
    log(`Rejected message from untrusted origin: ${event.origin}`);
    return;
  }

  const data = event.data as SpacePreviewerMessage | undefined;
  if (!data || data.type !== "SpacePreviewerChannel") return;

  const { payload } = data;
  if (!payload || payload.to !== "content") return;

  if (payload.type === "setSafeAreaInsets" && isValidInsets(payload.payload) && safeAreaCallback) {
    const insets = payload.payload;
    const frame = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    safeAreaCallback({ insets, frame });
    log(
      `Received safe area insets from parent: top=${insets.top}, bottom=${insets.bottom}, left=${insets.left}, right=${insets.right}`,
    );
  }
}

/**
 * Subscribe to safe area updates from the parent container.
 */
export function subscribeSafeAreaInsets(callback: SafeAreaCallback): () => void {
  safeAreaCallback = callback;
  return () => {
    if (safeAreaCallback === callback) {
      safeAreaCallback = null;
    }
  };
}

/**
 * Initialize Manus Runtime - just notifies parent that app is ready
 */
export function initManusRuntime(): void {
  if (!isWeb() || !isInIframe()) return;
  if (initialized) return;
  initialized = true;

  log("initManusRuntime called");
  window.addEventListener("message", handleMessage);
  sendToParent("appDevServerReady", {});
}

/**
 * Check if running inside preview iframe
 */
export function isRunningInPreviewIframe(): boolean {
  return isWeb() && isInIframe();
}
