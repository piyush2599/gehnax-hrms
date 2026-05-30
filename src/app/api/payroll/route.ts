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
  const sessionEmployeeId = (session.user as any).employeeId;

  const query: any = {};

  if (roles.every(r => r === "employee")) {
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
  if (!roles.some(r => ["super_admin", "hr_admin"].includes(r))) {
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
    // PF capped at EPFO wage ceiling of ₹15,000 (max ₹1,800/mo at 12%)
    const pfRate = 0.12;
    const pfAmount = Math.round(Math.min(basic, 15_000) * pfRate);
    const esiRate = basic + hra + allowances <= 21000 ? 0.0175 : 0;
    const esiAmount = (basic + hra + allowances) * esiRate;

    const grossPay = basic + hra + allowances + overtimePay;
    const totalDeductions = pfAmount + esiAmount + employee.salary.deductions;
    const netPay = grossPay - totalDeductions;

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
        pf: Math.round(pfAmount),
        esi: Math.round(esiAmount),
        tax: 0,
        advance: 0,
        other: employee.salary.deductions || 0,
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
