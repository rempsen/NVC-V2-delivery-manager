/**
 * NVC360 Brand Constants — Widget Design System
 * Apple-esque: soft off-white background, white floating cards, gradient stat tiles,
 * hover lift effects on web, white transparent NVC logo on dark surfaces.
 * Single source of truth — never hardcode brand colors inline.
 */

// ─── Primary Brand Colors ─────────────────────────────────────────────────────

/** Royal-sky blue: primary navigation, sidebar, header */
export const NVC_BLUE = "#1E6FBF";
/** Darker blue for sidebar background */
export const NVC_BLUE_DARK = "#163D6E";
/** Lighter blue for hover/active states */
export const NVC_BLUE_LIGHT = "#2E80D0";
/** NVC orange — CTAs, active tab indicator, Create New */
export const NVC_ORANGE = "#E85D04";
/** NVC orange pressed state */
export const NVC_ORANGE_PRESSED = "#C94E00";

// ─── Widget Background System ─────────────────────────────────────────────────

/** App-level background: soft off-white (light) / deep dark (dark) */
export const WIDGET_BG_LIGHT = "#EFF2F7";
export const WIDGET_BG_DARK = "#0F1117";

/** Card/widget surface: pure white (light) / elevated dark (dark) */
export const WIDGET_SURFACE_LIGHT = "#FFFFFF";
export const WIDGET_SURFACE_DARK = "#1A1E2A";

/** Card shadow for light mode — the "floating" effect */
export const WIDGET_SHADOW = {
  shadowColor: "#1E3A5F",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

/** Hover shadow for web — cards lift on hover */
export const WIDGET_SHADOW_HOVER = {
  shadowColor: "#1E3A5F",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.14,
  shadowRadius: 20,
  elevation: 8,
};

// ─── Gradient Stat Card Colors ────────────────────────────────────────────────
// Inspired by the reference dashboard: each stat tile has a distinct gradient

export const STAT_GRADIENTS = {
  blue:    ["#1E6FBF", "#2E80D0"] as [string, string],   // Active Jobs
  teal:    ["#0EA5A0", "#14B8B3"] as [string, string],   // Completed
  purple:  ["#7C3AED", "#9B5CF6"] as [string, string],   // Unassigned / Alerts
  orange:  ["#E85D04", "#F97316"] as [string, string],   // En Route / CTAs
  green:   ["#16A34A", "#22C55E"] as [string, string],   // Online Techs
  indigo:  ["#4338CA", "#6366F1"] as [string, string],   // Reports / Analytics
} as const;

// Flat fallback colors for platforms that don't support gradients
export const STAT_COLORS = {
  blue:   "#1E6FBF",
  teal:   "#0EA5A0",
  purple: "#7C3AED",
  orange: "#E85D04",
  green:  "#16A34A",
  indigo: "#4338CA",
} as const;

// ─── Status Colors ────────────────────────────────────────────────────────────

export const TECH_STATUS_COLORS_BRAND = {
  busy:     "#F59E0B",   // On Job — amber
  en_route: "#8B5CF6",   // En Route — purple
  online:   "#22C55E",   // Available — green
  on_break: "#3B82F6",   // On Break — blue
  offline:  "#9CA3AF",   // Offline — gray
} as const;

export const TECH_STATUS_LABELS_BRAND = {
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

// Keep legacy exports for backward compatibility
export const STATUS_COLORS = TECH_STATUS_COLORS_BRAND;
export const STATUS_LABELS = TECH_STATUS_LABELS_BRAND;

// ─── Logo Assets ──────────────────────────────────────────────────────────────

/**
 * White transparent logo — use on blue/dark backgrounds (sidebar, gradient cards, dark headers)
 * Processed to remove black background — pure white logo on transparent canvas.
 */
export const NVC_LOGO_WHITE = require("@/assets/images/nvc-logo-transparent.png");

/**
 * White-on-transparent logo for dark/colored headers — no bounding box.
 */
export const NVC_LOGO_DARK = require("@/assets/images/nvc-logo-transparent.png");

/**
 * Dark-on-transparent logo — use on white/light backgrounds.
 * Processed to remove white background — pure dark logo on transparent canvas.
 */
export const NVC_LOGO_LIGHT = require("@/assets/images/nvc-logo-dark-transparent.png");

/**
 * Returns the correct logo variant for the given background.
 * @param dark - true if background is dark/colored
 */
export function nvcLogo(dark: boolean) {
  return dark ? NVC_LOGO_WHITE : NVC_LOGO_LIGHT;
}

// ─── Typography Scale ─────────────────────────────────────────────────────────

export const TYPE = {
  h1:      { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5 },
  h2:      { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.3 },
  h3:      { fontSize: 18, fontWeight: "600" as const, letterSpacing: -0.2 },
  h4:      { fontSize: 15, fontWeight: "600" as const },
  body:    { fontSize: 14, fontWeight: "400" as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
  label:   { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.5 },
};

// ─── Spacing & Radius ─────────────────────────────────────────────────────────

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};
