import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { istMonth, istYear } = await import("@/lib/ist");
  const currentMonth = istMonth();
  const currentYear  = istYear();
  const isJanuary    = currentMonth === 1;

  const employees = await Employee.find({ isActive: true }).select(
    "_id leaveBalance joiningDate"
  );

  let credited = 0;
  let skipped  = 0;

  for (const emp of employees) {
    const creditedMonth = emp.leaveBalance?.leaveCreditedMonth ?? 0;
    const creditedYear  = emp.leaveBalance?.leaveCreditedYear  ?? 0;

    // Already credited this month — skip
    if (creditedMonth === currentMonth && creditedYear === currentYear) {
      skipped++;
      continue;
    }

    const currentBalance = emp.leaveBalance?.leaves ?? 0;

    // January: lapse all previous leaves, start fresh at 2
    // Other months: add 2 to existing balance
    const newBalance = isJanuary ? 2 : currentBalance + 2;

    await Employee.findByIdAndUpdate(emp._id, {
      $set: {
        "leaveBalance.leaves":             newBalance,
        "leaveBalance.leaveCreditedMonth": currentMonth,
        "leaveBalance.leaveCreditedYear":  currentYear,
      },
    });

    credited++;
  }

  return NextResponse.json({
    success:   true,
    month:     currentMonth,
    year:      currentYear,
    isJanuary,
    credited,
    skipped,
  });
}
