import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hrms";
const BASE_URL    = process.env.BASE_URL    || "http://localhost:3000";

const TEST_EMAIL    = "sales.tester@gehnax.com";
const TEST_PASSWORD = "Test@12345";

function mergeCookies(jar, setCookieHeaders) {
  if (!setCookieHeaders) return;
  for (const raw of setCookieHeaders) {
    const [pair] = raw.split(";");
    const idx = pair.indexOf("=");
    const name = pair.slice(0, idx);
    const value = pair.slice(idx + 1);
    jar.set(name, value);
  }
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  // ── Setup: create a fresh "sales"-only test user ──────────────────────────
  await db.collection("users").deleteOne({ email: TEST_EMAIL });
  const hashed = await bcrypt.hash(TEST_PASSWORD, 12);
  const userDoc = {
    name: "Sales Tester",
    email: TEST_EMAIL,
    password: hashed,
    roles: ["sales"],
    isActive: true,
    mfaEnabled: false,
    mfaSkipCount: 0,
    mfaForceSetup: false,
    mustChangePassword: false,
    rolesActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const inserted = await db.collection("users").insertOne(userDoc);
  console.log("✓ Created test user:", TEST_EMAIL, "roles=[\"sales\"]");

  const jar = new Map();
  let createdLeadId = null;
  let pass = 0, fail = 0;
  const check = (label, cond, extra = "") => {
    if (cond) { console.log(`  PASS  ${label}`); pass++; }
    else      { console.log(`  FAIL  ${label} ${extra}`); fail++; }
  };

  try {
    // ── Sign in via NextAuth credentials flow ────────────────────────────────
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    mergeCookies(jar, csrfRes.headers.getSetCookie?.() ?? csrfRes.headers.raw?.()["set-cookie"]);
    const { csrfToken } = await csrfRes.json();

    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieHeader(jar),
      },
      body: new URLSearchParams({
        csrfToken,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        json: "true",
      }),
      redirect: "manual",
    });
    mergeCookies(jar, loginRes.headers.getSetCookie?.() ?? loginRes.headers.raw?.()["set-cookie"]);

    const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: cookieHeader(jar) },
    });
    const session = await sessionRes.json();
    check("Login succeeds and session has 'sales' role", session?.user?.roles?.includes("sales"), JSON.stringify(session));

    // ── 1. GET /api/crm/leads — view access ──────────────────────────────────
    const getRes = await fetch(`${BASE_URL}/api/crm/leads`, { headers: { Cookie: cookieHeader(jar) } });
    check("GET /api/crm/leads -> 200 (view allowed)", getRes.status === 200, `got ${getRes.status}`);

    // ── 2. POST /api/crm/leads — create access ───────────────────────────────
    const postRes = await fetch(`${BASE_URL}/api/crm/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader(jar) },
      body: JSON.stringify({
        title: "Sales Role Test Lead",
        accountName: "Test Account Pvt Ltd",
        contactName: "Test Contact",
        stage: "new",
        value: 50000,
      }),
    });
    check("POST /api/crm/leads -> 201 (create allowed)", postRes.status === 201, `got ${postRes.status}`);
    if (postRes.status === 201) {
      const { lead } = await postRes.json();
      createdLeadId = lead._id;
      console.log(`        created lead ${lead.leadNumber} (${createdLeadId})`);
    }

    // ── 3. PATCH /api/crm/leads/[id] — edit access ───────────────────────────
    if (createdLeadId) {
      const patchRes = await fetch(`${BASE_URL}/api/crm/leads/${createdLeadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookieHeader(jar) },
        body: JSON.stringify({ title: "Sales Role Test Lead (edited)", stage: "contacted" }),
      });
      check("PATCH /api/crm/leads/[id] -> 200 (edit allowed)", patchRes.status === 200, `got ${patchRes.status}`);
    }

    // ── 4. DELETE /api/crm/leads/[id] — must be forbidden for sales ─────────
    if (createdLeadId) {
      const delRes = await fetch(`${BASE_URL}/api/crm/leads/${createdLeadId}`, {
        method: "DELETE",
        headers: { Cookie: cookieHeader(jar) },
      });
      check("DELETE /api/crm/leads/[id] -> 403 (delete forbidden)", delRes.status === 403, `got ${delRes.status}`);
    }

  } finally {
    // ── Cleanup ───────────────────────────────────────────────────────────────
    if (createdLeadId) {
      await db.collection("crmleads").deleteOne({ _id: new mongoose.Types.ObjectId(createdLeadId) });
      console.log("✓ Cleaned up test lead");
    }
    await db.collection("users").deleteOne({ _id: inserted.insertedId });
    console.log("✓ Cleaned up test user");
    await mongoose.disconnect();
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
