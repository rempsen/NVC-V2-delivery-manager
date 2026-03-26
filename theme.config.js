/** @type {const} */
const themeColors = {
  // NVC360 Apple-First Widget Design System
  // Light: soft lavender-white bg, pure white cards, NVC blue accents
  // Dark: deep navy bg, elevated dark cards, same blue accents
  primary:    { light: '#1E6FBF', dark: '#3B8FDF' },   // NVC royal-sky blue
  background: { light: '#F0F4FF', dark: '#0C0F1A' },   // Soft lavender-white / deep navy
  surface:    { light: '#FFFFFF', dark: '#161B2E' },   // Pure white cards / elevated dark
  foreground: { light: '#0A0F1E', dark: '#EEF2FF' },   // Near-black / near-white
  muted:      { light: '#64748B', dark: '#8899BB' },   // Slate muted
  border:     { light: '#E8EEFF', dark: '#1E2540' },   // Very subtle border
  success:    { light: '#16A34A', dark: '#4ADE80' },
  warning:    { light: '#D97706', dark: '#FBBF24' },
  error:      { light: '#DC2626', dark: '#F87171' },
  accent:     { light: '#E85D04', dark: '#F97316' },   // NVC orange for CTAs
  tint:       { light: '#E85D04', dark: '#F97316' },   // Active tab = NVC orange
};

module.exports = { themeColors };
