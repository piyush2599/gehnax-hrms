import mongoose from "mongoose";
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI;
const TOKEN = process.argv[3];

if (!MONGODB_URI) { console.error("Usage: node fix-onboarding-invite.mjs <MONGODB_URI> <invite-token>"); process.exit(1); }
if (!TOKEN) { console.error("Usage: node fix-onboarding-invite.mjs <MONGODB_URI> <invite-token>"); process.exit(1); }

await mongoose.connect(MONGODB_URI);
console.log("Connected to MongoDB");

const db = mongoose.connection.db;

// Find the invite
const invite = await db.collection("onboardinginvites").findOne({ token: TOKEN });
if (!invite) { console.error(`✗ Invite not found for token: ${TOKEN}`); process.exit(1); }

console.log(`\nInvite found:`);
console.log(`  Email:        ${invite.email}`);
console.log(`  Employee Code: ${invite.employeeCode}`);
console.log(`  Status:       ${invite.status}`);

// Check if a User exists with this email
const user = await db.collection("users").findOne({ email: invite.email });
console.log(`\nUser with email "${invite.email}": ${user ? `EXISTS (id: ${user._id})` : "not found"}`);

// Check if an Employee exists with this code
const employee = await db.collection("employees").findOne({ employeeCode: invite.employeeCode });
console.log(`Employee with code "${invite.employeeCode}": ${employee ? `EXISTS (id: ${employee._id})` : "not found"}`);

if (user && !employee) {
  // Orphaned User — safe to delete so onboarding can complete
  await db.collection("users").deleteOne({ _id: user._id });
  console.log(`\n✓ Deleted orphaned User (${invite.email})`);
} else if (user && employee) {
  console.log(`\n⚠  Both User and Employee exist — onboarding may already be completed.`);
  process.exit(0);
} else {
  console.log(`\n  No orphaned User to clean up.`);
}

// Ensure invite status is "submitted" so admin can complete it
if (invite.status !== "submitted") {
  await db.collection("onboardinginvites").updateOne(
    { token: TOKEN },
    { $set: { status: "submitted" } }
  );
  console.log(`✓ Reset invite status from "${invite.status}" → "submitted"`);
} else {
  console.log(`✓ Invite status is already "submitted" — no change needed`);
}

await mongoose.disconnect();
console.log("\n✓ Cleanup complete. Try completing the onboarding again.");
