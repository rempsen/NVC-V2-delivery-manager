# NVC360 2.0 — Enterprise B2B SaaS TODO

## Branding & Setup
- [x] NVC360 logo applied to all icon/splash assets
- [x] App name set to "NVC360 2.0"
- [x] Brand theme: black/white/orange NVC360 palette
- [x] Icon-symbol mappings for all required icons
- [x] Tab navigation: Dashboard, Tasks, Technicians, Settings

## Backend — Multi-Tenant Database Schema
- [x] tenants table (id, company_name, slug, plan, branding JSON, pricing JSON, sms_sender, email_domain, created_at)
- [x] users table (id, tenant_id, role: dispatcher|technician|admin, name, phone, email, password_hash)
- [x] technicians table (id, tenant_id, user_id, status, lat, lng, transport_type, hourly_rate, skills[])
- [x] tasks table (id, tenant_id, status, customer info, address, coords, technician_id, template_id, pricing_snapshot JSON, timestamps, geo_clock_in, geo_clock_out, distance_km, time_on_site_min)
- [x] messages table (id, tenant_id, task_id, sender_id, sender_type, content, read_at, created_at)
- [x] workflow_templates table (id, tenant_id, name, industry, fields JSON, is_default)
- [x] pricing_rules table (id, tenant_id, model: flat|hourly|per_km, base_rate, overtime_rate, overtime_after_min, per_km_rate, free_km_radius, custom_rules JSON)
- [x] location_history table (id, technician_id, task_id, lat, lng, speed, heading, timestamp)
- [x] Run db:push migration

## Backend — tRPC API Routes
- [x] tasks.list, tasks.getById, tasks.create, tasks.updateStatus
- [x] technicians.list, technicians.getById, technicians.updateLocation
- [x] messages.list (by task), messages.send
- [x] templates.list, templates.create
- [x] pricing.getRules, pricing.calculate
- [ ] auth.login, auth.logout, auth.me (multi-tenant JWT) — pending
- [ ] tenants.list, tenants.create, tenants.update — pending
- [ ] location.update (from mobile), location.getHistory — pending

## Mobile App — Dashboard Screen
- [x] Metric cards: Active, Completed, Unassigned, Online techs
- [x] Quick action buttons (New Order, Dispatcher, Technicians, Integrations, Super Admin, Track Demo)
- [x] Recent tasks list with status color bars
- [x] Online field team horizontal scroll
- [x] Pull-to-refresh

## Mobile App — Tasks Screen
- [x] FlatList with status filter tabs (All, Unassigned, En Route, On Site, Done)
- [x] Task rows with status color bar, priority badge, technician name

## Mobile App — Task Detail Screen
- [x] Customer info section
- [x] Live technician location map (simulated — Mapbox integration pending API key)
- [x] ETA display (auto-updates)
- [x] Status timeline (Created → Assigned → En Route → On Site → Complete)
- [x] Call customer / SMS customer buttons
- [x] Call tech / SMS tech buttons
- [x] In-app message thread button
- [x] Accept / Start / Complete / Decline action buttons
- [x] Share tracking link button

## Mobile App — Create Work Order Screen
- [x] Template selector (Delivery, Installation, Service Call, Inspection, Pickup, Custom)
- [x] Dynamic form fields from template
- [x] Customer name, phone, email fields
- [x] Job address field
- [x] Assign technician dropdown
- [x] Priority selector
- [x] Notes field

## Mobile App — Rich Work Order Execution Screen
- [x] Mandatory/optional checklist items
- [x] Photo capture (camera + gallery)
- [x] Voice note recording
- [x] File attachment support
- [x] Signature capture (locked to task record)
- [x] Payment authorization (amount + method)
- [x] Field notes by technician (flagged for dispatcher)
- [x] Dynamic template fields

## Mobile App — Technicians Screen
- [x] FlatList with online/offline filter
- [x] Call and SMS quick actions per technician
- [x] Status color-coded chips

## Mobile App — Agent Detail Screen
- [x] Profile header (avatar, name, phone, status)
- [x] Today's stats: distance, time on site, jobs
- [x] Active task card
- [x] Task history list
- [x] Send message / call / SMS buttons

## Mobile App — In-App Messaging Screen
- [x] Chat-style message thread per task
- [x] Dispatcher ↔ Technician messages
- [x] Send message input with keyboard avoidance
- [x] Message timestamps

