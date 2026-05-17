/**
 * Run: node scripts/import-to-atlas.mjs <ATLAS_URI>
 * Imports local backup (hrms-backup.json) into a MongoDB Atlas cluster.
 * Skips collections that already have documents to avoid duplicates.
 */
import { MongoClient } from "mongodb";
import { readFileSync } from "fs";

const ATLAS_URI = process.argv[2];
if (!ATLAS_URI) {
  console.error("Usage: node scripts/import-to-atlas.mjs <ATLAS_URI>");
  process.exit(1);
}

const backup = JSON.parse(readFileSync("hrms-backup.json", "utf8"));

const client = new MongoClient(ATLAS_URI);
await client.connect();
const db = client.db("hrms");

for (const [collName, docs] of Object.entries(backup)) {
  if (!docs.length) { console.log(`${collName}: empty, skipping`); continue; }
  const existing = await db.collection(collName).countDocuments();
  if (existing > 0) {
    console.log(`${collName}: already has ${existing} docs, skipping`);
    continue;
  }
  await db.collection(collName).insertMany(docs);
  console.log(`${collName}: imported ${docs.length} documents`);
}

console.log("\nImport complete.");
await client.close();
