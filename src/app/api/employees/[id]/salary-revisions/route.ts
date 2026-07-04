import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import Payroll from "@/models/Payroll";
import SalaryRevision from "@/models/SalaryRevision";
import { computeArrears } from "@/lib/salary-history";

function canManage(session: any): boolean {
  const roles: string[] = session?.user?.roles || [];
  return roles.some((r) => ["super_admin", "finance_admin"].includes(r));
}

// GET — revision history for an employee
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  const revisions = await SalaryRevision.find({ employeeId: params.id })
    .sort({ effectiveFrom: -1 })
    .populate("revisedBy", "name")
    .lean();
  return NextResponse.json({ revisions });
}

/**
 * POST — record a salary revision.
 * Body: { effectiveFrom, salary:{basic,hra,allowances,pf,tds,pfType}, reason }
 * Side effects:
 *   • snapshots the previous structure,
 *   • updates the employee's current `salary`,
 *   • if effectiveFrom precedes already-paid payrolls, queues arrears.
 */
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
  const emp = await Employee.findById(params.id).select("+salary");
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const body = await req.json();
  const { effectiveFrom, salary, reason } = body;
  if (!effectiveFrom || !salary) {
    return NextResponse.json({ error: "effectiveFrom and salary are required" }, { status: 400 });
  }

  const newSalary = {
    basic:      Number(salary.basic) || 0,
    hra:        Number(salary.hra) || 0,
    allowances: Number(salary.allowances) || 0,
    pf:         salary.pf != null ? Number(salary.pf) : emp.salary?.pf,
    tds:        salary.tds != null ? Number(salary.tds) : emp.salary?.tds,
    pfType:     salary.pfType || emp.salary?.pfType || "percent",
    deductions: emp.salary?.deductions || 0,
  };

  const prev = emp.salary ? JSON.parse(JSON.stringify(emp.salary)) : {};

  const revision = await SalaryRevision.create({
    employeeId:    params.id,
    effectiveFrom: new Date(effectiveFrom),
    salary:        newSalary,
    previousSalary: prev,
    reason,
    revisedBy:     (session.user as any).id,
  });

  // Update the "current" salary pointer
  emp.salary = { ...emp.salary, ...newSalary } as any;

  // Arrears: recompute already-paid months at the new structure if back-dated
  const effDate = new Date(effectiveFrom);
  const affected = await Payroll.find({
    employeeId: params.id,
    processedOn: { $exists: true },
  })
    .select("payPeriod year month payableDays netPay")
    .lean();

  const inScope = affected.filter((p: any) => {
    const periodEnd = new Date(Date.UTC(p.year, p.month, 0));
    return periodEnd >= effDate;
  });

  const { totalArrears, breakdown } = computeArrears(inScope as any, newSalary);
  if (totalArrears > 0) {
    emp.pendingArrears = (emp.pendingArrears || 0) + totalArrears;
  }
  await emp.save();

  return NextResponse.json(
    { revision, arrears: totalArrears, arrearsBreakdown: breakdown },
    { status: 201 },
  );
}
