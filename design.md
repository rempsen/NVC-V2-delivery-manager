# NVC360 Dispatch — Design Plan

## Brand Identity
- **App Name:** NVC360 Dispatch
- **Primary Color:** #1A56DB (deep blue — professional logistics)
- **Accent Color:** #F97316 (orange — urgency, action)
- **Success:** #22C55E (green)
- **Warning:** #F59E0B (amber)
- **Error:** #EF4444 (red)
- **Background (light):** #F8FAFC
- **Background (dark):** #0F172A
- **Surface (light):** #FFFFFF
- **Surface (dark):** #1E293B

## Screen List

1. **Dashboard (Home)** — Overview metrics, recent tasks, quick actions
2. **Tasks** — Full task list with filters (status, date, agent)
3. **Task Detail** — Full task info, status timeline, agent info, map
4. **Create Task** — Form to create pickup/delivery task
5. **Agents** — Fleet list with online/offline status, location
6. **Agent Detail** — Agent profile, active tasks, stats
7. **Settings** — API key configuration, account info, preferences

## Primary Content & Functionality

### Dashboard
- Summary cards: Total Tasks, Active, Completed, Failed (today)
- Quick action buttons: New Task, View All Tasks, View Agents
- Recent tasks list (last 5)
- Pull-to-refresh

### Tasks Screen
- FlatList of tasks with status badges
- Filter bar: All / Assigned / Started / Completed / Failed
- Search by customer name or address
- Swipe to view task details

### Task Detail Screen
- Customer info (name, phone, address)
- Status badge + timeline (created → assigned → started → completed)
- Assigned agent info
- Map placeholder with pickup/delivery markers
- Action buttons: Edit, Cancel Task

### Create Task Screen
- Form fields: Customer Name, Phone, Pickup Address, Delivery Address, Description, Scheduled Time
- Vehicle type selector
- Submit button with loading state

### Agents Screen
- FlatList of agents with avatar, name, status dot (online/offline)
- Active task count badge
- Last seen timestamp

### Agent Detail Screen
- Profile header (name, phone, email, vehicle)
- Status indicator
- Active tasks list
- Total completed tasks stat

### Settings Screen
- API Key input (stored securely)
- User ID input
- Theme toggle (light/dark)
- About section with GitHub credits

## Key User Flows

1. **Dispatch a delivery:**
   Dashboard → "New Task" → Fill form → Submit → Task appears in Tasks list

2. **Monitor active deliveries:**
   Dashboard → Tasks tab → Filter "Started" → Tap task → View detail + agent

3. **Check fleet status:**
   Agents tab → See all online agents → Tap agent → View active tasks

4. **Configure API:**
   Settings → Enter NVC360 API Key → Save → App connects to real NVC360 data

## Tab Bar (4 tabs)
- Home (house.fill)
- Tasks (list.bullet)
- Agents (person.2.fill)
- Settings (gear)

## Design Principles
- iOS Human Interface Guidelines compliant
- Card-based layout with subtle shadows
- Status badges with color coding
- One-handed reachability: primary actions in bottom half
- Loading skeletons instead of spinners where possible
