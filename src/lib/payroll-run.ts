import Employee from "@/models/Employee";
import Payroll from "@/models/Payroll";
import Leave from "@/models/Leave";
import Attendance from "@/models/Attendance";
import SalaryAdvance from "@/models/SalaryAdvance";
import {
  computeSalary,
  daysInMonth,
  istParts,
  joinExitPayableDays,
  countUnpaidLeaveDays,
} from "@/lib/payroll-calc";
import { getSalaryForPeriod } from "@/lib/salary-history";

export interface PayrollRow {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  designation?: string;
  earnings: any;
  deductions: any;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  workingDays: number;
  payableDays: number;
  lopDays: number;
  presentDays: number;
  leaveDays: number;
  overtimeHours: number;
  arrears: number;
  advanceDeduction: number;
  advanceId?: string;
}

export interface SkippedRow {
  employeeName: string;
  employeeCode: string;
  reason: string;
}

/**
 * Computes payroll for every eligible employee for a month WITHOUT saving.
 * Shared by the dry-run preview and the real run so the numbers always match.
 */
export async function buildPayrollRows(
  month: number,
  year: number,
  employeeIds?: string[],
): Promise<{ rows: PayrollRow[]; skipped: SkippedRow[]; payPeriod: string }> {
  const payPeriod = `${year}-${String(month).padStart(2, "0")}`;

  const employees = employeeIds
    ? await Employee.find({ _id: { $in: employeeIds }, isActive: true }).select("+joiningDate +salary +terminationDate")
    : await Employee.find({ isActive: true }).select("+joiningDate +salary +terminationDate");

  const totalDays = daysInMonth(year, month);
  const winStart = new Date(Date.UTC(year, month - 1, 1) - 24 * 60 * 60 * 1000);
  const winEnd = new Date(Date.UTC(year, month, 1) + 24 * 60 * 60 * 1000);

  const rows: PayrollRow[] = [];
  const skipped: SkippedRow[] = [];

  for (const employee of employees) {
    const label = { employeeName: `${employee.firstName} ${employee.lastName}`, employeeCode: employee.employeeCode };

    const existing = await Payroll.findOne({ employeeId: employee._id, payPeriod });
    if (existing) {
      skipped.push({ ...label, reason: `Already processed (${existing.status})` });
      continue;
    }

    const proRataDays = joinExitPayableDays(year, month, employee.joiningDate, employee.terminationDate);
    if (proRataDays <= 0) {
      skipped.push({ ...label, reason: "Not employed during this month" });
      continue;
    }

    let winStartDay = 1;
    let winEndDay = totalDays;
    if (employee.joiningDate) {
      const j = istParts(new Date(employee.joiningDate));
      if (j.year === year && j.month === month) winStartDay = j.day;
    }
    if (employee.terminationDate) {
      const t = istParts(new Date(employee.terminationDate));
      if (t.year === year && t.month === month) winEndDay = t.day;
    }

    const leaves = await Leave.find({
      employeeId: employee._id,
      status: "approved",
      leaveType: "Unpaid",
      startDate: { $lte: winEnd },
      endDate: { $gte: winStart },
    }).lean();
    const lopDays = countUnpaidLeaveDays(leaves as any, year, month, winStartDay, winEndDay);
    const payableDays = Math.max(0, proRataDays - lopDays);

    const attendanceRecords = await Attendance.find({
      employeeId: employee._id,
      date: { $gte: winStart, $lt: winEnd },
    }).lean();
    const presentDays = attendanceRecords.filter((a: any) => ["present", "late", "half_day"].includes(a.status)).length;
    const paidLeaveDays = attendanceRecords.filter((a: any) => a.status === "on_leave").length;
    const overtimeHours = attendanceRecords.reduce((sum: number, a: any) => sum + (a.overtime || 0), 0);

    const periodSalary = await getSalaryForPeriod(employee._id, year, month, employee.salary);
    const arrears = Math.max(0, employee.pendingArrears || 0);

    const advance = await SalaryAdvance.findOne({
      employeeId: employee._id,
      status: "active",
      startPeriod: { $lte: payPeriod },
    });
    const advanceDeduction = advance ? Math.min(advance.emiAmount, advance.balance) : 0;

    const b = computeSalary(periodSalary, { totalDays, payableDays, overtimeHours, arrears, advanceDeduction });

    rows.push({
      employeeId: employee._id.toString(),
      ...label,
      designation: employee.designation,
      earnings: b.earnings,
      deductions: b.deductions,
      grossPay: b.grossPay,
      totalDeductions: b.totalDeductions,
      netPay: b.netPay,
      workingDays: totalDays,
      payableDays,
      lopDays,
      presentDays,
      leaveDays: paidLeaveDays,
      overtimeHours,
      arrears,
      advanceDeduction,
      advanceId: advance?._id?.toString(),
    });
  }

  return { rows, skipped, payPeriod };
}
