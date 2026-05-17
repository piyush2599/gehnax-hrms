import mongoose from "mongoose";
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error("Usage: node reset-prod.mjs <MONGODB_URI>"); process.exit(1); }
const ADMIN_EMAIL = "admin@gehnax.com";

await mongoose.connect(MONGODB_URI);
console.log("Connected to hrms-prod on Atlas");

const db = mongoose.connection.db;

// Collections to completely wipe
const toDrop = [
  "employees",
  "departments",
  "attendances",
  "leaves",
  "payrolls",
  "timesheets",
  "announcements",
  "holidays",
  "jobpostings",
  "candidates",
  "hiringdocuments",
  "onboardinginvites",
];

for (const col of toDrop) {
  try {
    await db.collection(col).deleteMany({});
    console.log(`✓ Cleared: ${col}`);
  } catch {
    console.log(`  Skipped (not found): ${col}`);
  }
}

// From users: delete everyone except admin@gehnax.com
const usersCol = db.collection("users");
const adminUser = await usersCol.findOne({ email: ADMIN_EMAIL });

if (!adminUser) {
  console.error(`✗ Admin user ${ADMIN_EMAIL} not found! Aborting user wipe.`);
} else {
  const { deletedCount } = await usersCol.deleteMany({ email: { $ne: ADMIN_EMAIL } });
  console.log(`✓ Deleted ${deletedCount} non-admin user(s)`);

  // Reset MFA for admin + ensure isActive is true
  await usersCol.updateOne(
    { email: ADMIN_EMAIL },
    {
      $set: {
        isActive: true,
        mfaEnabled: false,
        mfaSkipCount: 0,
        mfaForceSetup: false,
      },
      $unset: {
        mfaSecret: "",
        mfaVerifiedAt: "",
        mfaSkippedAt: "",
        mfaDisabledUntil: "",
        employeeId: "",
      },
    }
  );
  console.log(`✓ MFA reset for ${ADMIN_EMAIL}`);
  console.log(`✓ Admin user retained: ${ADMIN_EMAIL}`);
}

await mongoose.disconnect();
console.log("\n✓ Production DB reset complete.");
console.log(`  Only admin@gehnax.com remains. Login: Admin@123`);
