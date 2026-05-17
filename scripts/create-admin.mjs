import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error("Usage: node create-admin.mjs <MONGODB_URI>"); process.exit(1); }

await mongoose.connect(MONGODB_URI);
const db = mongoose.connection.db;

const email = "piyush@gehnax.com";
const existing = await db.collection("users").findOne({ email });
if (existing) {
  console.log("User already exists:", email);
  await mongoose.disconnect();
  process.exit(0);
}

const hashed = await bcrypt.hash("Wet@123Wet@!#@", 12);
await db.collection("users").insertOne({
  name: "Piyush",
  email,
  password: hashed,
  role: "super_admin",
  isActive: true,
  mfaEnabled: false,
  mfaSkipCount: 0,
  mfaForceSetup: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

console.log("✓ Admin user created: piyush@gehnax.com");
await mongoose.disconnect();
