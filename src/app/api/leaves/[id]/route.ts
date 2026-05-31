import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Leave from "@/models/Leave";
import Employee from "@/models/Employee";
import Attendance from "@/models/Attendance";
import { sendLeaveStatusEmail } from "@/lib/email";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const body = await req.json();
  const { status, reviewComments, action } = body;

  const roles: string[] = (session.user as any).roles || [];
  const sessionEmployeeId = (session.user as any).employeeId;

  const leave = await Leave.findById(params.id).populate("employeeId");
  if (!leave) return NextResponse.json({ error: "Leave not found" }, { status: 404 });

  // Employee can cancel their own pending leave
  if (action === "cancel") {
    if (leave.employeeId._id.toString() !== sessionEmployeeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (leave.status !== "pending") {
      return NextResponse.json({ error: "Can only cancel pending leaves" }, { status: 400 });
    }
    leave.status = "cancelled";
    await leave.save();
    return NextResponse.json(leave);
  }

  // Approve/Reject (HR Admin, Manager)
  if (!roles.some(r => ["super_admin", "hr_admin", "manager"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const employee = leave.employeeId as any;

  if (status === "approved" && leave.status !== "approved") {
    // Deduct from unified leaves balance (legacy types also deduct from leaves)
    await Employee.findByIdAndUpdate(employee._id, {
      $inc: { "leaveBalance.leaves": -leave.totalDays },
    });

    // Mark attendance as on_leave for those days
    const current = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        const d = new Date(current);
        d.setHours(0, 0, 0, 0);
        await Attendance.findOneAndUpdate(
          { employeeId: employee._id, date: d },
          { status: "on_leave", employeeId: employee._id, date: d },
          { upsert: true }
        );
      }
      current.setDate(current.getDate() + 1);
    }
  }

  if (status === "rejected" && leave.status === "approved") {
    // Restore leaves balance
    await Employee.findByIdAndUpdate(employee._id, {
      $inc: { "leaveBalance.leaves": leave.totalDays },
    });
  }

  leave.status = status;
  leave.reviewedBy = sessionEmployeeId as any;
  leave.reviewedOn = new Date();
  leave.reviewComments = reviewComments;
  await leave.save();

  // Email the employee about the decision (fire-and-forget)
  try {
    const emp = await Employee.findById(employee._id).select("email firstName");
    if (emp?.email) {
      sendLeaveStatusEmail(
        emp.email,
        emp.firstName,
        status as "approved" | "rejected",
        leave.startDate.toISOString(),
        leave.endDate.toISOString(),
        leave.totalDays,
        reviewComments,
      ).catch(() => {});
    }
  } catch {}

  return NextResponse.json(leave);
}