## Mobile App — Settings Screen
- [x] Profile card (name, role)
- [x] Company settings section
- [x] Integrations section with links
- [x] Notifications toggles
- [x] Geo-clock toggle
- [x] NVC360 Admin section (Dispatcher, Super Admin, Track Demo links)
- [x] Dark mode toggle
- [x] Sign out

## Web Dispatcher Dashboard (Mobile Screen)
- [x] Live fleet map (simulated — Mapbox API key pending)
- [x] Technician chips with status dots
- [x] Click technician → side panel (stats, active task, message/view actions)
- [x] Task list with status filters and search
- [x] Priority badges and flagged note indicators
- [x] Integration shortcuts bar (QuickBooks, Xero, CompanyCam, Google Cal, Office 365)
- [x] New Work Order button

## NVC360 Super-Admin Dashboard (Mobile Screen)
- [x] Platform-level stats (Total Clients, Active, Technicians, Live Jobs, MRR)
- [x] Client list with plan/status badges, industry, subdomain
- [x] Search and plan filter
- [x] Create new client modal (name, subdomain, industry, plan)
- [x] Platform tools grid (Template Library, Pricing Engine, Analytics, API Keys, Billing, Support)

## Customer SMS Tracking Page
- [x] Public route: /track/[jobHash]
- [x] Branded header (client company name, logo, service name)
- [x] ETA countdown banner (live, animated)
- [x] Live map with animated technician marker and pulse
- [x] Job status progress steps (Dispatched → En Route → Arrived → Complete)
- [x] Technician card (name, rating, completed jobs, vehicle)
- [x] Call technician button (tel: link)
- [x] SMS technician button (sms: link)
- [x] In-app two-way chat (customer ↔ technician)
- [x] Simulated incoming message from technician
- [x] Unread message badge
- [x] Job details card
- [x] "Powered by NVC360" footer
- [x] White-labeled per client (company color, logo, name)

## Integrations Screen
- [x] QuickBooks — connect/disconnect
- [x] Xero — connect/disconnect
- [x] CompanyCam — connect/disconnect
- [x] Google Calendar — connect/disconnect
- [x] Office 365 Calendar — connect/disconnect
- [x] NVC360 Dispatch — shown as connected
- [x] Stripe Payments — connect/disconnect
- [x] Twilio SMS — shown as connected
- [x] Category filter tabs
- [x] Feature list per integration (expandable)
- [x] Data export (CSV + PDF)
- [x] NVC360 API key display

## Pending / Future Work
- [ ] Real Mapbox integration (requires API key)
- [ ] Real NVC360 API integration (requires API key)
- [ ] Real Twilio SMS (requires credentials)
- [ ] Auth: JWT login with tenant detection
- [ ] Geo-clock in/out with device GPS
- [ ] Push notifications (Expo Notifications)
- [ ] Real-time WebSocket location updates
- [ ] QuickBooks/Xero OAuth flows
- [ ] Google/Office 365 Calendar OAuth
- [ ] CompanyCam OAuth
- [ ] Stripe payment terminal integration
- [ ] PDF/CSV export backend implementation

## Authentication — Google & Apple OAuth
- [x] Login screen with Google Sign-In button
- [x] Login screen with Apple Sign-In button (iOS)
- [x] Email + password login fallback
- [x] Multi-tenant detection from login credentials
- [x] JWT stored in SecureStore after auth
- [x] Auto-redirect to correct tenant dashboard after login
- [x] Logout clears JWT and returns to login screen
- [x] Role-aware redirect: NVC360 admin → super-admin, dispatcher → dispatcher dashboard, technician → mobile app

