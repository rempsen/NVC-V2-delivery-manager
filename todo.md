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
- [x] Tookan — shown as connected
- [x] Stripe Payments — connect/disconnect
- [x] Twilio SMS — shown as connected
- [x] Category filter tabs
- [x] Feature list per integration (expandable)
- [x] Data export (CSV + PDF)
- [x] NVC360 API key display

## Pending / Future Work
- [ ] Real Mapbox integration (requires API key)
- [ ] Real Tookan API integration (requires API key)
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
