import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";

const SECRET = process.env.MIGRATION_SECRET;

// POST /api/admin/migrate-leaves
// Migrates employees from old annual/sick/casual leaveBalance to the new
// unified `leaves` field. Sets leaves = min(annual, 10) and seeds credit date
// to last month so the credit function picks up the current month on next request.
export async function POST(req: NextRequest) {
  if (!SECRET) return NextResponse.json({ error: "Disabled" }, { status: 403 });
  const authHeader = req.headers.get("x-migration-secret");
  if (authHeader !== SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const now  = new Date();
  const thisMonth = now.getMonth() + 1; // 1-12
  const thisYear  = now.getFullYear();

  // Previous month (so credit function will credit the current month on next call)
  const prevMonth = thisMonth === 1 ? 12 : thisMonth - 1;
  const prevYear  = thisMonth === 1 ? thisYear - 1 : thisYear;

  // Find employees not yet migrated (leaveCreditedYear === 0 or undefined)
  const employees = await Employee.find({
    $or: [
      { "leaveBalance.leaveCreditedYear": { $exists: false } },
      { "leaveBalance.leaveCreditedYear": 0 },
    ],
  }).select("leaveBalance joiningDate");

  let updated = 0;
  for (const emp of employees) {
    const annualBalance = (emp.leaveBalance as any)?.annual ?? 0;
    const initialLeaves = Math.min(annualBalance, 10); // carry-forward max is 10

    await Employee.findByIdAndUpdate(emp._id, {
      $set: {
        "leaveBalance.leaves":             initialLeaves,
        "leaveBalance.leaveCreditedMonth": prevMonth,
        "leaveBalance.leaveCreditedYear":  prevYear,
      },
    });
    updated++;
  }

  return NextResponse.json({ ok: true, updated });
}
