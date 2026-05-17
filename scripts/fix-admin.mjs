import mongoose from "mongoose";
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error("Usage: node fix-admin.mjs <MONGODB_URI>"); process.exit(1); }

await mongoose.connect(MONGODB_URI);
const db = mongoose.connection.db;

const result = await db.collection("users").updateOne(
  { email: "admin@gehnax.com" },
  { $set: { isActive: true } }
);

console.log(`Matched: ${result.matchedCount}, Updated: ${result.modifiedCount}`);

const user = await db.collection("users").findOne(
  { email: "admin@gehnax.com" },
  { projection: { email: 1, role: 1, isActive: 1, mfaEnabled: 1 } }
);
console.log("Admin user now:", user);

await mongoose.disconnect();
console.log("Done.");
