import SalaryRevision from "@/models/SalaryRevision";
import { computeSalary, daysInMonth, EmployeeSalary } from "@/lib/payroll-calc";

/**
 * Returns the salary structure effective during a given pay-period (year/month),
 * i.e. the latest revision whose effectiveFrom ≤ the last day of that month.
 * Falls back to the employee's current `salary` when no revision predates it.
 */
export async function getSalaryForPeriod(
  employeeId: any,
  year: number,
  month: number,
  currentSalary: EmployeeSalary,
): Promise<EmployeeSalary> {
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  const rev = await SalaryRevision.findOne({
    employeeId,
    effectiveFrom: { $lte: endOfMonth },
  })
    .sort({ effectiveFrom: -1 })
    .lean() as any;

  return rev?.salary ? (rev.salary as EmployeeSalary) : currentSalary;
}

/**
 * Computes arrears owed when a raise is back-dated over already-run payrolls.
 * For each affected month we recompute net at the new structure and compare to
 * what was actually paid, summing the positive differences.
 */
export interface ArrearsResult {
  totalArrears: number;
  breakdown: Array<{ payPeriod: string; oldNet: number; newNet: number; diff: number }>;
}

export function computeArrears(
  paidPayrolls: Array<{
    payPeriod: string; year: number; month: number;
    payableDays: number; netPay: number;
  }>,
  newSalary: EmployeeSalary,
): ArrearsResult {
  let totalArrears = 0;
  const breakdown: ArrearsResult["breakdown"] = [];

  for (const p of paidPayrolls) {
    const totalDays = daysInMonth(p.year, p.month);
    const recomputed = computeSalary(newSalary, {
      totalDays,
      payableDays: p.payableDays,
    });
    const diff = recomputed.netPay - p.netPay;
    if (diff > 0) {
      totalArrears += diff;
      breakdown.push({
        payPeriod: p.payPeriod,
        oldNet: p.netPay,
        newNet: recomputed.netPay,
        diff,
      });
    }
  }

  return { totalArrears: Math.round(totalArrears), breakdown };
}
