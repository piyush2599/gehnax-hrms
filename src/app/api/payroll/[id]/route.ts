import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Payroll from "@/models/Payroll";
import Employee from "@/models/Employee";
import { computeSalary } from "@/lib/payroll-calc";
import { getSalaryForPeriod } from "@/lib/salary-history";

function canManage(session: any): boolean {
  const roles: string[] = session?.user?.roles || [];
  return roles.some((r) => ["super_admin", "finance_admin"].includes(r));
}

// GET single payroll (owner or manager)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const payroll = await Payroll.findById(params.id)
    .populate("employeeId", "firstName lastName employeeCode department designation")
    .lean() as any;
  if (!payroll) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const roles: string[] = (session.user as any).roles || [];
  const myId = (session.user as any).employeeId?.toString();
  const ownerId = (payroll.employeeId?._id || payroll.employeeId)?.toString();
  if (!canManage(session) && myId !== ownerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  void roles;
  return NextResponse.json(payroll);
}

/**
 * PATCH — edit adjustments and RECALCULATE via the single salary engine.
 * Body (all optional): bonus, advanceDeduction, otherDeduction, payableDays,
 * lopDays, overtimeHours, status ("draft"|"processed"|"paid"), notes.
 * A "paid" record is locked unless you first move it back to "processed".
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session)) {
    return NextResponse.json({ error: "Forbidden — Admin/Finance only" }, { status: 403 });
  }

  await connectDB();
  const payroll = await Payroll.findById(params.id);
  if (!payroll) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // Approve: draft → processed (required before it can be marked Paid)
  if (body.action === "approve") {
    payroll.status = "processed";
    payroll.approvedBy = (session.user as any).employeeId;
    payroll.approvedOn = new Date();
    await payroll.save();
    return NextResponse.json(payroll);
  }

  // Status-only transition (e.g. mark as paid) — no recalculation
  if (body.status && Object.keys(body).length <= 2) {
    if (!["draft", "processed", "paid"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (body.status === "paid" && payroll.status !== "processed") {
      return NextResponse.json(
        { error: "Approve the payslip before marking it Paid." },
        { status: 409 },
      );
    }
    payroll.status = body.status;
    if (body.status === "paid") payroll.paidOn = new Date();
    if (typeof body.notes === "string") payroll.notes = body.notes;
    await payroll.save();
    return NextResponse.json(payroll);
  }

  if (payroll.status === "paid") {
    return NextResponse.json(
      { error: "This payslip is marked Paid. Move it back to Processed before editing." },
      { status: 409 },
    );
  }

  const employee = await Employee.findById(payroll.employeeId).select("+salary").lean() as any;
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  // Use the salary structure effective for this pay-period (revision-aware)
  const periodSalary = await getSalaryForPeriod(payroll.employeeId, payroll.year, payroll.month, employee.salary);

  // Apply edited days (bounded) then recompute everything from the salary engine
  const totalDays = payroll.workingDays || 30;
  const lopDays = body.lopDays != null ? Math.max(0, Number(body.lopDays)) : payroll.lopDays;
  const payableDays = body.payableDays != null
    ? Math.max(0, Math.min(Number(body.payableDays), totalDays))
    : payroll.payableDays;
  const overtimeHours = body.overtimeHours != null
    ? Math.max(0, Number(body.overtimeHours))
    : payroll.overtimeHours;

  const b = computeSalary(periodSalary, {
    totalDays,
    payableDays,
    overtimeHours,
    bonus: body.bonus != null ? Number(body.bonus) : payroll.earnings.bonus,
    arrears: body.arrears != null ? Number(body.arrears) : (payroll.earnings.arrears || 0),
    advanceDeduction: body.advanceDeduction != null ? Number(body.advanceDeduction) : payroll.deductions.advance,
    otherDeduction: body.otherDeduction != null ? Number(body.otherDeduction) : payroll.deductions.other,
  });

  payroll.earnings = b.earnings;
  payroll.deductions = b.deductions;
  payroll.employerContributions = { pf: b.employerPF, gratuity: b.gratuity };
  payroll.grossPay = b.grossPay;
  payroll.totalDeductions = b.totalDeductions;
  payroll.netPay = b.netPay;
  payroll.payableDays = payableDays;
  payroll.lopDays = lopDays;
  payroll.overtimeHours = overtimeHours;
  if (typeof body.notes === "string") payroll.notes = body.notes;
  if (body.status && ["draft", "processed", "paid"].includes(body.status)) {
    payroll.status = body.status;
    if (body.status === "paid") payroll.paidOn = new Date();
  }
  payroll.processedBy = (session.user as any).employeeId;
  payroll.processedOn = new Date();
  payroll.payslipUrl = undefined; // stale — must regenerate the PDF

  await payroll.save();
  return NextResponse.json(payroll);
}

// DELETE — remove a payroll so the period can be re-run (blocked once Paid)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session)) {
    return NextResponse.json({ error: "Forbidden — Admin/Finance only" }, { status: 403 });
  }

  await connectDB();
  const payroll = await Payroll.findById(params.id);
  if (!payroll) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (payroll.status === "paid") {
    return NextResponse.json({ error: "Cannot delete a Paid payslip" }, { status: 409 });
  }
  await payroll.deleteOne();
  return NextResponse.json({ ok: true });
}
