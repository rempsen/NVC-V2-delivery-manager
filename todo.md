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
- [x] auth.login, auth.logout, auth.me (multi-tenant JWT) — fixed cross-origin cookie flow
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
  - [x] Cross-origin cookie fix: emailLogin sets cookie via /api/auth/session on 3000-xxx domain with Domain=.manus.computer so auth guard passes
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
- [x] CalendarPanel component: mini month grid with prev/next navigation
- [x] Single-click selects a date (highlights it)
- [x] Quick-add form: Note, Task, Event, Work Order type selector
- [x] Form fields: title, description, start/end time, color picker
- [x] Saved items appear as colored dots on calendar dates
- [x] Selected date shows item list below calendar
- [x] Calendar section added to sidebar (between Customers and Live Map)
- [x] Today always highlighted with accent color
- [x] Items persist via tRPC calendar.list API

## Premium Design System Upgrade (Award-Winning Quality)
- [ ] Research award-winning dashboard design principles (Linear, Stripe, Vercel, Apple HIG)
- [ ] Define NVC360 design tokens: button height 44px min, padding scale, radius, shadow levels, typography scale
- [ ] Fix squished buttons: min-height 44px, horizontal padding 20-24px, proper font weight 600-700
- [ ] Apply consistent design system to all web dashboard screens (buttons, modals, forms, tables, cards)
- [ ] Apply consistent design system to all mobile screens (buttons, cards, forms, headers, tab bar, modals)
- [ ] Uniform UX across mobile and web platforms
- [ ] Calendar panel integration on web dashboard (Dashboard, Work Orders, Technicians, Customers sections)

## Audit Implementation — Phase 0: Security Foundation
- [x] Switch all tRPC routes from publicProcedure to protectedProcedure
- [x] Add tenant isolation middleware to all DB queries
- [x] Add express-rate-limit middleware (100 req/min per IP)
- [x] Replace CORS wildcard with explicit origin whitelist
- [x] Install bcrypt and hash passwords on registration/login
- [x] Encrypt Twilio credentials at rest (AES-256)
- [x] Add JWT issuance on login with RS256 signing

## Audit Implementation — Phase 0: Database Migrations
- [x] Add customers table to schema
- [x] Add calendarItems table to schema
- [x] Add integrationConfigs table to schema
- [x] Add fileAttachments table to schema
- [x] Add notifications table to schema
- [x] Add technicianSkills join table (normalize skills)
- [x] Run drizzle-kit migration

## Audit Implementation — Phase 1: Backend Routers
- [x] customers CRUD router (create, read, update, delete)
- [x] calendarItems CRUD router
- [x] Direct login mutation (email + password + bcrypt + JWT)
- [x] File upload router (pre-signed S3 URL)
- [x] tasks.getByHash for customer tracking
- [x] Export CSV/XLS router
- [x] Pricing calculator trigger on task completion
- [x] Webhook signature validation middleware

## Audit Implementation — Phase 1: Mobile Wiring
- [x] Wire Tasks screen to real tRPC backend (replace mock data)
- [x] Wire Agents/Technicians screen to real tRPC backend
- [x] Wire Customers screen to real tRPC backend
- [ ] Wire Dashboard metrics to real tRPC backend
- [ ] Wire Messages screen to real tRPC backend
- [ ] Wire Settings screen to real user profile
- [ ] JWT stored in expo-secure-store on login
- [ ] Session persists after app restart

## Audit Implementation — Phase 1: Push Notifications
- [ ] Register push token on login (getExpoPushTokenAsync)
- [ ] POST push token to technicians.updatePushToken
- [ ] FCM google-services.json configured in app.config.ts
- [ ] APNs key uploaded to EAS
- [ ] Foreground notification handler registered
- [ ] Background notification handler registered
- [ ] Deep link from notification to correct screen
- [ ] Push trigger on job assignment
- [ ] Push trigger on job status update

## Audit Implementation — Phase 1: Twilio SMS
- [ ] Install Twilio SDK on server
- [ ] SMS trigger on task create (customer confirmation)
- [ ] SMS trigger on task assign (technician alert)
- [ ] SMS trigger on task complete (customer receipt)
- [ ] Customer tracking link included in SMS
- [ ] Twilio credentials encrypted in DB

## Audit Implementation — Phase 1: Mapbox
- [ ] Mapbox SDK integrated on mobile (fleet map)
- [ ] Mapbox SDK integrated on web dashboard
- [ ] Location history polled every 30 seconds
- [ ] Customer tracking page shows live technician location
- [ ] Geocoding on address entry (address to lat/lng)

## Audit Implementation — Phase 1: Sentry
- [ ] @sentry/react-native installed and configured
- [ ] @sentry/node installed on server
- [ ] DSN configured via environment variable
- [ ] PII scrubbing enabled (beforeSend hook)
- [ ] Source maps uploaded on build

## Audit Implementation — Phase 2: Real-Time Updates
- [ ] tRPC WebSocket subscriptions or 30s polling on Work Orders
- [ ] tRPC WebSocket subscriptions or 30s polling on Technicians
- [ ] Status changes appear on dashboard within 5 seconds

