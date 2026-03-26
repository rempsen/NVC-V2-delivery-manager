/**
 * NVC360 Premium Design System
 *
 * Principles from award-winning products (Linear, Stripe, Vercel, Apple HIG):
 *  1. 8pt spacing grid — every value is a multiple of 4 or 8
 *  2. 44pt minimum touch targets (Apple HIG) — buttons are never "squished"
 *  3. 3-level elevation system — resting → hover → modal
 *  4. Consistent border-radius scale — buttons 10px, cards 16px, modals 20px
 *  5. Strong typographic hierarchy — Display / Body / Caption / Label
 *  6. Semantic color system — blue=info, green=success, amber=warning, red=danger
 *  7. Breathing room — generous padding creates premium feel
 *
 * Single source of truth — never hardcode values inline.
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

// ─── Elevation System (3 levels) ─────────────────────────────────────────────
// Level 1: Resting cards — subtle lift
export const SHADOW_SM = {
  shadowColor: "#1E3A5F",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
};

// Level 2: Interactive cards — visible depth
export const SHADOW_MD = {
  shadowColor: "#1E3A5F",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.09,
  shadowRadius: 12,
  elevation: 4,
};

// Level 3: Hover/focused state — lifted
export const SHADOW_LG = {
  shadowColor: "#1E3A5F",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.14,
  shadowRadius: 20,
  elevation: 8,
};

// Level 4: Modals/overlays — prominent
export const SHADOW_XL = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 20 },
  shadowOpacity: 0.25,
  shadowRadius: 40,
  elevation: 20,
};

// Legacy aliases
export const WIDGET_SHADOW = SHADOW_MD;
export const WIDGET_SHADOW_HOVER = SHADOW_LG;

// ─── Button Design System ─────────────────────────────────────────────────────
// Based on Apple HIG (44pt minimum) + Linear/Stripe conventions

export const BTN = {
  /** Primary CTA: full-color background, white text */
  primary: {
    height: 44,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
  },
  /** Secondary: surface background, border, colored text */
  secondary: {
    height: 44,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
  },
  /** Small: for inline actions, table rows */
  sm: {
    height: 34,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
  },
  /** Icon-only button: square, centered */
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  /** Icon-only small */
  iconSm: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  /** Pill/chip: for filter tabs, tags */
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
};

export const BTN_TEXT = {
  primary: { fontSize: 14, fontWeight: "700" as const, color: "#fff", letterSpacing: 0.1 },
  secondary: { fontSize: 14, fontWeight: "600" as const, letterSpacing: 0.1 },
  sm: { fontSize: 13, fontWeight: "600" as const, letterSpacing: 0.1 },
  pill: { fontSize: 12, fontWeight: "600" as const },
};

// ─── Form Field Design System ─────────────────────────────────────────────────

export const FIELD = {
  /** Standard input field */
  input: {
    height: 44,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    fontSize: 14,
  },
  /** Multiline textarea */
  textarea: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    fontSize: 14,
    minHeight: 88,
  },
  /** Field label */
  label: {
    fontSize: 12,
    fontWeight: "600" as const,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
    marginBottom: 6,
  },
};

// ─── Gradient Stat Card Colors ────────────────────────────────────────────────

export const STAT_GRADIENTS = {
  blue:    ["#1E6FBF", "#2E80D0"] as [string, string],
  teal:    ["#0EA5A0", "#14B8B3"] as [string, string],
  purple:  ["#7C3AED", "#9B5CF6"] as [string, string],
  orange:  ["#E85D04", "#F97316"] as [string, string],
  green:   ["#16A34A", "#22C55E"] as [string, string],
  indigo:  ["#4338CA", "#6366F1"] as [string, string],
  red:     ["#DC2626", "#EF4444"] as [string, string],
} as const;

export const STAT_COLORS = {
  blue:   "#1E6FBF",
  teal:   "#0EA5A0",
  purple: "#7C3AED",
  orange: "#E85D04",
  green:  "#16A34A",
  indigo: "#4338CA",
  red:    "#DC2626",
} as const;

// ─── Semantic Colors ──────────────────────────────────────────────────────────

