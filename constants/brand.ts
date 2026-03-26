/**
 * NVC360 Brand Constants
 * Single source of truth for colors, logo assets, and design tokens.
 * Use these everywhere — never hardcode brand colors inline.
 */

// ─── Primary Brand Colors ─────────────────────────────────────────────────────

/** Royal-sky blue: the primary header/navigation color */
export const NVC_BLUE = "#1E6FBF";
/** Slightly darker blue for filter bars / secondary header zones */
export const NVC_BLUE_DARK = "#1A5FA8";
/** Lighter blue tint for hover/pressed states */
export const NVC_BLUE_LIGHT = "#2E80D0";
/** NVC orange — reserved for primary CTAs, active tab indicator, and Create New */
export const NVC_ORANGE = "#E85D04";
/** NVC orange tint for pressed states */
export const NVC_ORANGE_PRESSED = "#C94E00";

// ─── Status Colors ────────────────────────────────────────────────────────────

export const STATUS_COLORS = {
  busy:     "#F59E0B",   // On Job — amber
  en_route: "#8B5CF6",   // En Route — purple
  online:   "#22C55E",   // Available — green
  on_break: "#3B82F6",   // On Break — blue
  offline:  "#6B7280",   // Offline — gray
} as const;

export const STATUS_LABELS = {
  busy:     "On Job",
  en_route: "En Route",
  online:   "Available",
  on_break: "On Break",
  offline:  "Offline",
} as const;

/** Sort order for technician status (most active first) */
export const STATUS_SORT_ORDER: Record<string, number> = {
  busy: 0,
  en_route: 1,
  online: 2,
  on_break: 3,
  offline: 4,
};

// ─── Logo Assets ──────────────────────────────────────────────────────────────

/**
 * White-on-dark logo — use on blue/dark backgrounds (headers, dark cards)
 */
export const NVC_LOGO_DARK = require("@/assets/images/nvc-logo-dark.png");

/**
 * Black-on-transparent logo — use on white/light backgrounds
 */
export const NVC_LOGO_LIGHT = require("@/assets/images/nvc-logo-light.png");

/**
 * Returns the correct logo variant for the given background.
 * @param dark - true if background is dark/blue
 */
export function nvcLogo(dark: boolean) {
  return dark ? NVC_LOGO_DARK : NVC_LOGO_LIGHT;
}
