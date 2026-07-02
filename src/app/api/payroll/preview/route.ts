import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { buildPayrollRows } from "@/lib/payroll-run";

/**
 * GET /api/payroll/preview?year=&month=
 * Dry run — computes every eligible employee's payroll WITHOUT saving, so HR can
 * review the full register before committing. Uses the same builder as the real run.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.includes("super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") || "");
  const year = parseInt(searchParams.get("year") || "");
  if (!month || !year || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid month/year" }, { status: 400 });
  }

  const { rows, skipped, payPeriod } = await buildPayrollRows(month, year);

  const totals = rows.reduce(
    (acc, r) => ({
      gross: acc.gross + r.grossPay,
      deductions: acc.deductions + r.totalDeductions,
      net: acc.net + r.netPay,
    }),
    { gross: 0, deductions: 0, net: 0 },
  );

  return NextResponse.json({ payPeriod, count: rows.length, rows, skipped, totals });
}
