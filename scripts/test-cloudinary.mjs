/**
 * Tests all Cloudinary upload paths used by the HRMS.
 * Run: node scripts/test-cloudinary.mjs
 */
import { v2 as cloudinary } from "cloudinary";
import { readFileSync } from "fs";
import { Readable } from "stream";

const env = readFileSync(".env.local", "utf8");
const get = (key) => env.match(new RegExp(`^${key}=(.+)`, "m"))?.[1]?.trim();

cloudinary.config({
  cloud_name: get("CLOUDINARY_CLOUD_NAME"),
  api_key: get("CLOUDINARY_API_KEY"),
  api_secret: get("CLOUDINARY_API_SECRET"),
});

function upload(buffer, fileName, folder, mimeType) {
  const resourceType = mimeType.startsWith("image/") ? "image" : "raw";
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: `test-${Date.now()}-${fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_")}`, resource_type: resourceType, access_mode: "public" },
      (err, result) => err ? reject(err) : resolve(result)
    );
    stream.end(buffer);
  });
}

async function checkUrl(url) {
  const res = await fetch(url, { method: "HEAD" });
  return res.ok ? `✓ ${res.status} OK` : `✗ ${res.status} ${res.statusText}`;
}

const results = [];

async function test(label, buffer, fileName, folder, mimeType) {
  process.stdout.write(`  ${label}... `);
  try {
    const result = await upload(buffer, fileName, folder, mimeType);
    const status = await checkUrl(result.secure_url);
    console.log(`uploaded ${status}`);
    results.push({ label, url: result.secure_url, ok: status.startsWith("✓") });
  } catch (err) {
    console.log(`FAILED: ${err.message}`);
    results.push({ label, url: null, ok: false, error: err.message });
  }
}

// Valid 1x1 white PNG (base64)
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==",
  "base64"
);

// Minimal valid PDF
const PDF = Buffer.from(
  "%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF"
);

console.log("\n=== Cloudinary Upload Test ===\n");
console.log(`Cloud: ${get("CLOUDINARY_CLOUD_NAME")}\n`);

await test("Employee photo (JPG)",     PNG,  "photo.jpg",    "hrms/employee-photos",       "image/jpeg");
await test("Onboarding avatar (PNG)",  PNG,  "avatar.png",   "hrms/onboarding-avatars",    "image/png");
await test("PAN card (PDF)",           PDF,  "pan_card.pdf", "hrms/onboarding/TEST001",    "application/pdf");
await test("Aadhaar card (PNG)",       PNG,  "aadhaar.png",  "hrms/onboarding/TEST001",    "image/png");
await test("Candidate document (PDF)", PDF,  "doc.pdf",      "hrms/hiring/candidateTest",  "application/pdf");
await test("Resume (PDF)",             PDF,  "resume.pdf",   "hrms/resumes",               "application/pdf");

const passed = results.filter(r => r.ok).length;
const failed = results.filter(r => !r.ok).length;

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
results.forEach(r => {
  if (r.ok) console.log(`  ✓ ${r.label}\n    ${r.url}`);
  else       console.log(`  ✗ ${r.label}: ${r.error ?? "URL not accessible"}`);
});
console.log();
