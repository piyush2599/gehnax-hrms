// Quick test: generate a sample payslip PDF to verify the new format
// Run with: node scripts/test-payslip.mjs

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// We call the Next.js API directly by hitting localhost
const PAYROLL_API = "http://localhost:3001/api";

// Sample payslip data matching what the PDF generator expects
const testData = {
  employeeName:    "Piyush Agarwal",
  employeeCode:    "GEH001",
  designation:     "Senior Consultant",
  department:      "Technology",
  month:           6,
  year:            2026,
  payPeriod:       "2026-06",
  presentDays:     22,
  workingDays:     22,
  payableDays:     22,
  leaveDays:       0,
  earnings: {
    basic:       65000,
    hra:         32500,
    allowances:  24700,
    overtime:    0,
    bonus:       0,
  },
  deductions: {
    pf:      7800,
    esi:     0,
    tax:     7800,
    advance: 0,
    other:   0,
  },
  grossPay:        122200,
  totalDeductions: 15600,
  netPay:          106400,
  status:          "processed",
  generatedDate:   new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
  joiningDate:     "06 Jan 2025",
  bankName:        "Axis Bank",
  bankAccount:     "922010033728902",
  bankIFSC:        "UTIB0000010",
  paymentMode:     "Bank Transfer",
};

console.log("Generating test payslip PDF...");
console.log("Sample data:");
console.log(`  Employee : ${testData.employeeName} (${testData.employeeCode})`);
console.log(`  Period   : June 2026`);
console.log(`  Gross    : ₹${testData.grossPay.toLocaleString("en-IN")}`);
console.log(`  PF       : ₹${testData.deductions.pf.toLocaleString("en-IN")}`);
console.log(`  TDS      : ₹${testData.deductions.tax.toLocaleString("en-IN")}`);
console.log(`  Net Pay  : ₹${testData.netPay.toLocaleString("en-IN")}`);
console.log("");
console.log("POST to /api/test-payslip ...");

const res = await fetch(`${PAYROLL_API}/test-payslip`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(testData),
});

if (!res.ok) {
  const text = await res.text();
  console.error("Failed:", res.status, text);
  process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());
const outPath = join(__dirname, "sample-payslip.pdf");
writeFileSync(outPath, buf);
console.log(`✓ PDF saved to: ${outPath}`);
console.log("Open it to verify the new format.");
