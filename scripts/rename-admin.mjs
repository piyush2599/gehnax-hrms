import mongoose from "mongoose";
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const MONGODB_URI = "MONGODB_URI_REDACTED";

await mongoose.connect(MONGODB_URI);
const db = mongoose.connection.db;

const result = await db.collection("users").updateOne(
  { email: "admin@gehnax.com" },
  { $set: { name: "Lalit Kumar", updatedAt: new Date() } }
);

console.log(`Matched: ${result.matchedCount}, Updated: ${result.modifiedCount}`);

const user = await db.collection("users").findOne({ email: "admin@gehnax.com" }, { projection: { name: 1, email: 1, role: 1 } });
console.log("User now:", user);

await mongoose.disconnect();
