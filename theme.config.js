/** @type {const} */
const themeColors = {
  // NVC360 2025 Design System — Neutral-first, accent-driven
  // Inspired by Linear, Stripe, Housecall Pro 2025 standards
  // Light: clean white surfaces, slate text, blue/orange accents
  // Dark:  deep navy surfaces, near-white text, same accents
  primary:    { light: '#1E6FBF', dark: '#3B8FDF' },   // NVC royal-sky blue — nav, links, info
  background: { light: '#F8FAFC', dark: '#0B0F1A' },   // Clean off-white / deep navy
  surface:    { light: '#FFFFFF', dark: '#141824' },   // Pure white cards / elevated dark
  foreground: { light: '#0F172A', dark: '#F1F5F9' },   // Slate-950 / Slate-100
  muted:      { light: '#64748B', dark: '#94A3B8' },   // Slate-500 / Slate-400
  border:     { light: '#E2E8F0', dark: '#1E2537' },   // Slate-200 / dark border
  success:    { light: '#16A34A', dark: '#4ADE80' },
  warning:    { light: '#D97706', dark: '#FBBF24' },
  error:      { light: '#DC2626', dark: '#F87171' },
  accent:     { light: '#E85D04', dark: '#F97316' },   // NVC orange for CTAs
  tint:       { light: '#E85D04', dark: '#F97316' },   // Active tab = NVC orange
};

module.exports = { themeColors };
