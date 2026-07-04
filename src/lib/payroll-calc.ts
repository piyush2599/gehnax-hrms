/**
 * ─────────────────────────────────────────────────────────────────────────────
 * UNIFIED PAYROLL SALARY ENGINE  (single source of truth)
 * ─────────────────────────────────────────────────────────────────────────────
 * Both the Offer Letter (Salary Annexure) and the monthly Payslip derive their
 * numbers from THIS file only. Never recompute PF / ESI / TDS anywhere else —
 * that is what previously caused the offer letter and payslip to disagree.
 *
 * Statutory basis (India, FY 2025-26):
 *   • Employee PF        : 12% of Basic, capped at ₹15,000 wage ceiling
 *                          (or a fixed amount / none, per employee.salary.pfType)
 *   • Employer PF        : mirrors Employee PF (employer cost, part of CTC)
 *   • ESI (employee)     : 0.75% of Gross, only while Gross ≤ ₹21,000
 *   • Gratuity provision : Basic × 15 / 26 / 12  (employer cost, part of CTC)
 *   • Professional Tax   : 0 for Delhi (Gehnax HQ). Configurable per state.
 *   • TDS                : taken from employee.salary.tds (monthly)
 *
 * Pro-rata rule (calendar-day method):
 *   ratio = payableDays / totalDaysInMonth
 *   Weekends & holidays are PAID. Pay is reduced only by
 *     (a) mid-month join / exit, and
 *     (b) approved "Unpaid" leave days.
 *   Fixed PF is never pro-rated; every other component scales with the ratio.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type PFType = "fixed" | "percent" | "none";

export interface EmployeeSalary {
  basic: number;
  hra: number;
  allowances: number;
  deductions?: number;          // legacy: bundled PF+TDS (old records only)
  pf?: number | null;           // employee PF, monthly — 0/unset means NO PF
  tds?: number | null;          // income tax TDS, monthly (new records)
  pfType?: PFType | null;
  esiApplicable?: boolean;      // ESI only deducted when explicitly enabled
}

export interface ComputeOptions {
  totalDays: number;                 // calendar days in the pay month (28–31)
  payableDays: number;               // totalDays − unpaidLeave, and pro-rated for join/exit
  bonus?: number;                    // one-off earning (full amount, not pro-rated)
  arrears?: number;                  // retro / back-pay earning (full amount, not pro-rated)
  overtimeHours?: number;            // hours from attendance
  advanceDeduction?: number;         // salary advance recovery
  otherDeduction?: number;           // any other ad-hoc deduction
  professionalTaxMonthly?: number;   // default 0 (Delhi)
}

export interface SalaryBreakdown {
  ratio: number;
  earnings: {
    basic: number;
    hra: number;
    allowances: number;
    overtime: number;
    bonus: number;
    arrears: number;
  };
  deductions: {
    pf: number;      // employee PF
    esi: number;
    tax: number;     // TDS
    advance: number;
    other: number;   // ad-hoc other + professional tax
  };
  professionalTax: number;
  employerPF: number;     // employer cost (CTC), not deducted from net
  gratuity: number;       // employer cost (CTC), not deducted from net
  grossPay: number;
  totalDeductions: number;
  netPay: number;
}

export const PF_WAGE_CEILING = 15_000;
export const ESI_EMPLOYEE_RATE = 0.0075;   // 0.75%
export const ESI_GROSS_LIMIT = 21_000;

function round(n: number): number {
  return Math.round(n);
}

/**
 * Employee PF for a FULL month = exactly what's configured in the salary tab.
 * No auto-fallback: an unset/zero PF (or pfType "none") means NO PF deduction.
 * PF is only deducted for employees you explicitly enrol.
 */
export function fullMonthEmployeePF(sal: EmployeeSalary): number {
  if (sal.pfType === "none") return 0;
  return round(sal.pf || 0);
}

/** TDS for a FULL month = exactly what's configured in the salary tab (0 if unset). */
export function fullMonthTDS(sal: EmployeeSalary): number {
  return round(sal.tds || 0);
}

/** Gratuity provision (employer cost) for a full month. */
export function fullMonthGratuity(sal: EmployeeSalary): number {
  return round((sal.basic * 15) / 26 / 12);
}

/**
 * THE payroll calculation. Everything (payslip + offer letter) goes through here.
 */
