/**
 * Lazy leave credit system.
 * Rules:
 *  - 2 leaves credited per calendar month
 *  - At every Jan 1 boundary ALL unused leaves lapse (reset to 0) — no carry-forward
 *  - Run this before any balance check or display
 */

export interface CreditResult {
  leaves: number;
  leaveCreditedMonth: number;
  leaveCreditedYear: number;
  monthsCredited: number;
}

export function calcLeaveCredits(employee: any): CreditResult {
  // Use IST for month/year boundaries
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(Date.now() + istOffset);
  const currentMonth = istNow.getUTCMonth() + 1;
  const currentYear  = istNow.getUTCFullYear();

  let leaves             = employee.leaveBalance?.leaves ?? 0;
  let leaveCreditedMonth = employee.leaveBalance?.leaveCreditedMonth ?? 0;
  let leaveCreditedYear  = employee.leaveBalance?.leaveCreditedYear  ?? 0;

  // First time — initialise from joining date
  if (leaveCreditedYear === 0) {
    const istOffset = 5.5 * 60 * 60 * 1000;
    const joining = employee.joiningDate ? new Date(employee.joiningDate) : new Date();
    const joiningIST = new Date(joining.getTime() + istOffset);
    leaveCreditedMonth = joiningIST.getUTCMonth() + 1;
    leaveCreditedYear  = joiningIST.getUTCFullYear();
    leaves = 0;
  }

  let m = leaveCreditedMonth;
  let y = leaveCreditedYear;
  let monthsCredited = 0;

  // Advance month-by-month until we reach current month
  while (y < currentYear || (y === currentYear && m < currentMonth)) {
    m++;
    if (m > 12) {
      m = 1;
      y++;
      // Year-end: ALL unused leaves lapse — reset to 0 before crediting Jan
      leaves = 0;
    }
    leaves += 2;
    monthsCredited++;
  }

  return { leaves, leaveCreditedMonth: m, leaveCreditedYear: y, monthsCredited };
}
