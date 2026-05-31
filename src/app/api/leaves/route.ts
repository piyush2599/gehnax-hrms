import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Leave from "@/models/Leave";
import Employee from "@/models/Employee";
import User from "@/models/User";
import { calcLeaveCredits } from "@/lib/leave-credits";
import { sendLeaveApplicationEmail } from "@/lib/email";

function countWeekdays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/** Apply pending leave credits to an employee and persist if changed. */
async function syncCredits(employee: any): Promise<number> {
  const { leaves, leaveCreditedMonth, leaveCreditedYear, monthsCredited } =
    calcLeaveCredits(employee);

  if (monthsCredited > 0) {
    await Employee.findByIdAndUpdate(employee._id, {
      $set: {
        "leaveBalance.leaves":             leaves,
        "leaveBalance.leaveCreditedMonth": leaveCreditedMonth,
        "leaveBalance.leaveCreditedYear":  leaveCreditedYear,
      },
    });
  }
  return leaves;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const status     = searchParams.get("status");
  const year       = searchParams.get("year");

  const roles: string[]    = (session.user as any).roles || [];
  let sessionEmployeeId    = (session.user as any).employeeId;
  const activeRole     = searchParams.get("activeRole") ?? "";
  const impersonateId  = searchParams.get("impersonateId") ?? "";
  const isImpersonating = !!impersonateId && roles.includes("super_admin");
  if (isImpersonating) sessionEmployeeId = impersonateId;
  const effectiveRole  = roles.includes(activeRole) ? activeRole : (roles[0] ?? "employee");
  const isEmployeeOnly = isImpersonating || effectiveRole === "employee" || !roles.some(r => ["super_admin","hr_admin","manager","finance_admin"].includes(r));

  const query: any = {};
  if (isEmployeeOnly) {
    query.employeeId = sessionEmployeeId;
  } else if (employeeId) {
    query.employeeId = employeeId;
  }
  if (status) query.status = status;
  if (year) {
    query.startDate = {
      $gte: new Date(parseInt(year), 0, 1),
      $lt:  new Date(parseInt(year) + 1, 0, 1),
    };
  }

  // Sync credits for the current employee so balance is always up-to-date (fire-and-forget safe)
  if (sessionEmployeeId) {
    try {
      const emp = await Employee.findById(sessionEmployeeId).select("leaveBalance joiningDate");
      if (emp) await syncCredits(emp);
    } catch {}
  }

  const leaves = await Leave.find(query)
    .populate("employeeId", "firstName lastName employeeCode department")
    .populate("reviewedBy", "firstName lastName")
    .sort({ appliedOn: -1 });

  return NextResponse.json(leaves);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const body = await req.json();
  const { startDate, endDate, reason } = body;
  const sessionEmployeeId = (session.user as any).employeeId;

  const employee = await Employee.findById(sessionEmployeeId).populate(
    "reportingManager",
    "email firstName lastName userId"
  );
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const start    = new Date(startDate);
  const end      = new Date(endDate);
  const totalDays = countWeekdays(start, end);

  if (totalDays <= 0) {
    return NextResponse.json({ error: "Invalid leave dates — no working days in range" }, { status: 400 });
  }

  // Sync and get up-to-date balance
  const currentBalance = await syncCredits(employee);

  if (currentBalance < totalDays) {
    return NextResponse.json(
      { error: `Insufficient leave balance. Available: ${currentBalance} day${currentBalance !== 1 ? "s" : ""}, Requested: ${totalDays} day${totalDays !== 1 ? "s" : ""}` },
      { status: 400 }
    );
  }

  // Check for overlapping leaves
  const overlap = await Leave.findOne({
    employeeId: sessionEmployeeId,
    status: { $in: ["pending", "approved"] },
    startDate: { $lte: end },
    endDate:   { $gte: start },
  });
  if (overlap) {
    return NextResponse.json({ error: "Leave dates overlap with an existing leave request" }, { status: 400 });
  }

  const leave = await Leave.create({
    employeeId: sessionEmployeeId,
    leaveType: "Leave",
    startDate: start,
    endDate: end,
    totalDays,
    reason,
  });

  // Notify manager + all HR admins (fire-and-forget, BCC admin is auto-applied in sendMail)
  try {
    const recipients: string[] = [];

    // Reporting manager's email
    const manager = employee.reportingManager as any;
    if (manager?.email) {
      recipients.push(manager.email);
    } else if (manager?.userId) {
      const mgrUser = await User.findById(manager.userId).select("email").lean() as any;
      if (mgrUser?.email) recipients.push(mgrUser.email);
    }

    // All HR admins + super admins
    const adminUsers = await User.find({
      roles: { $in: ["hr_admin", "super_admin"] },
      isActive: true,
    }).select("email").lean() as any[];
    for (const u of adminUsers) {
      if (u.email && !recipients.includes(u.email)) recipients.push(u.email);
    }

    if (recipients.length > 0) {
      sendLeaveApplicationEmail(
        recipients,
        `${employee.firstName} ${employee.lastName}`,
        employee.employeeCode,
        startDate,
        endDate,
        totalDays,
        reason,
      ).catch(() => {});
    }
  } catch {}

  return NextResponse.json(leave, { status: 201 });
}
