import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import SalaryAdvance from "@/models/SalaryAdvance";
import FinalSettlement from "@/models/FinalSettlement";
import { computeSalary, daysInMonth, istParts, hasGratuity } from "@/lib/payroll-calc";
import { getSalaryForPeriod } from "@/lib/salary-history";

function canManage(session: any): boolean {
  const roles: string[] = session?.user?.roles || [];
  return roles.some((r) => ["super_admin", "finance_admin"].includes(r));
}

async function buildSettlement(empId: string, lwdInput?: string, extra?: any) {
  const emp = await Employee.findById(empId).select("+salary +joiningDate +terminationDate").lean() as any;
  if (!emp) return { error: "Employee not found" as const };

  const lwd = lwdInput
    ? new Date(lwdInput)
    : emp.resignation?.lastWorkingDay
      ? new Date(emp.resignation.lastWorkingDay)
      : emp.terminationDate
        ? new Date(emp.terminationDate)
        : null;
  if (!lwd) return { error: "No last working day set. Provide lastWorkingDay." as const };

  const { year, month, day } = istParts(lwd);
  const periodSalary = await getSalaryForPeriod(empId, year, month, emp.salary);
  const totalDays = daysInMonth(year, month);

  // Final-month salary pro-rated to the last working day
  const joinDay = (() => {
    if (!emp.joiningDate) return 1;
    const j = istParts(new Date(emp.joiningDate));
    return j.year === year && j.month === month ? j.day : 1;
  })();
  const payableDays = Math.max(0, day - joinDay + 1);
  const finalMonth = computeSalary(periodSalary, { totalDays, payableDays });
  const salaryPayable = finalMonth.netPay;

  // Leave encashment: unused paid leaves × per-day basic (basic / 30)
  const encashableLeaves = Math.max(0, emp.leaveBalance?.leaves || 0);
  const perDayBasic = (periodSalary.basic || 0) / 30;
  const leaveEncashment = Math.round(encashableLeaves * perDayBasic);

  // Gratuity if tenure ≥ 5 years (Payment of Gratuity Act): basic × 15/26 × years.
  // Only for employees whose salary card is gratuity-eligible (defaults to: has PF).
  let gratuity = 0;
  if (emp.joiningDate && hasGratuity(periodSalary)) {
    const years = (lwd.getTime() - new Date(emp.joiningDate).getTime()) / (365.25 * 24 * 3600 * 1000);
    if (years >= 5) gratuity = Math.round((periodSalary.basic || 0) * (15 / 26) * Math.floor(years));
  }

  // Outstanding advances recovered in full
  const advances = await SalaryAdvance.find({ employeeId: empId, status: "active" }).lean();
  const advanceRecovery = advances.reduce((s: number, a: any) => s + (a.balance || 0), 0);

  const bonus = Number(extra?.bonus) || 0;
  const otherEarnings = Number(extra?.otherEarnings) || 0;
  const noticeRecovery = Number(extra?.noticeRecovery) || 0;
  const tds = Number(extra?.tds) || 0;
  const otherDeductions = Number(extra?.otherDeductions) || 0;

  const grossPayable = salaryPayable + leaveEncashment + gratuity + bonus + otherEarnings;
  const totalDeductions = advanceRecovery + noticeRecovery + tds + otherDeductions;
  const netSettlement = grossPayable - totalDeductions;

  return {
    employeeId: empId,
    lastWorkingDay: lwd,
    salaryPayable, leaveEncashment, gratuity, bonus, otherEarnings,
    advanceRecovery, noticeRecovery, tds, otherDeductions,
    grossPayable, totalDeductions, netSettlement,
    encashableLeaves,
    finalMonth: { year, month, payableDays, totalDays },
  };
}

// GET — live preview of the settlement
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const result = await buildSettlement(params.id, searchParams.get("lastWorkingDay") || undefined, {
    noticeRecovery: searchParams.get("noticeRecovery"),
    bonus: searchParams.get("bonus"),
    tds: searchParams.get("tds"),
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  const existing = await FinalSettlement.findOne({ employeeId: params.id }).lean();
  return NextResponse.json({ preview: result, existing });
}

// POST — persist the settlement
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session)) {
    return NextResponse.json({ error: "Forbidden — Admin/Finance only" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const result = await buildSettlement(params.id, body.lastWorkingDay, body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  const { finalMonth, ...doc } = result;
  void finalMonth;

  const settlement = await FinalSettlement.findOneAndUpdate(
    { employeeId: params.id },
    { ...doc, notes: body.notes, processedBy: (session.user as any).id, status: body.status || "draft" },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // Close recovered advances
  if (body.status === "approved" || body.status === "paid") {
    await SalaryAdvance.updateMany(
      { employeeId: params.id, status: "active" },
      { status: "closed" },
    );
  }

  return NextResponse.json({ settlement }, { status: 201 });
}
