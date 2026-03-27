# NVC360 UI/UX Design Research — 2024–2025 Best Practices

## Key Findings from Award-Winning Field Service & SaaS Apps

### Reference Apps Studied
- **Housecall Pro** (2025 update): Clean white/dark backgrounds, large bold stat numbers, blue primary CTAs, rounded cards with subtle shadows, employee list with avatar + status
- **Jobber** (2025): Minimal chrome, strong typographic hierarchy, green/blue status indicators, 48px+ button heights
- **Linear** (2025): Monochrome base + single accent, tight spacing, Inter font, 0.5px borders, no gradients on cards
- **Stripe Dashboard** (2025): Data-dense but readable, neutral grays, blue accents, clean table rows at 48px height
- **Notion** (2025 redesign): Increased line spacing, more breathing room, cleaner section headers

### 2025 Design Principles to Apply

#### Typography
- **Font**: Inter (system-ui fallback) — gold standard for SaaS/productivity
- **Scale**: 11/12/13/14/16/18/20/24/28/32px
- **Weights**: 400 body, 500 medium, 600 semibold, 700 bold, 800 display
- **Line height**: 1.4–1.6x for body, 1.2x for headings
- **Letter spacing**: -0.5 to -1px on large headings, +0.3–0.5px on uppercase labels

#### Colors (2025 Trend: Neutral + Single Accent)
- **Background**: Pure white (#FFFFFF) or very light gray (#F8FAFC) — NOT tinted lavender
- **Surface**: White with subtle shadow — NOT colored backgrounds on cards
- **Primary**: Deep blue (#1E6FBF) for navigation/primary actions
- **CTA/Active**: NVC Orange (#E85D04) for primary buttons and active states
- **Text**: Near-black (#0F172A) primary, slate (#64748B) secondary
- **Borders**: Ultra-subtle (#E2E8F0) — barely visible
- **Status colors**: Semantic only (green=success, amber=warning, red=error, blue=info)

#### Spacing (8pt Grid)
- Screen padding: 16–20px horizontal
- Card padding: 16–20px
- Section gaps: 12–16px
- Row heights: 48–56px for list items, 44px min for buttons

#### Cards & Elevation
- Border radius: 12px cards, 8px buttons, 6px chips/badges
- Shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04) — very subtle
- NO colored card backgrounds (except status accent bars)
- Border: 1px solid rgba(0,0,0,0.06) — barely visible

#### Buttons (2025 Standard)
- Height: 48px primary, 40px secondary, 36px compact
- Border radius: 10px (professional, not pill-shaped)
- Font: 15–16px, weight 600
- Primary: Solid fill (NVC Blue or Orange)
- Secondary: Outlined or ghost
- Destructive: Red fill or outlined red
- Icon buttons: 40×40px minimum

#### Lists & Tables
- Row height: 52–56px
- Avatar: 36–40px with 2-letter initials
- Status indicator: 8px dot or pill badge
- Chevron: Right-aligned, 12px, muted color
- Alternating rows: Very subtle (#F8FAFC alternate) or none

#### Mobile-Specific
- Tab bar: 60px height, icons 26px, labels 11px semibold
- Header: 52–56px, bold title 17–18px
- FAB: 56px circle, bottom-right, shadow
- Pull-to-refresh: Standard
- Empty states: Illustration + message + CTA button

### Gaps Found in Current NVC360 UI

1. **Background tint**: Current `#EFF2F7` lavender-white background feels dated — should be `#F8FAFC` or pure white
2. **Card shadows**: Current shadows are too strong/blue-tinted — should be neutral gray, very subtle
3. **Font sizes**: Some labels at 9–10px are too small for accessibility (min 11px)
4. **Touch targets**: Some icon buttons at 36×36px — should be 40×40px minimum
5. **Border radius inconsistency**: Mix of 10/12/16/20px — standardize to 12px cards, 10px buttons, 8px chips
6. **Status pills**: Current ones have too much opacity on background — should be cleaner
7. **Section headers**: All-caps labels at 11px are good but need more spacing above them
8. **Empty states**: Several screens have no empty state UI
9. **Loading states**: Some screens show blank content while loading
10. **Color overuse**: Too many different colors on same screen — should reduce to 2–3 semantic colors