## Notification Settings — Per-Milestone Controls
- [x] Notification settings screen accessible from Settings
- [x] Per-milestone toggle rows: Job Booked, Agent Assigned, Agent En Route, Agent Arrived, Job Completed, Job Failed, Follow-Up, Invoice Sent, Payment Received, Payment Overdue
- [x] Per-milestone channel selector: SMS / Email / Both / None
- [x] Twilio SMS integration config: Account SID, Auth Token, sender phone number
- [x] Email domain config: SMTP host, port, from address, from name (client's own domain)
- [x] Rich email template editor per milestone: subject, body (rich text), logo, brand color, footer
- [x] Preview email template before saving
- [x] Test send (send test SMS and test email)
- [x] White-labeled: each client's notifications come from their own domain and sender name

## Role & Permissions System
- [x] Permissions screen accessible from Settings
- [x] NVC360 Platform Roles:
  - [x] NVC Super Admin: full platform control, all clients, billing, system config
  - [x] NVC Project Manager: manage assigned clients, their databases, records, and users
  - [x] NVC Support: read-only access to client data for support purposes
- [x] Per-Client Company Roles:
  - [x] Company Admin: full company control (all employees, all jobs, billing, branding, templates)
  - [x] Divisional Manager: access to their division's jobs, employees, and reports
  - [x] Dispatcher: create/assign/manage tasks, view all technicians, messaging
  - [x] Field Technician: own tasks only, execute work orders, messaging, clock in/out
  - [x] Office Staff: view tasks and reports, no field execution access
- [x] Role editor: toggle permissions per role (granular feature flags)
- [x] Assign role to user from user management screen
- [x] Permission enforcement in UI (hide/show features based on role)

## Web Dashboard — Client & User Management (New)
- [x] NVC Super-Admin: full client list with search, filter by plan/industry/status
- [x] NVC Super-Admin: Create Client wizard (multi-step: company info → branding → plan → admin user)
- [x] NVC Super-Admin: Client detail page (overview, settings, users, templates, billing)
- [x] Client Dashboard: Customer management screen (list, create, edit, view customer record)
- [x] Client Dashboard: Employee management screen (list, create, edit, assign role/permissions)
- [x] Client Dashboard: Invite employee via email with role pre-assignment
- [x] Navigation: Super-Admin → Client drill-down → Customer/Employee management
- [x] Demo data: seed realistic clients, customers, and employees for testing

## Bug Fixes
- [x] Fix login.tsx crash: "Cannot find native module 'ExpoCryptoAES'" — removed expo-auth-session import, replaced with Expo Go-compatible handleGoogleSignIn function
- [ ] Fix white-on-white navigation header on agent detail and all sub-screens (back button invisible)
- [x] Fix white-on-white navigation headers (colors.accent undefined → use colors.primary)
- [x] Replace plain text date/time input in Create Work Order with native iOS spinning wheel date picker bottom sheet
- [ ] Build shared NVCHeader component (persistent, consistent across all screens, with back button + title + optional right action)
- [ ] Apply NVCHeader to all screens replacing ad-hoc headers
- [ ] Scale down hero/stat sections by 15-20% (font sizes, padding, card heights)

## Dashboard UI Revision (v2)
- [x] Push header below Dynamic Island / notch
- [x] 6 compact hero boxes in 3x2 grid (Active Jobs, Completed, Unassigned, Online Techs, En Route, Create New)
- [x] Create New bottom sheet with 7 categories
- [x] Tighter Quick Actions (smaller icons, more spacing)
- [x] Recent Work Orders: smaller rows, no WO number, show 4 items

## Technicians Screen Redesign (v2)
- [x] Compact row cards (~25% smaller) to fit 10 techs on screen
- [x] Status sort order: On Job → En Route → Available → On Break → Offline
- [x] Color-coded left-border accent + status pill per row (amber/purple/green/blue/gray)
- [x] Header color changed from orange to royal-sky blue (#1E6FBF)
- [x] NVC360 logo displayed in header
- [x] Filter tabs moved into blue header bar for visual cohesion
- [x] 10 mock technicians added for realistic density testing
- [x] Compact action buttons (28×28 rounded squares with status color tint)

## Workflow Template Builder
- [ ] Template Library screen: list all templates, search, filter by industry, create/duplicate/delete
- [ ] Industry starter templates: HVAC, IT Repair, Home Fitness, Telecom, Construction, Elder Care, Delivery, Inspection
- [ ] Template Editor: add/remove/reorder fields, field config panel (label, required, placeholder, options)
- [ ] All 20 field types: Short Text, Long Text, Number, Currency, Date, Time, DateTime, Dropdown, Multi-Select, Toggle, Checklist, Photo/Camera, File Attachment, Voice Note, Signature, GPS/Location, Barcode/QR, Rating/Score, Formula/Calculated, Conditional Logic
- [ ] Conditional logic: show/hide fields based on prior answer values
- [ ] Field preview mode: simulate filling out the form as a technician
- [ ] Wire Settings → Workflow Templates navigation

## Full App Restyle — NVC Blue Brand System
- [x] Both NVC360 logo variants (white-on-dark, black-transparent) copied to assets
- [x] Central brand constants file (NVC_BLUE #1E6FBF, NVC_ORANGE, NVC_LOGO_DARK, NVC_LOGO_LIGHT)
- [x] NVCHeader component updated: blue background, NVC logo, consistent across all sub-screens
- [x] Dashboard header: orange → blue, NVC logo added, NVC orange kept for CTA button
- [x] Work Orders tab header: orange → blue, NVC logo added
- [x] Settings tab header: orange → blue, NVC logo added, profile card blue
- [x] Tab bar active tint: set to NVC orange (matching screenshots)
- [x] All primary action buttons across app updated to NVC_BLUE
- [x] Customer Tracking screen company color updated to NVC blue
- [x] TypeScript: 0 errors | Tests: 56 passed

## Preview Switcher & Web Dashboard
- [x] Desktop Dispatcher Dashboard (/dashboard): full-width sidebar layout with map, work orders table, team panel
- [x] Preview switcher landing page (/preview): cards for Mobile App, Dispatcher Dashboard, Customer Portal
- [x] Customer-facing web portal (/track/demo-job-hash): public tracking page accessible via direct URL
- [x] All views accessible via public dev-server URLs
- [x] eas.json created with development/preview/production build profiles
- [x] app.config.ts: runtimeVersion policy added, EAS_BUILD_NO_EXPO_GO_WARNING suppressed

## Branding Cleanup — Remove All "NVC360" References
- [ ] Replace all "NVC360" text in source files (labels, comments, strings, imports)
- [ ] Replace "NVC360" in config files (package.json, app.config.ts, eas.json, etc.)
- [ ] Replace "NVC360" in todo.md and design.md
- [ ] Verify zero remaining instances with grep

## Live Data — Dispatcher Dashboard
- [ ] Connect work orders table to tRPC tasks.list API
- [ ] Connect fleet map pins to tRPC technicians.list API
- [ ] Connect team panel to live technician status from API
- [ ] Add loading states and error handling throughout dashboard
- [ ] Auto-refresh every 30 seconds for live feel

## /web Route & Customer Portal
- [ ] Add /web route that redirects to /preview (shareable branded entry point)
- [ ] Build full Customer Portal landing page (/portal/[jobHash])
- [ ] Portal: job history list with status timeline
- [ ] Portal: upcoming bookings section
- [ ] Portal: technician contact card (call, SMS, chat)
- [ ] Portal: branded header with client company logo/color
- [ ] Portal: mobile-responsive layout

## Apple-First Widget Design System (v3)
- [ ] Theme tokens: soft gradient background, pure white cards, shadow depth
- [ ] Desktop Dashboard: gradient mesh bg, white floating cards, gradient stat tiles, hover lift
- [ ] Mobile Dashboard: widget cards, gradient KPI tiles, clean typography
- [ ] Mobile Work Orders: white card rows, status color accents, no hard borders
- [ ] Mobile Technicians: compact white cards, status color left-border
- [ ] Settings, Task Detail, Create Order, Agent Detail, Messages: white card style
- [ ] NVCHeader: white background with NVC blue logo on light screens
- [ ] Customer Portal: clean white layout, gradient hero
- [ ] Preview Switcher: gradient background, white cards
- [ ] Login screen: gradient background, white card form

## Integrations Rebuild (v4)
- [x] Calendar: Google Calendar OAuth connect/disconnect
- [x] Calendar: Microsoft Outlook OAuth connect/disconnect
- [x] Field Documentation Storage: Dropbox connect/disconnect
- [x] Field Documentation Storage: Google Drive connect/disconnect
- [x] Field Documentation Storage: OneDrive connect/disconnect
- [x] Field Documentation Storage: Box connect/disconnect
- [x] Payments: QuickBooks Online connect/disconnect
- [x] Payments: Xero connect/disconnect
- [x] Payments: Export to CSV
- [x] Payments: Export to XLS
- [x] Communications: SMS number picker/configure
- [x] Communications: WhatsApp Business connect/disconnect
- [x] All integration categories: category filter tabs, connect/disconnect UI, feature lists

## Customers CRM Tab (v4)
- [x] Customers tab added to mobile tab bar (5th tab)
- [x] Customer list with search, status filter (VIP/Active/Prospect/Inactive)
- [x] Stats row: total clients, active/VIP count, total revenue
- [x] Customer row: company, contact, industry, jobs, revenue, terms
- [x] /customer/new — create new customer record
- [x] /customer/[id] — view/edit customer record
- [x] Full CRM form: company name, contact, email, phone, industry picker
- [x] Mailing address + physical address (same-as toggle)
- [x] City, province, postal code, country fields
- [x] Payment terms picker (COD, Net 15/30/45/60, Prepaid)
- [x] Status: Active, VIP, Prospect, Inactive
- [x] Tags: 13 classification tags (multi-select)
- [x] Internal notes
- [x] Create / Edit / Delete customer

## Technician Full Profile (v4)
- [x] 5-tab profile: Overview, Personal, Admin, Skills, Safety
- [x] Overview: hero card, stats, active jobs, quick info
- [x] Personal: first/last name, DOB, home address, emergency contact
- [x] Admin: employee ID, hire date, employment type, hourly/overtime rate
- [x] Admin: SIN/tax ID (secure), tax exempt toggle
- [x] Admin: bank name, transit number, account number (secure)
- [x] Skills: 18 core trade skills (multi-select grid)
- [x] Skills: 19 certifications (Red Seal, Journeyman, HVAC, etc.)
- [x] Skills: 16 industry tags
- [x] Skills: 9 department tags
- [x] Safety: 13 safety training courses (multi-select)
- [x] Safety: First Aid expiry, WHMIS expiry dates
- [x] Safety: medical/accommodation notes
- [x] Add Technician button in Technicians tab header → /agent/new
- [x] Create / Edit / Delete technician

## NVC Logo Fix (v4)
- [x] Processed logo to remove white bounding box
- [x] nvc-logo-transparent.png: white mark on transparent background
- [x] nvc-logo-dark-transparent.png: dark mark on transparent background
- [x] NVCHeader logo: smaller (26px), no border-radius, blends on blue header

## Missing Routes Fixed (v4)
- [x] /pricing — Pricing & Billing Rules screen created
- [x] /customer/new — Create customer route
- [x] /customer/[id] — Edit customer route
- [x] /agent/new — Create technician route (via agent/[id] with id=new)

## TypeScript Status
- [x] 0 TypeScript errors across entire project

## Web Dispatcher Dashboard — Full Rebuild (v4)
- [x] Persistent left sidebar with 6 sections: Dashboard, Work Orders, Technicians, Customers, Live Map, Reports
- [x] NVC logo + brand in sidebar header
- [x] User footer in sidebar (name, role, avatar)
- [x] Badge on Work Orders nav item showing unassigned count
- [x] Top bar with section title, date, notifications bell, New Order CTA
- [x] Dashboard section: 6 KPI stat cards with gradient backgrounds and depth shadows
- [x] Dashboard section: Two-column layout (map + recent orders left, quick actions + field team right)
- [x] Dashboard section: Live fleet map panel with tech pins and status colors
- [x] Dashboard section: Quick Actions 2x2 grid (New Order, Add Customer, Send Alert, Export)
- [x] Dashboard section: Field Team list with status dots, live job address, status pills
- [x] Work Orders section: full table with 7 columns, status/priority pills, search, filter tabs
- [x] Technicians section: full table with 8 columns, status filter tabs, KPI row
- [x] Technicians section: Add Technician button → full modal with 4 tabs (Personal, Admin/Pay, Skills/Certs, Safety)
- [x] Technicians section: Edit/Delete technician from table row
- [x] Customers section: full CRM table with 9 columns, status filter tabs, KPI row
- [x] Customers section: Add Customer button → full modal with 4 tabs (Company Info, Addresses, Billing/Tags, Notes)
- [x] Customers section: Edit/Delete customer from table row
- [x] Customers section: All CRM fields (company, contact, email, phone, industry, status, mailing address, physical address, terms, tags, notes)
- [x] Live Map section: full-screen fleet map panel
- [x] Reports section: KPI cards + placeholder with Export Data CTA
- [x] TypeScript: 0 errors across entire project

## Integrations Rebuild (v4)
- [x] Calendar: Google Calendar OAuth connect/disconnect
- [x] Calendar: Microsoft Outlook Calendar OAuth connect/disconnect
- [x] Storage: Dropbox connect/disconnect (field & dispatch docs)
- [x] Storage: Google Drive connect/disconnect
- [x] Storage: OneDrive connect/disconnect
- [x] Storage: Box connect/disconnect
- [x] Payments: QuickBooks Online connect/disconnect
- [x] Payments: Xero connect/disconnect
- [x] Payments: Export to CSV
- [x] Payments: Export to XLS
- [x] Communications: SMS number picker and configuration
- [x] Communications: WhatsApp Business connect/disconnect

## Customer CRM — Mobile
- [x] Customers tab added to mobile tab bar
- [x] Customer list with search, VIP/Active/Prospect/Inactive filter tabs, revenue stats
- [x] Customer detail/edit screen: all CRM fields, create/edit/delete
- [x] Customer detail: mailing address, physical address (with same-as toggle), notes, terms, industry, tags

## Technician Profile — Full (Mobile)
- [x] Technician detail rebuilt as 5-tab screen: Overview, Personal, Admin, Skills, Safety
- [x] Personal tab: name, DOB, address, emergency contact
- [x] Admin tab: employee ID, employment type, hourly/overtime rates, SIN, tax exempt, direct deposit banking
- [x] Skills tab: 18 trade skills, 19 certifications, 16 industries, 9 departments
- [x] Safety tab: 13 training courses with expiry dates, medical notes
- [x] Add Technician button in Technicians tab header

## Dashboard Contact Section Redesign
- [x] Replace "Quick Actions" with "Contact" section (3 buttons: Office, Colleague, Client)
- [x] Office button: routes call/message to predetermined admin/dispatcher number
- [x] Colleague button: opens category pop-up (4-5 tags), then person selector pop-up
- [x] Client button: opens category pop-up, then client selector pop-up
- [x] Remove Super Admin, Track Demo, Settings from quick actions area
- [x] Enlarge fleet map using freed space
- [x] Shrink 6 header stat icons by 20%
- [x] Move NVC logo below Dynamic Island (add top padding to header)

## Web Dashboard — Mission Control Redesign (v5)
- [x] Command strip: total jobs today, SLA risk count, revenue today, active techs, alerts
- [x] KPI cards: multi-line with trend indicator (▲▼ %), mini sparkline, secondary context
- [x] Layered elevation system: soft shadows, inner highlights, glassmorphism accents
- [x] Semantic color system: red=risk, orange=warning, green=healthy, blue=informational
- [x] AI Operational Insights panel: delay risk, underutilized techs, route optimization
- [x] Work Orders: status-based grouping, inline actions, expandable rows, SLA countdown
- [x] Field Team: live roster with animated status, utilization %, distance to job, quick actions
- [x] Map: command layer with heat zones, tech halos/pulse, route previews, hover cards
- [x] Typography: stronger contrast hierarchy, tighter font scaling
- [x] Spacing: reduce 20-30%, 8px grid discipline, 40% more visible data
- [x] Micro-interactions: card hover elevation, status pulse, smooth transitions
- [x] Light + dark mode variants

## Web Dashboard — Live Calendar Panel (v6)
- [ ] CalendarPanel component: mini month grid with prev/next navigation
- [ ] Single-click selects a date (highlights it)
- [ ] Double-click opens quick-add popover on selected date
- [ ] Quick-add popover: Note, Task, Event, Work Order type selector
- [ ] Form fields per type: title, description, time (for events/WO), assignee (for tasks/WO)
- [ ] Saved items appear as colored dots on calendar dates
- [ ] Selected date shows item list below calendar
- [ ] Calendar panel visible on Dashboard, Work Orders, Technicians, Customers sections
- [ ] Today always highlighted with accent color
- [ ] Items persist in local state across section switches

## Premium Design System Upgrade (Award-Winning Quality)
- [ ] Research award-winning dashboard design principles (Linear, Stripe, Vercel, Apple HIG)
- [ ] Define NVC360 design tokens: button height 44px min, padding scale, radius, shadow levels, typography scale
- [ ] Fix squished buttons: min-height 44px, horizontal padding 20-24px, proper font weight 600-700
- [ ] Apply consistent design system to all web dashboard screens (buttons, modals, forms, tables, cards)
- [ ] Apply consistent design system to all mobile screens (buttons, cards, forms, headers, tab bar, modals)
- [ ] Uniform UX across mobile and web platforms
- [ ] Calendar panel integration on web dashboard (Dashboard, Work Orders, Technicians, Customers sections)