export const SEMANTIC = {
  success:        "#22C55E",
  successBg:      "#F0FDF4",
  successBorder:  "#BBF7D0",
  warning:        "#F59E0B",
  warningBg:      "#FFFBEB",
  warningBorder:  "#FDE68A",
  error:          "#EF4444",
  errorBg:        "#FEF2F2",
  errorBorder:    "#FECACA",
  info:           "#3B82F6",
  infoBg:         "#EFF6FF",
  infoBorder:     "#BFDBFE",
} as const;

// ─── Status Colors ────────────────────────────────────────────────────────────

export const TECH_STATUS_COLORS_BRAND = {
  busy:     "#F59E0B",
  en_route: "#8B5CF6",
  online:   "#22C55E",
  on_break: "#3B82F6",
  offline:  "#9CA3AF",
} as const;

export const TECH_STATUS_LABELS_BRAND = {
  busy:     "On Job",
  en_route: "En Route",
  online:   "Available",
  on_break: "On Break",
  offline:  "Offline",
} as const;

export const STATUS_SORT_ORDER: Record<string, number> = {
  busy: 0,
  en_route: 1,
  online: 2,
  on_break: 3,
  offline: 4,
};

// Legacy aliases
export const STATUS_COLORS = TECH_STATUS_COLORS_BRAND;
export const STATUS_LABELS = TECH_STATUS_LABELS_BRAND;

// ─── Logo Assets ──────────────────────────────────────────────────────────────

export const NVC_LOGO_WHITE = require("@/assets/images/nvc-logo-transparent.png");
export const NVC_LOGO_DARK = require("@/assets/images/nvc-logo-transparent.png");
export const NVC_LOGO_LIGHT = require("@/assets/images/nvc-logo-dark-transparent.png");

export function nvcLogo(dark: boolean) {
  return dark ? NVC_LOGO_WHITE : NVC_LOGO_LIGHT;
}

// ─── Typography Scale ─────────────────────────────────────────────────────────
// Based on a 1.25 modular scale with Inter/SF Pro conventions

export const TYPE = {
  /** Page/section titles */
  h1:      { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.6, lineHeight: 34 },
  h2:      { fontSize: 22, fontWeight: "800" as const, letterSpacing: -0.4, lineHeight: 28 },
  h3:      { fontSize: 18, fontWeight: "700" as const, letterSpacing: -0.2, lineHeight: 24 },
  h4:      { fontSize: 15, fontWeight: "700" as const, lineHeight: 20 },
  /** Body text */
  body:    { fontSize: 14, fontWeight: "400" as const, lineHeight: 22 },
  bodyMd:  { fontSize: 14, fontWeight: "500" as const, lineHeight: 22 },
  bodySm:  { fontSize: 13, fontWeight: "400" as const, lineHeight: 20 },
  /** Supporting text */
  caption: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
  captionMd: { fontSize: 12, fontWeight: "500" as const, lineHeight: 16 },
  /** All-caps labels for form fields, section headers */
  label:   { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.5, textTransform: "uppercase" as const },
  /** Numeric display values */
  display: { fontSize: 32, fontWeight: "800" as const, letterSpacing: -1 },
  displayMd: { fontSize: 24, fontWeight: "800" as const, letterSpacing: -0.5 },
};

// ─── Spacing Scale (8pt grid) ─────────────────────────────────────────────────

export const SPACING = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
  xxxl: 48,
};

// ─── Border Radius Scale ──────────────────────────────────────────────────────

export const RADIUS = {
  xs:   4,   // Tags, badges
  sm:   8,   // Small elements, icon buttons
  md:   10,  // Buttons, inputs
  lg:   12,  // Chips, pills
  xl:   16,  // Cards
  xxl:  20,  // Modals, sheets
  full: 999, // Fully rounded
};

// ─── Card Design System ───────────────────────────────────────────────────────

export const CARD = {
  /** Standard content card */
  base: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    ...SHADOW_MD,
  },
  /** Compact card for lists */
  compact: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    ...SHADOW_SM,
  },
  /** Stat/metric card */
  stat: {
    borderRadius: 16,
    padding: 18,
    ...SHADOW_MD,
  },
};
