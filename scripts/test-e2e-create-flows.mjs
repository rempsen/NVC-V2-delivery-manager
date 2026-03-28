/**
 * End-to-End Creation Flow Tests — uses curl for proper cookie handling
 * Tests: Login, Create Company, Create Customer, Create Technician, Create Work Order
 * Run: node scripts/test-e2e-create-flows.mjs
 */

import { execSync } from "child_process";
import { unlinkSync, existsSync } from "fs";

const BASE = "http://localhost:3000";
const COOKIE_FILE = "/tmp/e2e_cookies.txt";

let passed = 0;
let failed = 0;
const failures = [];
let DISPATCH_TENANT_ID = null;

function ok(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    const msg = detail ? `${label}: ${detail}` : label;
    console.log(`  ❌ ${msg}`);
    failed++;
    failures.push(msg);
  }
}

function trpcPost(path, body, newSession = false) {
  const cookieFlag = newSession ? `-c ${COOKIE_FILE}` : `-b ${COOKIE_FILE} -c ${COOKIE_FILE}`;
  const bodyStr = JSON.stringify({ json: body }).replace(/'/g, "'\\''");
  const cmd = `curl -s --max-time 20 ${cookieFlag} -X POST "${BASE}${path}" -H "Content-Type: application/json" -d '${bodyStr}'`;
  const out = execSync(cmd, { timeout: 25000 }).toString();
  const data = JSON.parse(out);
  if (data.error) throw new Error(data.error.json?.message ?? JSON.stringify(data.error).slice(0, 300));
  return data.result?.data?.json;
}

function trpcGet(path, inputObj) {
  // tRPC queries use GET with ?input= param
  const inputParam = inputObj ? encodeURIComponent(JSON.stringify({ json: inputObj })) : "";
  const url = inputParam ? `${BASE}${path}?input=${inputParam}` : `${BASE}${path}`;
  const cmd = `curl -s --max-time 20 -b ${COOKIE_FILE} "${url}"`;
  const out = execSync(cmd, { timeout: 25000 }).toString();
  const data = JSON.parse(out);
  if (data.error) throw new Error(data.error.json?.message ?? JSON.stringify(data.error).slice(0, 300));
  return data.result?.data?.json;
}

// Clean up old cookie file
if (existsSync(COOKIE_FILE)) unlinkSync(COOKIE_FILE);

// ─── TEST 1: Login as NVC Super Admin ─────────────────────────────────────────
console.log("\n📋 TEST 1: Login as NVC Super Admin (dan@nvc360.com)");
try {
  const result = trpcPost("/api/trpc/auth.emailLogin", {
    email: "dan@nvc360.com",
    password: "TestPass123!",
  }, true);
  const user = result?.user;
  ok("Login returns user object", !!user?.id, `got: ${JSON.stringify(result)?.slice(0, 120)}`);
  ok("Role is nvc_super_admin", user?.role === "nvc_super_admin", `got: ${user?.role}`);
  ok("Cookie file created", existsSync(COOKIE_FILE));
  console.log(`     → ${user?.name} | role: ${user?.role} | tenantId: ${user?.tenantId}`);
} catch (e) {
  ok("Login", false, e.message);
  ok("Role check", false, "skipped");
  ok("Cookie file", false, "skipped");
  console.log("⚠️  Cannot continue without login. Aborting.");
  process.exit(1);
}

// ─── TEST 2: Create Company ───────────────────────────────────────────────────
console.log("\n📋 TEST 2: Create Company (admin.createMerchant)");
let newTenantId = null;
const testSlug = `e2e-hvac-${Date.now()}`;
try {
  const result = trpcPost("/api/trpc/admin.createMerchant", {
    companyName: "E2E HVAC Test Co",
    slug: testSlug,
    industry: "hvac",
    plan: "professional",
    ownerName: "E2E Owner",
    ownerEmail: `e2e-owner-${Date.now()}@testhvac.com`,
    ownerPassword: "TestPass123!",
  });
  newTenantId = result?.tenantId;
  ok("createMerchant returns tenantId", !!newTenantId, `got: ${JSON.stringify(result)}`);
  ok("tenantId is numeric", !isNaN(Number(newTenantId)));
  console.log(`     → Created tenant: ID=${newTenantId}, slug=${result?.slug}`);
} catch (e) {
  ok("createMerchant", false, e.message);
  ok("tenantId numeric", false, "skipped");
}

// ─── TEST 3: Login as Dispatcher (tenant-scoped) ──────────────────────────────
console.log("\n📋 TEST 3: Login as Dispatcher (dispatch@nvctest.com)");
try {
  const result = trpcPost("/api/trpc/auth.emailLogin", {
    email: "dispatch@nvctest.com",
    password: "TestPass123!",
  }, true);
  const user = result?.user;
  ok("Dispatcher login succeeds", !!user?.id, `got: ${JSON.stringify(result)?.slice(0, 120)}`);
  ok("Role is dispatcher", user?.role === "dispatcher", `got: ${user?.role}`);
  DISPATCH_TENANT_ID = user?.tenantId;
  console.log(`     → ${user?.name} | role: ${user?.role} | tenantId: ${user?.tenantId}`);
} catch (e) {
  ok("Dispatcher login", false, e.message);
  ok("Dispatcher role", false, "skipped");
  console.log("     ⚠️  Re-logging in as super admin for remaining tests...");
  try {
    trpcPost("/api/trpc/auth.emailLogin", { email: "dan@nvc360.com", password: "TestPass123!" }, true);
    DISPATCH_TENANT_ID = 30002; // fallback
  } catch {}
}

const tenantId = DISPATCH_TENANT_ID ?? 30002;

// ─── TEST 4: Create Customer ──────────────────────────────────────────────────
console.log(`\n📋 TEST 4: Create Customer (tenantId=${tenantId})`);
let newCustomerId = null;
try {
  const result = trpcPost("/api/trpc/customers.create", {
    tenantId,
    company: `E2E Test Customer ${Date.now()}`,
    contactName: "E2E Contact",
    email: `e2e-cust-${Date.now()}@test.com`,
    phone: "2045550100",
    mailingStreet: "123 Test Street",
    mailingCity: "Winnipeg",
    mailingProvince: "MB",
    mailingPostalCode: "R3C 1A1",
    mailingCountry: "Canada",
    sameAsMailing: true,
    status: "prospect",
    paymentTerms: "net_30",
    tags: "Priority",
    notes: "E2E test customer",
  });
  // customers.create returns the raw ID (number) directly
  newCustomerId = result?.id ?? (typeof result === "number" ? result : null);
  ok("customers.create returns id", !!newCustomerId, `got: ${JSON.stringify(result)?.slice(0, 150)}`);
  ok("Customer id is numeric", !isNaN(Number(newCustomerId)));
  console.log(`     → Created customer: ID=${newCustomerId}`);
} catch (e) {
  ok("customers.create", false, e.message);
  ok("Customer id numeric", false, "skipped");
}

// ─── TEST 5: Create Technician ────────────────────────────────────────────────
console.log(`\n📋 TEST 5: Create Technician (tenantId=${tenantId})`);
let newTechId = null;
try {
  const result = trpcPost("/api/trpc/technicians.create", {
    tenantId,
    firstName: "E2E",
    lastName: `Tech${Date.now()}`,
    email: `e2e-tech-${Date.now()}@test.com`,
    phone: "2045550200",
    skills: ["HVAC", "Plumbing"],
    certifications: ["Red Seal"],
    departments: ["Field Operations"],
    industries: ["HVAC"],
    hourlyRate: "75",
    employmentType: "full_time",
  });
  newTechId = result?.id;
  ok("technicians.create returns id", !!newTechId, `got: ${JSON.stringify(result)?.slice(0, 150)}`);
  ok("Technician id is numeric", !isNaN(Number(newTechId)));
  console.log(`     → Created technician: ID=${newTechId}`);
} catch (e) {
  ok("technicians.create", false, e.message);
  ok("Technician id numeric", false, "skipped");
}

// ─── TEST 6: Create Work Order ────────────────────────────────────────────────
console.log(`\n📋 TEST 6: Create Work Order (tenantId=${tenantId})`);
let newTaskId = null;
try {
  const result = trpcPost("/api/trpc/tasks.create", {
    tenantId,
    customerName: "E2E TestCustomer",
    customerPhone: "2045550100",
    customerEmail: "e2e@test.com",
    jobAddress: "456 Job Site Ave, Winnipeg, MB",
    jobLatitude: "49.8951",
    jobLongitude: "-97.1384",
    technicianId: newTechId ? Number(newTechId) : undefined,
    priority: "normal",
    scheduledAt: new Date(Date.now() + 3600000).toISOString(),
    description: "E2E test work order",
    customFields: {},
  });
  // tasks.create returns the raw ID (number) directly
  newTaskId = result?.id ?? (typeof result === "number" ? result : null);
  ok("tasks.create returns id", !!newTaskId, `got: ${JSON.stringify(result)?.slice(0, 150)}`);
  ok("Task id is numeric", !isNaN(Number(newTaskId)));
  console.log(`     → Created work order: ID=${newTaskId}`);
} catch (e) {
  ok("tasks.create", false, e.message);
  ok("Task id numeric", false, "skipped");
}

// ─── TEST 7: Verify records appear in list endpoints ─────────────────────────
console.log("\n📋 TEST 7: Verify all new records appear in list endpoints");

try {
  const customersData = trpcGet("/api/trpc/customers.list", { tenantId });
  const customersList = Array.isArray(customersData) ? customersData : (customersData?.customers ?? []);
  ok("customers.list returns array", Array.isArray(customersList), `type: ${typeof customersData}`);
  if (newCustomerId) {
    const found = customersList.some((c) => String(c.id) === String(newCustomerId) || String(c.customerId) === String(newCustomerId));
    ok(`New customer ID=${newCustomerId} in list`, found, `list has ${customersList.length} items, first: ${JSON.stringify(customersList[0])?.slice(0,80)}`);
  }
} catch (e) { ok("customers.list", false, e.message); }

try {
  const techsData = trpcGet("/api/trpc/technicians.list", { tenantId });
  const techsList = Array.isArray(techsData) ? techsData : (techsData?.technicians ?? []);
  ok("technicians.list returns array", Array.isArray(techsList), `type: ${typeof techsData}`);
  if (newTechId) {
    const found = techsList.some((t) => String(t.id) === String(newTechId) || String(t.technicianId) === String(newTechId) || String(t.tech?.id) === String(newTechId));
    ok(`New technician ID=${newTechId} in list`, found, `list has ${techsList.length} items, first: ${JSON.stringify(techsList[0])?.slice(0,80)}`);
  }
} catch (e) { ok("technicians.list", false, e.message); }

try {
  const tasksData = trpcGet("/api/trpc/tasks.list", { tenantId });
  const tasksList = Array.isArray(tasksData) ? tasksData : (tasksData?.tasks ?? []);
  ok("tasks.list returns array", Array.isArray(tasksList), `type: ${typeof tasksData}`);
  if (newTaskId) {
    const found = tasksList.some((t) => String(t.id) === String(newTaskId) || String(t.taskId) === String(newTaskId));
    ok(`New work order ID=${newTaskId} in list`, found, `list has ${tasksList.length} items, first: ${JSON.stringify(tasksList[0])?.slice(0,80)}`);
  }
} catch (e) { ok("tasks.list", false, e.message); }

// ─── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(55));
console.log(`📊 RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} checks`);
if (failed === 0) {
  console.log("🎉 ALL TESTS PASSED — All creation flows are fully functional!");
} else {
  console.log("⚠️  Failures:");
  failures.forEach((f) => console.log(`   ❌ ${f}`));
}
console.log("═".repeat(55) + "\n");
process.exit(failed > 0 ? 1 : 0);
