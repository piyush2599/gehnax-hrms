import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Payroll from "@/models/Payroll";
import Employee from "@/models/Employee";
import Attendance from "@/models/Attendance";

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
  const { month, year, employeeIds } = body;

  const payPeriod = `${year}-${String(month).padStart(2, "0")}`;

  const employees = employeeIds
    ? await Employee.find({ _id: { $in: employeeIds }, isActive: true })
    : await Employee.find({ isActive: true });

  // Count working days in the month
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month - 1, i);
    if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const created = [];

  for (const employee of employees) {
    // Check if already processed
    const existing = await Payroll.findOne({ employeeId: employee._id, payPeriod });
    if (existing) continue;

    // Get attendance data
    const attendanceRecords = await Attendance.find({
      employeeId: employee._id,
      date: { $gte: startDate, $lt: endDate },
    });

    const presentDays = attendanceRecords.filter((a) =>
      ["present", "late"].includes(a.status)
    ).length;
    const leaveDays = attendanceRecords.filter((a) => a.status === "on_leave").length;
    const overtimeHours = attendanceRecords.reduce((sum, a) => sum + (a.overtime || 0), 0);

    const { basic, hra, allowances } = employee.salary;
    const overtimePay = (basic / (workingDays * 8)) * overtimeHours;

    // Calculate deductions (Indian payroll)
    // PF: use the amount configured on the employee record (set via CTC calculator).
    // salary.deductions holds the employee's monthly PF contribution — 0 means no PF.
    const pfAmount  = Math.round(employee.salary.deductions || 0);
    const esiRate   = basic + hra + allowances <= 21_000 ? 0.0175 : 0;
    const esiAmount = Math.round((basic + hra + allowances) * esiRate);

    const grossPay       = basic + hra + allowances + overtimePay;
    const totalDeductions = pfAmount + esiAmount;
    const netPay          = grossPay - totalDeductions;

    const payroll = await Payroll.create({
      employeeId: employee._id,
      month: parseInt(month),
      year: parseInt(year),
      payPeriod,
      earnings: {
        basic,
        hra,
        allowances,
        overtime: Math.round(overtimePay),
        bonus: 0,
      },
      deductions: {
        pf:      pfAmount,
        esi:     esiAmount,
        tax:     0,
        advance: 0,
        other:   0,
      },
      grossPay: Math.round(grossPay),
      totalDeductions: Math.round(totalDeductions),
      netPay: Math.round(netPay),
      workingDays,
      presentDays,
      leaveDays,
      status: "processed",
      processedBy: (session.user as any).employeeId,
      processedOn: new Date(),
    });

    created.push(payroll);
  }

  return NextResponse.json({ created: created.length, payrolls: created }, { status: 201 });
}