export function computeSalary(sal: EmployeeSalary, opts: ComputeOptions): SalaryBreakdown {
  const totalDays = opts.totalDays > 0 ? opts.totalDays : 30;
  const payable = Math.max(0, Math.min(opts.payableDays, totalDays));
  const ratio = totalDays > 0 ? payable / totalDays : 1;

  const pfIsFixed = sal.pfType === "fixed";

  // ── Earnings (pro-rated) ──────────────────────────────────────────────────
  const basic = round(sal.basic * ratio);
  const hra = round(sal.hra * ratio);
  const allowances = round(sal.allowances * ratio);
  const proGross = basic + hra + allowances;

  const overtimeHours = opts.overtimeHours || 0;
  const overtime = totalDays > 0 && sal.basic > 0
    ? round((sal.basic / (totalDays * 8)) * overtimeHours)
    : 0;
  const bonus = round(opts.bonus || 0);
  const arrears = round(opts.arrears || 0);

  const grossPay = proGross + overtime + bonus + arrears;

  // ── Deductions ────────────────────────────────────────────────────────────
  const fullPF = fullMonthEmployeePF(sal);
  const pf = pfIsFixed ? fullPF : round(fullPF * ratio);          // fixed PF never pro-rated
  const employerPF = pf;                                          // employer mirrors employee

  // ESI only for employees explicitly enrolled AND within the wage limit
  const esi = sal.esiApplicable && proGross > 0 && proGross <= ESI_GROSS_LIMIT
    ? round(proGross * ESI_EMPLOYEE_RATE)
    : 0;
  const tax = round(fullMonthTDS(sal) * ratio);
  const professionalTax = round((opts.professionalTaxMonthly || 0) * ratio);
  const advance = round(opts.advanceDeduction || 0);
  const other = round(opts.otherDeduction || 0) + professionalTax;

  const totalDeductions = pf + esi + tax + advance + other;
  const netPay = grossPay - totalDeductions;

  const gratuity = round(fullMonthGratuity(sal) * ratio);

  return {
    ratio,
    earnings: { basic, hra, allowances, overtime, bonus, arrears },
    deductions: { pf, esi, tax, advance, other },
    professionalTax,
    employerPF,
    gratuity,
    grossPay,
    totalDeductions,
    netPay,
  };
}

/**
 * Full-month breakdown for the OFFER LETTER annexure (ratio = 1, no ad-hocs).
 * Guarantees the offer letter equals a full-month payslip for the same salary.
 */
export interface OfferSalaryView {
  basic: number;
  hra: number;
  allowances: number;
  grossMonthly: number;
  grossAnnual: number;
  employeePF: number;
  employerPF: number;
  esi: number;
  professionalTax: number;
  tds: number;
  totalDeductions: number;
  netMonthly: number;
  gratuity: number;
  annualCTC: number;
}

export function computeOfferSalary(
  sal: EmployeeSalary,
  professionalTaxMonthly = 0,
): OfferSalaryView {
  const b = computeSalary(sal, {
    totalDays: 30,
    payableDays: 30,          // full month, ratio = 1
    professionalTaxMonthly,
  });

  const grossMonthly = b.earnings.basic + b.earnings.hra + b.earnings.allowances;
  const grossAnnual = grossMonthly * 12;
  const annualCTC = grossAnnual + b.employerPF * 12 + b.gratuity * 12;

  return {
    basic: b.earnings.basic,
    hra: b.earnings.hra,
    allowances: b.earnings.allowances,
    grossMonthly,
    grossAnnual,
    employeePF: b.deductions.pf,
    employerPF: b.employerPF,
    esi: b.deductions.esi,
    professionalTax: b.professionalTax,
    tds: b.deductions.tax,
    totalDeductions: b.totalDeductions,
    netMonthly: b.netPay,
    gratuity: b.gratuity,
    annualCTC,
  };
}

/**
 * IST-normalised calendar parts. The app is India-only; storing/reading dates in
 * server-local (UTC on Vercel) shifted mid-month joiners by a day and could drop
 * pro-rata at month boundaries. Shift +5:30 then read UTC parts.
 */
export function istParts(date: Date): { year: number; month: number; day: number } {
  const shifted = new Date(date.getTime() + 330 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1, // 1–12
    day: shifted.getUTCDate(),
  };
}

/** Calendar days in a given month (month is 1–12). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Payable calendar days for the month, accounting for mid-month join / exit.
 * Weekends & holidays are included (paid). Unpaid-leave days are subtracted by
 * the caller.
 */
export function joinExitPayableDays(
  year: number,
  month: number,
  joiningDate?: Date | null,
  terminationDate?: Date | null,
): number {
  const total = daysInMonth(year, month);
  let startDay = 1;
  let endDay = total;

  if (joiningDate) {
    const j = istParts(new Date(joiningDate));
    if (j.year === year && j.month === month) startDay = j.day;
    // joined after this month → not payable at all
    if (j.year > year || (j.year === year && j.month > month)) return 0;
  }
  if (terminationDate) {
    const t = istParts(new Date(terminationDate));
    if (t.year === year && t.month === month) endDay = t.day;
    // left before this month → not payable
    if (t.year < year || (t.year === year && t.month < month)) return 0;
  }
  return Math.max(0, endDay - startDay + 1);
}

/**
 * Count approved "Unpaid" leave days that fall inside the payable window of a
 * month (clipped to [startDay, endDay]). LOP days reduce pay AND are shown as
 * Loss-of-Pay on the payslip, keeping the two consistent.
 */
export function countUnpaidLeaveDays(
  leaves: Array<{ startDate: Date; endDate: Date; leaveType: string; status: string }>,
  year: number,
  month: number,
  windowStartDay: number,
  windowEndDay: number,
): number {
  let count = 0;
  for (const lv of leaves) {
    if (lv.status !== "approved") continue;
    if (lv.leaveType !== "Unpaid") continue;
    const s = istParts(new Date(lv.startDate));
    const e = istParts(new Date(lv.endDate));

    // Iterate each day of the leave; count those inside this month's window.
    const cursor = new Date(Date.UTC(s.year, s.month - 1, s.day));
    const last = new Date(Date.UTC(e.year, e.month - 1, e.day));
    while (cursor.getTime() <= last.getTime()) {
      const y = cursor.getUTCFullYear();
      const m = cursor.getUTCMonth() + 1;
      const d = cursor.getUTCDate();
      if (y === year && m === month && d >= windowStartDay && d <= windowEndDay) {
        count += 1;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return count;
}
