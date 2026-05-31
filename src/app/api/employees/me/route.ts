import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import { calcLeaveCredits } from "@/lib/leave-credits";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const employeeId = (session.user as any).employeeId;

  const employee = await Employee.findById(employeeId)
    .populate("department", "name code")
    .populate("reportingManager", "firstName lastName");

  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Sync leave credits so profile always shows up-to-date balance
  try {
    const { leaves, leaveCreditedMonth, leaveCreditedYear, monthsCredited } = calcLeaveCredits(employee);
    if (monthsCredited > 0) {
      await Employee.findByIdAndUpdate(employeeId, {
        $set: {
          "leaveBalance.leaves":             leaves,
          "leaveBalance.leaveCreditedMonth": leaveCreditedMonth,
          "leaveBalance.leaveCreditedYear":  leaveCreditedYear,
        },
      });
      employee.leaveBalance = { ...employee.leaveBalance, leaves, leaveCreditedMonth, leaveCreditedYear } as any;
    }
  } catch {}

  return NextResponse.json(employee);
}
