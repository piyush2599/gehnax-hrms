import mongoose from "mongoose";
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error("Usage: node check-prod-users.mjs <MONGODB_URI>"); process.exit(1); }

await mongoose.connect(MONGODB_URI);
const db = mongoose.connection.db;

const users = await db.collection("users").find({}, {
  projection: { name: 1, email: 1, role: 1, isActive: 1, mfaEnabled: 1, password: 1 }
}).toArray();

console.log(`Total users: ${users.length}`);
users.forEach(u => {
  console.log(`  email: ${u.email} | role: ${u.role} | active: ${u.isActive} | mfa: ${u.mfaEnabled} | hasPassword: ${!!u.password}`);
});

await mongoose.disconnect();
