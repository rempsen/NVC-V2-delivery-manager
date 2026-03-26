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
