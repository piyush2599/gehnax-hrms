import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Payroll from "@/models/Payroll";
import Employee from "@/models/Employee";
import SalaryAdvance from "@/models/SalaryAdvance";
import { buildPayrollRows } from "@/lib/payroll-run";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  const roles: string[] = (session.user as any).roles || [];
  let sessionEmployeeId = (session.user as any).employeeId;
  const activeRole    = searchParams.get("activeRole") ?? "";
  const impersonateId = searchParams.get("impersonateId") ?? "";
  const isImpersonating = !!impersonateId && roles.includes("super_admin");
  if (isImpersonating) sessionEmployeeId = impersonateId;
  const effectiveRole = roles.includes(activeRole) ? activeRole : (roles[0] ?? "employee");
  const isEmployeeView = isImpersonating || effectiveRole === "employee" || !roles.some(r => ["super_admin","finance_admin"].includes(r));

  const query: any = {};

  if (isEmployeeView) {
    query.employeeId = sessionEmployeeId;
  } else if (employeeId) {
    query.employeeId = employeeId;
  }

  if (month) query.month = parseInt(month);
  if (year) query.year = parseInt(year);

  const payrolls = await Payroll.find(query)
    .populate("employeeId", "firstName lastName employeeCode department designation")
    .sort({ year: -1, month: -1 });

  return NextResponse.json(payrolls);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.includes("super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const body = await req.json();
  const month = parseInt(body.month);
  const year = parseInt(body.year);
  const employeeIds = body.employeeIds;

  if (!month || !year || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid month/year" }, { status: 400 });
  }

  // Compute all rows (no save) — identical logic to the dry-run preview
  const { rows, skipped, payPeriod } = await buildPayrollRows(month, year, employeeIds);

  const created = [];

  for (const row of rows) {
    const payroll = await Payroll.create({
      employeeId: row.employeeId,
      month,
      year,
      payPeriod,
      earnings: row.earnings,
      deductions: row.deductions,
      employerContributions: row.employerContributions,
      grossPay: row.grossPay,
      totalDeductions: row.totalDeductions,
      netPay: row.netPay,
      workingDays: row.workingDays,
      payableDays: row.payableDays,
      lopDays: row.lopDays,
      presentDays: row.presentDays,
      leaveDays: row.leaveDays,
      overtimeHours: row.overtimeHours,
      status: "draft",
      processedBy: (session.user as any).employeeId,
      processedOn: new Date(),
    });

    // Post-run side effects: record advance installment + clear arrears
    if (row.advanceId && row.advanceDeduction > 0) {
      const advance = await SalaryAdvance.findById(row.advanceId);
      if (advance && advance.status === "active") {
        advance.balance = Math.max(0, advance.balance - row.advanceDeduction);
        advance.installments.push({
          payrollId: payroll._id,
          payPeriod,
          amount: row.advanceDeduction,
          date: new Date(),
        });
        if (advance.balance <= 0) advance.status = "closed";
        await advance.save();
      }
    }
    if (row.arrears > 0) {
      await Employee.findByIdAndUpdate(row.employeeId, { pendingArrears: 0 });
    }

    created.push(payroll);
  }

  return NextResponse.json({ created: created.length, skipped, payrolls: created }, { status: 201 });
}