## Audit Implementation — Phase 2: Offline Mode
- [ ] persistQueryClient with AsyncStorage
- [ ] Optimistic updates for status changes
- [ ] Sync on reconnect
- [ ] Offline banner using expo-network

## Audit Implementation — Phase 2: Calendar Integrations
- [ ] Google Calendar OAuth flow
- [ ] Microsoft Calendar OAuth flow (MSAL)
- [ ] integrationConfigs table stores OAuth tokens (encrypted)
- [ ] Work orders sync as calendar events on create/update

## Audit Implementation — Phase 2: Accounting Integrations
- [ ] QuickBooks OAuth flow
- [ ] Xero OAuth flow
- [ ] Invoice created in QuickBooks on task completion
- [ ] CSV export endpoint
- [ ] XLS export endpoint

## Audit Implementation — Phase 2: PIPEDA Compliance
- [ ] Consent screen on first app launch
- [ ] Privacy policy page at /privacy
- [ ] Terms of service page at /terms
- [ ] Account deletion endpoint (anonymize PII)
- [ ] consentAt column in users table
- [ ] Data retention policy documented

## Audit Implementation — Phase 2: CI/CD
- [ ] GitHub Actions: lint to typecheck to test to build
- [ ] Staging environment configuration
- [ ] Dependabot for dependency vulnerability scanning

## Audit Implementation — Phase 3: App Store Readiness
- [ ] EAS build production profile with signing certs
- [ ] App Store Connect listing created
- [ ] Google Play Console listing created
- [ ] App screenshots generated (6.7in, 6.1in, iPad)
- [ ] App description written (4000 chars)
- [ ] Background location justification written
- [ ] Privacy policy URL in app listings
- [ ] Support URL in app listings

## API Key Integration — Google Maps & Gemini AI
- [x] Validate Gemini API key (lightweight models.list call)
- [x] Validate Google Maps API key (Geocoding API ping)
- [x] Replace simulated fleet map with real Google Maps (web dashboard)
- [x] Replace simulated map on customer tracking page with real Google Maps
- [ ] Replace simulated map on mobile task detail screen with real Google Maps
- [x] Wire Gemini AI to operational insights panel (real AI analysis of live task/tech data)
- [x] Gemini AI: smart dispatch suggestions (which tech to assign based on proximity/skills)
- [x] Gemini AI: delay risk detection from task data

## API Key Update — New Google Maps Key
- [x] Store new Google Maps API key (AIzaSyBmW8a43bZiApE5ejzjBb92CbhHSQOAqjo) replacing old key
- [x] Validate new key reaches Google Maps API

## Sprint: Maps + Gemini SMS (Mar 26)
- [x] Validate Google Maps JavaScript API and Geocoding API are enabled for the new key
- [x] Wire mobile task detail screen map to real Google Maps (replace simulated map)
- [x] Add Gemini-powered SMS drafting to job create/update flow on web dashboard
- [x] Add SMS draft preview with edit-before-send capability

## Sprint: Integrations + Interactive Tasks + Live Maps (Mar 26)

### Map Standardization
- [x] Replace all remaining simulated/SVG maps with live GoogleMapView on web
- [x] Add react-native-maps on native (iOS/Android) for live map on mobile
- [x] Wire execute-task screen map to live Google Maps
- [x] Wire customer tracking page map to live Google Maps (already done on web, confirm native)
- [x] Confirm task detail screen map is live on both web and native

### Interactive Task Checklist
- [x] Add taskChecklists table to schema (id, taskId, title, items JSON, createdAt)
- [x] Add checklistItems table (id, checklistId, label, completed, completedBy, completedAt, signatureUrl, photoUrl)
- [x] Backend CRUD router for checklists and checklist items
- [x] Interactive checklist UI component (check/uncheck, photo attach, signature capture)
- [x] Checklist panel on task detail screen (mobile)
- [ ] Checklist panel on work order detail (web dashboard)
- [ ] Checklist templates per workflow type (Delivery, Installation, Service Call, Inspection)

### QuickBooks Integration
- [x] QuickBooks OAuth 2.0 flow (authorization URL, callback, token storage)
- [x] QuickBooks: sync completed jobs as invoices
- [x] QuickBooks: sync customers
- [ ] QuickBooks: webhook for payment status updates

### Xero Integration
- [x] Xero OAuth 2.0 flow (authorization URL, callback, token storage)
- [x] Xero: sync completed jobs as invoices
- [x] Xero: sync customers/contacts
- [ ] Xero: webhook for payment status updates

### CompanyCam Integration
- [x] CompanyCam OAuth 2.0 flow
- [x] CompanyCam: create project per job
- [x] CompanyCam: attach photos from job to CompanyCam project
- [ ] CompanyCam: pull photos back into job detail view

### Calendar Integrations
- [x] Google Calendar OAuth 2.0 flow (authorization URL, callback, token storage)
- [x] Google Calendar: create event when job is scheduled
- [x] Google Calendar: update event when job is rescheduled/completed
- [x] Office 365 / Outlook Calendar OAuth 2.0 flow (Microsoft identity platform)
- [x] Office 365: create calendar event per job
- [x] Office 365: update/delete event on job changes

