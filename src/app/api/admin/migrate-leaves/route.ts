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

  // Policy: all currently onboarded employees start leave from July 2026.
  // Set creditedMonth=6, creditedYear=2026 (June) so the credit function
  // fires 2 leaves in July on first API call. Reset balance to 0.
  const POLICY_MONTH = 6;   // June — so July is the first credited month
  const POLICY_YEAR  = 2026;

  const result = await Employee.updateMany(
    { isActive: true },
    {
      $set: {
        "leaveBalance.leaves":             0,
        "leaveBalance.leaveCreditedMonth": POLICY_MONTH,
        "leaveBalance.leaveCreditedYear":  POLICY_YEAR,
      },
    }
  );

  return NextResponse.json({ ok: true, updated: result.modifiedCount });
}
