import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import * as XLSX from "xlsx";

const INFO_COLS = [
  { wch: 14 }, // Employee Code
  { wch: 22 }, // Full Name
  { wch: 28 }, // Email
  { wch: 18 }, // Department
  { wch: 22 }, // Designation
  { wch: 16 }, // Employment Type
  { wch: 10 }, // Status
  { wch: 14 }, // Joining Date
  { wch: 22 }, // Reporting Manager
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.includes("super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const type = new URL(req.url).searchParams.get("type") ?? "monthly"; // "monthly" | "ctc"

  const employees = await Employee.find({})
    .populate("department", "name")
    .populate("reportingManager", "firstName lastName")
    .sort({ employeeCode: 1 })
    .lean();

  const today = new Date().toISOString().slice(0, 10);
  const wb = XLSX.utils.book_new();

  if (type === "ctc") {
    // ── Full CTC Sheet ──────────────────────────────────────────────
    const rows = employees.map(emp => {
      const s = emp.salary || {};
      const basic      = s.basic      ?? 0;
      const hra        = s.hra        ?? 0;
      const allowances = s.allowances ?? 0;
      const pf         = s.pf         ?? s.deductions ?? 0;
      const tds        = s.tds        ?? 0;

      const monthlyGross = basic + hra + allowances;
      const monthlyNet   = monthlyGross - pf - tds;
      const annualGross  = monthlyGross * 12;
      const annualPF     = pf * 12;
      const annualTDS    = tds * 12;
      const annualNet    = monthlyNet * 12;
      // CTC = annual gross + employer PF (typically 12% of basic, capped at ₹1800/mo)
      const employerPF   = Math.min(basic * 0.12, 1800) * 12;
      const ctc          = annualGross + employerPF;

      const mgr = emp.reportingManager as any;
      return {
        "Employee Code":          emp.employeeCode,
        "Full Name":              `${emp.firstName} ${emp.lastName}`,
        "Email":                  emp.email,
        "Department":             (emp.department as any)?.name ?? "",
        "Designation":            emp.designation,
        "Employment Type":        emp.employmentType?.replace("_", " "),
        "Status":                 emp.isActive ? "Active" : "Inactive",
        "Joining Date":           emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString("en-IN") : "",
        "Reporting Manager":      mgr ? `${mgr.firstName} ${mgr.lastName}` : "",
        // Annual earnings
        "Annual Basic (₹)":       basic * 12,
        "Annual HRA (₹)":         hra * 12,
        "Annual Allowances (₹)":  allowances * 12,
        "Annual Gross (₹)":       annualGross,
        // Annual deductions
        "Annual PF – Employee (₹)":  annualPF,
        "Annual TDS (₹)":            annualTDS,
        "Annual Net Take-Home (₹)":  annualNet,
        // CTC
        "Employer PF (₹)":           Math.round(employerPF),
        "Total CTC (₹)":             Math.round(ctc),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      ...INFO_COLS,
      { wch: 20 }, // Annual Basic
      { wch: 18 }, // Annual HRA
      { wch: 22 }, // Annual Allowances
      { wch: 20 }, // Annual Gross
      { wch: 24 }, // Annual PF Employee
      { wch: 18 }, // Annual TDS
      { wch: 26 }, // Annual Net Take-Home
      { wch: 20 }, // Employer PF
      { wch: 18 }, // Total CTC
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Full CTC");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="employee-ctc-${today}.xlsx"`,
      },
    });
  }

  // ── Monthly Salary Sheet ─────────────────────────────────────────
  const rows = employees.map(emp => {
    const s = emp.salary || {};
    const basic      = s.basic      ?? 0;
    const hra        = s.hra        ?? 0;
    const allowances = s.allowances ?? 0;
    const pf         = s.pf         ?? s.deductions ?? 0;
    const tds        = s.tds        ?? 0;

    const gross = basic + hra + allowances;
    const net   = gross - pf - tds;

    const mgr = emp.reportingManager as any;
    return {
      "Employee Code":          emp.employeeCode,
      "Full Name":              `${emp.firstName} ${emp.lastName}`,
      "Email":                  emp.email,
      "Department":             (emp.department as any)?.name ?? "",
      "Designation":            emp.designation,
      "Employment Type":        emp.employmentType?.replace("_", " "),
      "Status":                 emp.isActive ? "Active" : "Inactive",
      "Joining Date":           emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString("en-IN") : "",
      "Reporting Manager":      mgr ? `${mgr.firstName} ${mgr.lastName}` : "",
      // Monthly earnings
      "Basic (₹)":              basic,
      "HRA (₹)":                hra,
      "Allowances (₹)":         allowances,
      "Gross Salary (₹)":       gross,
      // Monthly deductions
      "PF Deduction (₹)":       pf,
      "TDS Deduction (₹)":      tds,
      "Total Deductions (₹)":   pf + tds,
      // Net
      "Net Take-Home (₹)":      net,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    ...INFO_COLS,
    { wch: 14 }, // Basic
    { wch: 12 }, // HRA
    { wch: 18 }, // Allowances
    { wch: 18 }, // Gross
    { wch: 20 }, // PF
    { wch: 18 }, // TDS
    { wch: 22 }, // Total Deductions
    { wch: 20 }, // Net Take-Home
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Monthly Salary");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="employee-monthly-salary-${today}.xlsx"`,
    },
  });
}