### Apple Contacts
- [x] Apple Contacts: iCloud CardDAV connector (connect with Apple ID + app-specific password)
- [x] Apple Contacts: vCard import (import contacts as NVC360 customers)
- [x] Apple Contacts: vCard export (export customers as .vcf file)
- [ ] expo-contacts permission request on mobile (native device contacts)
- [ ] Apple Contacts: import contact to pre-fill customer form on mobile

### Integrations Settings UI
- [x] Integrations screen wired to real tRPC API (live connect/disconnect)
- [x] OAuth redirect handler for all providers (Express callback routes)
- [x] Apple Contacts credential form (Apple ID + app-specific password)
- [x] Connected account metadata shown (email, org name)
- [x] Disconnect persisted to database
- [ ] Sync status and last-synced timestamp per integration card
- [ ] Integration health check (token validity indicator)

## Sprint: 4-Tier Permission System & Multi-Tenant Admin (Mar 26)

### DB Schema
- [x] Add `role` column to users table: super_admin | nvc_manager | merchant_manager | agent
- [x] Add `is_nvc_platform` flag to tenants table (marks NVC's own platform tenant)
- [x] Add `merchant_settings` table (preferences, theme, notifications, SMS, email, templates per merchant)
- [x] Add `user_merchant_access` join table (NVC staff can access specific merchant tenants)
- [x] Add `suspended` / `suspendedAt` columns to tenants table
- [x] Add `passwordHash` column to tenantUsers table

### Backend — Roles & Guards
- [x] Define UserRole enum: super_admin, nvc_manager, merchant_manager, agent
- [x] Add `role` to JWT payload and ctx on every authenticated request
- [x] Create `superAdminProcedure` (super_admin only)
- [x] Create `nvcAdminProcedure` (super_admin | nvc_manager)
- [x] Create `merchantManagerProcedure` (merchant_manager | above, scoped to own tenant)
- [x] Ensure all existing routes enforce minimum agent-level auth

### Backend — NVC Admin Router
- [x] `admin.listMerchants` — list all tenants with stats (task count, agent count, last active)
- [x] `admin.getMerchant` — full merchant detail + settings
- [x] `admin.createMerchant` — create new merchant tenant + owner account (super_admin only)
- [x] `admin.updateMerchantSettings` — edit preferences, theme, notifications, SMS, email, templates
- [x] `admin.suspendMerchant` / `admin.reactivateMerchant` (super_admin only)
- [x] `admin.deleteMerchant` — soft-delete (super_admin only)
- [x] `admin.impersonateMerchant` — generate scoped JWT for merchant context (NVC staff only)
- [x] `admin.promoteUser` — change a user's role (super_admin only)
- [x] `admin.listPlatformUsers` — cross-tenant user list with role badges
- [x] `admin.getPlatformStats` — total merchants, users, tasks, completion rate

### NVC Super Admin Dashboard (Web)
- [x] `/admin` route — NVC-only, redirects non-admins to merchant dashboard
- [x] Overview tab: platform stats cards (merchants, users, tasks, completion rate)
- [x] Merchants tab: searchable/filterable list with plan/status filters and badges
- [x] Merchant detail panel: agents, task stats, settings, suspend/activate controls
- [x] Create Merchant form: company name, slug, industry, plan, owner credentials
- [x] Impersonate button: opens merchant dashboard in scoped session
- [x] Users tab: platform-wide user list with role badges

### Merchant Manager UI
- [x] `/merchant` route — merchant manager/admin only, redirects others
- [x] Team tab: list own agents/technicians, add new member with role selector
- [x] Customers tab: list own customers with search, add new customer
- [x] Settings tab: preferences, auto-allocation, notification templates, integrations shortcuts
- [x] All data strictly scoped to the authenticated merchant's tenantId

### Role-Aware Mobile Navigation
- [ ] Agent role: hide Customers tab, hide admin actions, show only assigned tasks
- [ ] Merchant Manager role: show Agents, Customers, Tasks tabs with full CRUD
- [ ] NVC Manager role: show all tabs + Super Admin link
- [ ] Super Admin role: show all tabs + Super Admin link + impersonate banner
- [ ] Role loaded from JWT on app start, persisted in SecureStore

## Sprint: Multi-Column Card Grid UI Redesign
- [ ] Technicians screen: replace full-width list rows with 3-4 column card grid
- [ ] Technicians screen: search bar (name, address, tag, ability)
- [ ] Technicians screen: filter tabs (All, On Job, En Route, Available, On Break, Offline)
- [ ] Technicians screen: team filter dropdown
- [ ] Customers screen: replace full-width list rows with 3-4 column card grid
- [ ] Customers screen: search bar (name, phone, address)
- [ ] Customers screen: filter by status/type dropdown

## UI Redesign — Multi-Column Card Grid (v5)
- [x] Technicians screen: replace full-width row list with responsive multi-column card grid (2 cols mobile, 3 cols tablet, 4 cols desktop)
- [x] Technicians screen: compact grid cards with avatar, status pill, skills chips, address, stats, action buttons
- [x] Technicians screen: advanced search bar (name, skill/tag, address, phone) with real-time filtering
- [x] Technicians screen: "Clear filters" shortcut when search + status filter active
- [x] Technicians screen: results count bar showing number of matching technicians
- [x] Customers screen: replace full-width row list with responsive multi-column card grid (2 cols mobile, 3 cols tablet, 4 cols desktop)
- [x] Customers screen: compact grid cards with avatar, status badge, company, contact, industry icon, address, phone, stats, tags, view button
- [x] Customers screen: advanced search bar (company name, contact name, phone, address, industry, tags) with real-time filtering
- [x] Customers screen: status filter bar (All, VIP, Active, Prospect, Inactive) with count badges
- [x] Customers screen: "Clear filters" shortcut when search + status filter active
- [x] TypeScript: 0 errors

## Sort Dropdown — Grid Screens (v5.1)
- [ ] Customers screen: sort dropdown above grid (Name A–Z, Revenue High–Low, Most Recent Job, Status)
- [ ] Customers screen: active sort indicator shown in dropdown button label
- [ ] Technicians screen: sort dropdown above grid (Name A–Z, Most Jobs Today, Status, Distance Today)
- [ ] Technicians screen: active sort indicator shown in dropdown button label

## App-Wide Multi-Column Layout Redesign (v5.2)
- [ ] Dispatcher screen: enlarge map to near-square aspect ratio (more height)
- [ ] Dispatcher screen: replace single-column tech chips with 3-column status-grouped panel (En Route / On Site / Available)
- [ ] Dispatcher screen: color-code each column header and cards by status
- [ ] Dispatcher screen: radio button sort within each column
- [ ] Tasks screen: replace full-width row list with compact card grid (2-3 columns)
- [ ] Settings screen: replace full-width single-column rows with multi-column grid sections
- [ ] Technicians screen: add sort dropdown (carry over from v5.1)

## Navigation & Filter Improvements (v5.3)
- [ ] Add persistent bottom tab bar to dispatcher screen and all non-tab screens (agent detail, task detail, etc.)
- [ ] Wire NVC logo tap in all headers to navigate to home/dispatcher screen
- [ ] Compact mobile filter chips on Tasks screen (smaller, color-coded, horizontal scroll)
- [ ] Compact mobile filter chips on Dispatcher screen (smaller, color-coded)
- [ ] Replace web dashboard tall filter buttons with small compact color-coded chips
- [ ] Web dashboard: maximize work order table space by moving filters to a compact top row

## 3-Panel Map-Dominant Layout (v5.4)
- [x] Web Dashboard: 3-panel full-screen dispatcher view (left: work orders list, center: large dominant map, right: technician roster)
- [x] Mobile Dispatcher: map-dominant layout with collapsible bottom drawer for work orders and right tech strip

## Sprint: Drag-to-Assign, Collapsible Panels, ETA Badges (v5.5)
- [x] Web Dashboard: collapsible left panel (work orders) with toggle button
- [x] Web Dashboard: collapsible right panel (technician roster) with toggle button
- [x] Web Dashboard: full-screen map mode when both panels are collapsed
- [x] Web Dashboard: drag-to-assign — drag work order card from left panel onto technician in right panel
- [x] Web Dashboard: drag-to-assign — visual drop target highlight on technician row when dragging
- [x] Web Dashboard: drag-to-assign — assignment confirmation toast on successful drop
- [x] Web Dashboard: live ETA countdown badges on technician map pins (minutes until scheduled job)
- [x] Web Dashboard: live ETA countdown badges on technician roster cards
- [x] Web Dashboard: ETA badge color-coded (green > 15min, yellow 5-15min, red < 5min)

## Sprint: DB Assignments, Route Optimization, Panel Persistence (v5.6)
- [x] Server: tRPC mutation `tasks.assign` — persist technicianId to DB
- [x] Server: tRPC query `tasks.list` — return tasks with assigned technician
- [x] Dashboard: wire drag-to-assign to tRPC mutation with optimistic UI + rollback on error
- [x] Dashboard: query invalidation after assignment so mobile dispatcher sees update in real time
- [x] Map: "Optimize Routes" button in map toolbar
- [x] Map: draw color-coded polylines from each tech's location to their assigned job stops in order
- [x] Map: toggle route overlay on/off
- [x] Dashboard: save left/right panel collapsed state to localStorage
- [x] Dashboard: restore panel state from localStorage on mount

## Sprint: Directions API, Push Notifications, Roster Unassign (v5.7)
- [x] Server: send Expo push notification to technician on tasks.assign mutation
- [x] Server: store pushToken on technician record; look it up during assign
- [x] Map: replace straight-line polylines with Google Directions API road-following routes
- [x] Map: show per-leg drive-time ETA on route polylines
- [x] Dashboard: "×" unassign button on each active job chip in right panel roster
- [x] Dashboard: reassign flow — click job chip to open technician picker modal

## Sprint: Notification History, ETA Auto-Refresh, Deep-Link (v5.8)
- [x] Server: store last 20 assignment push notifications in DB notifications table
- [x] Server: tRPC query notifications.dispatchHistory to fetch last 20 assignment notifications
- [x] Dashboard: bell icon in header with unread badge count
- [x] Dashboard: slide-over notification history panel showing last 20 push notifications
- [x] Dashboard: route ETA auto-refresh every 30 seconds when overlay is active
- [x] Mobile: handle push notification tap to deep-link to task detail screen
- [x] Mobile: register push token on app launch and save to server

## Sprint: Agent App Mode + Notification Improvements (v5.9)
- [ ] Dashboard: "Mark all as read" button in notification history panel clears unread badge
- [ ] Dashboard: notification filter chips (All / Assigned / Unassigned / Failed) in history panel
- [ ] Mobile: technician push token auto-save from profile screen to server
- [x] Mobile: fix Dynamic Island safe area — increase top padding on all screens
- [x] Mobile: role-based routing — agent role sees agent home, manager role sees dispatcher
- [x] Mobile: Agent home screen — assigned jobs list, no map, status summary cards
- [x] Mobile: Agent task detail — swipe-to-start bar at bottom triggering SMS to customer
- [x] Mobile: Agent task detail — geolocation arrival detection at 20m threshold
- [x] Mobile: Agent task detail — notes (mandatory/optional), photo capture, client record
- [x] Mobile: Agent task detail — client signature capture
- [x] Mobile: Agent task detail — payment processing (if job configured)
- [x] Mobile: Agent task detail — swipe-to-complete bar marking job done

## Sprint: Role Routing, Signature Canvas, Twilio SMS, Tookan-Style Task UI (v6.0)
- [x] Mobile: role-based routing at login — technician JWT role → /agent-home, dispatcher/admin → /(tabs)
- [x] Mobile: remove fleet map (react-native-maps) from all agent/technician-facing screens
- [x] Mobile: agent task screen — Tookan-style header (back, task ref, call customer, navigate button)
- [x] Mobile: agent task screen — collapsed expandable sections: Notes (+), Signature (+), Images (+), Total Bill
- [x] Mobile: agent task screen — Failed / Successful toggle bar at bottom (replaces swipe-to-complete)
- [x] Mobile: agent task screen — fail reason picker (predefined list: Jobsite Not Ready, Materials Not Ready, Scheduling Problem, Site Access Issue, Client Not Home, Personal Issue, Issue with Materials)
- [x] Mobile: agent task screen — real touch-drawing signature canvas (SVG path capture)
- [x] Mobile: agent task screen — image thumbnails grid inside Images section
- [x] Mobile: agent task screen — Total Bill editable amount field inside collapsed section
- [x] Server: Twilio SMS — wire startTask mutation to send real SMS via Twilio API
- [x] Server: Twilio SMS — wire arriveTask mutation to send real SMS via Twilio API
- [x] Server: read Twilio credentials from tenant notification settings (accountSid, authToken, fromPhone)

## Sprint: Compact Stat Cards, Login Screen (v6.1)
- [x] UI: Integrations page — stat cards (Connected/Available/Categories) compact grid, not full-width
- [x] UI: Customers page — statsStrip items compact grid, not full-width flex-1
- [x] UI: All pages — audit and remove any remaining full-width button patterns
- [x] UI: Add login screen to web dashboard (email + password form, role-based routing)

## Sprint v6.2: Map-First Dashboard Redesign

- [ ] Dashboard: full-bleed map as primary focal point (~70% of screen width on web)
- [ ] Dashboard: collapsible left panel — technician list with status badges, search, filter
- [ ] Dashboard: floating map controls — zoom +/-, map style toggle, center-on-fleet button
- [ ] Dashboard: floating top bar — date/time, quick stats, Create Job button
- [ ] Dashboard: right detail panel — slides in when technician or job marker is tapped
- [ ] Dashboard: technician markers on map with color-coded status dots
- [ ] Dashboard: job site markers on map with task number badges
- [ ] Technicians tab: same map-first layout with left list panel and right detail panel
- [ ] Both views: map fills remaining screen height below nav bar

## Sprint v6.3: Workflow Templates, Bottom Nav, Dispatch View

- [ ] Fix: agents.tsx StyleSheet.create detached from component — restore full styles block
- [ ] Nav: update bottom tab bar to 5 tabs — Dashboard (Dispatch), Work Orders, Technicians, Customers, Settings
- [ ] Nav: rename Dashboard tab label to "Dispatch" since it is the map-first dispatch view
- [ ] Work Orders: workflow template selector at top of New Work Order screen (Delivery, Installation, Service Call, Inspection, Pickup, Custom)
- [ ] Work Orders: each workflow template loads dynamic fields — e.g. Installation adds Equipment Type, Serial Number, Warranty; Service Call adds Issue Description, Priority; Delivery adds Package Count, Vehicle Type
- [ ] Work Orders: workflow templates stored in Settings and admin-configurable
- [ ] Work Orders: technician sees template-specific checklist fields inside the agent task screen

## Settings Full Audit — Fix All Broken Buttons

- [ ] Fix profile card edit button → open edit profile modal
- [ ] Create Company Profile sub-screen (name, logo, address, timezone, phone, website)
- [ ] Create White-Label Branding sub-screen (primary color, logo URL, domain, sender name)
- [ ] Create Email SMTP sub-screen (host, port, username, password, from name, test send)
- [ ] Create Mapbox API sub-screen (API key input, test connection, map preview)
- [ ] Create Distance Tracking sub-screen (GPS mode, accuracy threshold, auto-detect toggle)
- [ ] Create Time-on-Site sub-screen (enable toggle, minimum threshold, alert threshold)
- [ ] Fix Google Calendar OAuth: show proper setup instructions when CLIENT_ID not configured
- [ ] Fix Microsoft 365 OAuth: same treatment
- [ ] Fix QuickBooks / Xero / CompanyCam OAuth: same treatment
- [ ] Verify all Settings → sub-screen navigation works (Notification Settings, Permissions, Pricing, Dispatcher, Super Admin, Track)
- [ ] Wire workflow templates store to create-task form (completed in previous session)

## Settings Full Audit — Phase 2 (Mar 26 2026)

- [x] Company Profile sub-screen created (edit company name, logo, address, timezone, industry)
- [x] White-Label Branding sub-screen created (primary color, logo, domain, font, powered-by toggle)
- [x] Email SMTP sub-screen created (host, port, username, password, TLS, test send)
- [x] Mapbox API sub-screen created (API key input, test connection, usage stats)
- [x] Distance Tracking sub-screen created (GPS accuracy, mode, idle threshold, route recording)
- [x] Time-on-Site sub-screen created (enable/disable, minimum threshold, auto clock-out)
- [x] Edit Profile sub-screen created (name, phone, email, role, photo upload)
- [x] Settings profile card tap → Edit Profile screen
- [x] All Settings tiles wired to correct sub-screens (no more empty onPress)
- [x] Pricing & Billing: Add Rule button → full rule editor modal (name, base rate, per-hour, colour)
- [x] Pricing & Billing: Edit/Delete buttons on each billing rule card
- [x] Roles & Permissions: Create Custom Role modal (name, description, base role, toggle all permissions)
- [x] Super-Admin Platform Tools: Template Library → workflow-templates, Pricing Engine → pricing, API Keys → integrations, Billing → pricing, Usage Analytics/Support → informative alert
- [x] Super-Admin Client detail: Notification Settings/Workflow Templates/Pricing Rules/Integrations → real screens; Suspend Client → confirmation dialog
- [x] Dispatcher Integration Shortcuts: all 5 chips → integrations screen
- [x] Task Detail: Assign Technician button → agents screen (was empty)
- [x] Agent Task: billing pencil icon → haptic feedback (TextInput already editable)
- [x] Zero empty onPress(() => {}) handlers remaining in entire app
- [x] TypeScript: 0 errors

## Google Maps Full Integration

- [x] Store GOOGLE_OAUTH_CLIENT_ID secret (fixes Google Calendar OAuth)
- [x] Store MAPBOX_ACCESS_TOKEN secret (Mapbox maps now configured)
- [x] Store GOOGLE_MAPS_API_KEY (AIzaSyBmW8a43bZiApE5ejzjBb92CbhHSQOAqjo) — validated 7/7 tests pass
- [x] Add server-side maps router: Distance Matrix API (live ETAs), Routes API (optimized sequencing)
- [x] Upgrade Dispatcher Dashboard: live ETA badges on technician map markers
- [x] Upgrade Dispatcher Dashboard: traffic-aware road-following route polylines on fleet map
- [x] Add "Optimize Routes" button in Dispatcher that reorders tasks by travel time
- [x] Wire route optimization results back to polylines and ETA badges
- [x] Mapbox API settings screen pre-populates from server config (shows Configured status)
- [x] TypeScript: 0 errors, 94/95 tests pass

## Sprint: Routes API v2, Live GPS, Notification Panel (Mar 26)

- [ ] Validate Google Routes API v2 is enabled for AIzaSy... key
- [ ] Update mapsRouter.optimizeRoutes to use Routes API v2 (computeRoutes endpoint) with traffic awareness
- [ ] Add fallback: if Routes API returns 403/disabled, fall back to Directions API with waypoint optimization
- [ ] Wire mobile agent app GPS → location.update tRPC endpoint (real-time polling every 30s)
- [ ] Fleet map reads live technician locations from DB instead of MOCK_TECHNICIANS
- [ ] Dispatcher dashboard auto-refreshes technician positions every 30s
- [ ] Notification history panel: "Mark all as read" button clears unread badge
- [ ] Notification history panel: filter chips (All / Assigned / Unassigned / Failed)

## Sprint: Routes API v2, Live GPS, Notification Panel — Completed

- [x] Validated Google Routes API v2 computeRoutes + computeRouteMatrix — both live on AIzaSy key
- [x] mapsRouter already uses Routes API v2 natively with TRAFFIC_AWARE routing and optimizeWaypointOrder
- [x] Fixed liveTechnicians mapping in dashboard — now reads nested { tech, user } structure correctly
- [x] Added updateLocation mutation to agent-task screen — GPS pushed to server every 5s/5m while en_route
- [x] Added pushLocationToServer callback — calls trpc.technicians.updateLocation with live lat/lng
- [x] Added Mark All As Read button to notification panel header in dashboard
- [x] TypeScript: 0 errors | Tests: 94 passed, 1 skipped (95 total)

## Sprint: Hardening — Twilio, NVC360 API, Background GPS, Invoice PDF (Mar 26)

- [x] Twilio credentials validated live — NVC360 Twilio account confirmed active (+14849467992)
- [x] SMS (Twilio) settings tile wired to /settings/sms-twilio sub-screen
- [x] NVC360 Dispatch API settings sub-screen created (/settings/nvc360-api) — API key, endpoint, fleet/merchant IDs, sync options, test connection
- [x] Dispatch API settings tile wired to /settings/nvc360-api (was routing to /integrations)
- [x] expo-task-manager installed and configured
- [x] Background GPS tracking module created (lib/background-location-task.ts) — defines BACKGROUND_LOCATION_TASK, startBackgroundLocationTracking(), stopBackgroundLocationTracking()
- [x] app.config.ts updated: isIosBackgroundLocationEnabled, isAndroidBackgroundLocationEnabled, locationAlwaysPermission, expo-task-manager plugin added
- [x] Background task imported at global scope in app/_layout.tsx (before any component mounts)
- [x] agent-task/[id].tsx: startLocationTracking() now also starts background GPS task via startBackgroundLocationTracking()
- [x] agent-task/[id].tsx: stopLocationTracking() now also stops background GPS task
- [x] expo-file-system and expo-sharing installed
- [x] Invoice PDF export button added to completed job banner in agent-task/[id].tsx
- [x] handleDownloadInvoice: fetches PDF from server, triggers browser download on web, share sheet on native
- [x] TypeScript: 0 errors | Tests: 98 passed, 1 skipped (99 total)

## Sprint: WebSocket GPS, OAuth Integrations, Notification Test-Send (Mar 26)

- [x] QuickBooks: server OAuth callback route (/oauth/quickbooks/callback) — exchange code for tokens, store in DB
- [x] QuickBooks: mobile Connect button opens real Intuit OAuth URL via openAuthSessionAsync (in-app browser)
- [x] QuickBooks: show connected status after successful OAuth (store access_token, refresh_token per tenant)
- [x] Google Calendar: server OAuth callback route (/oauth/google-calendar/callback) — exchange code for tokens
- [x] Google Calendar: mobile Connect button opens real Google OAuth URL via openAuthSessionAsync (in-app browser)
- [x] Google Calendar: show connected status after successful OAuth
- [x] WebSocket server: broadcast technician location updates to subscribed dispatcher clients (locationHub.ts)
- [x] Fleet map (dashboard + dispatcher): subscribe to WebSocket for real-time technician position updates
- [x] Agent home screen: start background GPS tracking (expo-task-manager) when technician has active job
- [x] Notification Settings: wire "Send Test SMS" button to real Twilio API (trpc.notifications.sendTestSms)
- [x] Notification Settings: wire "Send Test Email" button to real SMTP nodemailer (trpc.notifications.sendTestEmail)
- [x] API_BASE_URL secret set so OAuth redirect URIs point to correct deployed server
- [x] nodemailer installed; server/email.ts module created with resolveSmtpCredentials + sendTestEmail
- [x] TypeScript: 0 errors | Tests: 105 passed, 1 skipped (106 total)

## Sprint: Super-Admin UI Fixes (Mar 26)

- [x] Platform Tools: shrink cards to compact small square icon buttons (72px, 3-column grid)
- [x] Subscription Plans in Billing screen: 3-column square card layout, tap to edit name/price/features
- [x] Invoice Settings in Billing screen: all rows editable (tap → select from options or free-text input)
- [x] Usage Analytics button: wired to new /super-admin/analytics screen with period selector + sparklines + top clients
- [x] Support button: opens https://nvc360.com/support/ in browser via Linking.openURL
- [x] Billing: dedicated /super-admin/billing screen (plans + invoice settings + payment methods)
- [x] Pricing Logic: dedicated /super-admin/pricing-logic screen (billing rules + pricing models + travel/distance)
- [x] TypeScript: 0 errors | Tests: 105 passed, 1 skipped (106 total)

## Sprint: SMTP, Platform Tools Position, List/Card Toggle (Mar 26)

- [x] Set SMTP secrets: smtp.gmail.com:587, dan@nvc360.com, app-specific password (verified 324ms)
- [x] Super-Admin dashboard: Platform Tools moved to top of ScrollView (above search/filter/clients)
- [x] Super-Admin clients list: list/card toggle — list=compact rows, card=2-col grid with avatar+plan+MRR
- [x] Technicians screen: list/card toggle — card=full TechGridCard FlatList, list=map+panel layout
- [x] Customer management screen: list/card toggle — list=compact rows with status+revenue, card=responsive grid
- [x] TypeScript: 0 errors | Tests: 106 passed, 1 skipped (107 total)

## Sprint: Demo User Account Fixes (Mar 26)

- [x] Root cause identified: web login had no server-side session cookie path (only saved to SecureStore on native)
- [x] Added auth.emailLogin tRPC mutation with real JWT session cookie (bcrypt password verify + res.cookie)
- [x] Updated login.tsx to call real emailLogin mutation for both manual and demo-chip logins
- [x] All 4 demo accounts verified: admin@nvc360.com, dispatch@acmehvac.com, tech@acmehvac.com, admin@plumbpro.com
- [x] Wrong password and unknown email correctly rejected
- [x] TypeScript: 0 errors | Tests: 112 passed, 1 skipped (113 total)

## Sprint: Login Fix + Auth Guard + Forgot Password (Mar 26)

- [ ] Fix web login redirect loop (3 of 4 demo accounts bounce back to login)
- [ ] Persist auth guard on web using trpc.auth.me instead of SecureStore
- [ ] Add pm@nvc360.com demo chip to login screen
- [ ] Add auth.requestPasswordReset tRPC mutation (sends reset link via SMTP)
- [ ] Add Forgot Password UI screen with email input and confirmation

## Feature Sprint — Forgot Password, Employee Invite, Live Map

### Forgot Password Flow
- [x] Backend: auth.forgotPassword tRPC mutation (generate reset token, send email via SMTP)
- [x] Backend: auth.resetPassword tRPC mutation (validate token, update password hash)
- [x] Frontend: wire Forgot Password button in login.tsx to open reset modal
- [x] Frontend: reset modal with email input → calls forgotPassword → shows confirmation
- [ ] Frontend: /reset-password?token=xxx deep-link screen (pending — token delivered via email link)

### Create / Invite Employee
- [x] Backend: auth.inviteEmployee tRPC mutation (create tenantUser record, send invite email with temp password)
- [x] Frontend: wire Invite Employee form in merchant/index.tsx to auth.inviteEmployee mutation
- [x] Frontend: show success banner with temp password (if no SMTP) or email confirmation

### Real-Time Live Map
- [x] Backend: technicians.updateLocation now calls broadcastLocationUpdate (Socket.IO) after DB write
- [x] Backend: technicians.updateStatus now calls broadcastStatusChange after DB write
- [x] Frontend (agent-task/[id].tsx): updateLocation mutation now includes tenantId for broadcast
- [x] Frontend (agent-home.tsx): startBackgroundLocationTracking now passes tenantId
- [x] Background task: fixed to use /api/trpc URL and include tenantId in payload

## Security Audit — Tenant Data Isolation (Mar 26)

- [x] Audit all DB query functions in server/db.ts for missing tenantId filters — all DB queries already use tenantId WHERE clauses
- [x] Audit all tRPC routes in server/routers.ts for missing tenant ownership checks — 8 gaps found
- [x] Audit /api/auth/* Express endpoints for cross-tenant data leaks — clean
- [x] Fix: add tenantScopedProcedure middleware to _core/trpc.ts (NVC admins bypass, others must match)
- [x] Fix: add tenantId column to users table in DB + Drizzle schema
- [x] Fix: tasks.getById, startTask, arriveTask, saveTaskNotes, completeTask — switched to tenantScopedProcedure + tenantId in input
- [x] Fix: tasks.assign — switched to tenantScopedProcedure + tenantId in input
- [x] Fix: technicians.getById, clockIn, clockOut, updateLocation — switched to tenantScopedProcedure + tenantId in input
- [x] Fix: tenants.list/getById/create/update — restricted to nvcAdminProcedure (NVC staff only)
- [x] Fix: templates.update/delete, pricing.update — switched to tenantScopedProcedure
- [x] Fix: messages.list/send, calendar.update/delete, notifications.list — switched to tenantScopedProcedure
- [x] Fix: exportRouter.ts all routes — switched to tenantScopedProcedure; invoicePdf adds task-level ownership check
- [x] Fix: adminRouter.ts updateMerchantSettings — added ownership check (merchant managers can only update own tenant)
- [x] Verify: 19/19 tenant isolation unit tests pass
- [x] Verify: TypeScript 0 errors in all modified files

## Bug Fix Sprint — Live Data Persistence (Mar 26)

- [x] Diagnose: root cause = isDemo always true because tenantId stored as string slug ("t-001") not integer
- [x] Diagnose: create-task.tsx was calling mock nvc360-api library instead of real tRPC mutation
- [x] Diagnose: super-admin/index.tsx and client/[id].tsx only updated local state, never wrote to DB
- [x] Diagnose: dashboard/index.tsx fell back to MOCK_TASKS/MOCK_CUSTOMERS when DB returned 0 rows
- [x] Fix: login.tsx MOCK_USERS now stores integer tenantId (1=Acme HVAC, 2=PlumbPro, 3=NVC360)
- [x] Fix: create-task.tsx now calls trpc.tasks.create with real tenantId; agent picker uses live technicians.list
- [x] Fix: super-admin/index.tsx now loads live tenants from DB and calls trpc.tenants.create on submit
- [x] Fix: super-admin/client/[id].tsx now loads real employees (tenantUsers.list) and customers (customers.list) from DB
- [x] Fix: super-admin/client/[id].tsx AddEmployeeModal calls trpc.auth.inviteEmployee; AddCustomerModal calls trpc.customers.create
- [x] Fix: dashboard/index.tsx removed all MOCK_TASKS/MOCK_TECHNICIANS/MOCK_CUSTOMERS fallbacks
- [x] Fix: dashboard CustomersSection fully wired to live customers.list/create/update/delete mutations
- [x] Fix: tenantUsers.list route added to routers.ts
- [x] Fix: db:push run to add isNvcPlatform + suspended columns to tenants table
- [x] Fix: demo tenant rows seeded in DB: id=1 Acme HVAC, id=2 PlumbPro, id=3 NVC360
- [x] Verify: TypeScript 0 errors after all fixes
- [ ] Verify: create work order → appears in task list immediately (requires device test)
- [ ] Verify: create customer → appears in customer list immediately (requires device test)
- [ ] Verify: create client (super-admin) → appears in client list immediately (requires device test)
