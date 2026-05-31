/**
 * Lazy leave credit system.
 * Rules:
 *  - 2 leaves credited per calendar month
 *  - At every Jan 1 boundary (carry-forward), balance is capped at 10
 *  - Run this before any balance check or display
 */

export interface CreditResult {
  leaves: number;
  leaveCreditedMonth: number;
  leaveCreditedYear: number;
  monthsCredited: number;
}

export function calcLeaveCredits(employee: any): CreditResult {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear  = now.getFullYear();

  let leaves             = employee.leaveBalance?.leaves ?? 0;
  let leaveCreditedMonth = employee.leaveBalance?.leaveCreditedMonth ?? 0;
  let leaveCreditedYear  = employee.leaveBalance?.leaveCreditedYear  ?? 0;

  // First time — initialise from joining date
  if (leaveCreditedYear === 0) {
    const joining = employee.joiningDate ? new Date(employee.joiningDate) : now;
    leaveCreditedMonth = joining.getMonth() + 1;
    leaveCreditedYear  = joining.getFullYear();
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
      // Year-end carry-forward: cap at 10 before crediting Jan
      leaves = Math.min(leaves, 10);
    }
    leaves += 2;
    monthsCredited++;
  }

  return { leaves, leaveCreditedMonth: m, leaveCreditedYear: y, monthsCredited };
}
