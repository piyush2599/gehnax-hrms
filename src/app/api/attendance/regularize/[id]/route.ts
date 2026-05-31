import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import AttendanceRegularization from "@/models/AttendanceRegularization";
import Attendance from "@/models/Attendance";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.includes("super_admin")) {
    return NextResponse.json({ error: "Only Super Admin can review regularization requests" }, { status: 403 });
  }

  await connectDB();

  const { action, reviewComments } = await req.json();
  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const request = await AttendanceRegularization.findById(params.id);
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status !== "pending") {
    return NextResponse.json({ error: "Request already reviewed" }, { status: 400 });
  }

  request.status = action === "approve" ? "approved" : "rejected";
  request.reviewedBy = (session.user as any).id;
  request.reviewedAt = new Date();
  request.reviewComments = reviewComments || undefined;
  await request.save();

  if (action === "approve") {
    const start = new Date(`1970-01-01T${request.requestedCheckIn}`);
    const end   = new Date(`1970-01-01T${request.requestedCheckOut}`);
    const workingHours = Math.max(0, parseFloat(((end.getTime() - start.getTime()) / 3600000).toFixed(2)));

    await Attendance.findOneAndUpdate(
      { employeeId: request.employeeId, date: request.date },
      {
        $set: {
          employeeId: request.employeeId,
          date:       request.date,
          checkIn:    request.requestedCheckIn,
          checkOut:   request.requestedCheckOut,
          status:     "present",
          workingHours,
          notes:      `Regularized — ${request.reason}`,
        },
      },
      { upsert: true }
    );
  }

  return NextResponse.json({ ok: true, request });
}
