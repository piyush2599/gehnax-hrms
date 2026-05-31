import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import AttendanceRegularization from "@/models/AttendanceRegularization";
import Employee from "@/models/Employee";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const roles: string[] = (session.user as any).roles || [];
  const empId = (session.user as any).employeeId;
  const isAdmin = roles.includes("super_admin");

  const query: any = isAdmin ? {} : { employeeId: empId };
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  if (status) query.status = status;

  const requests = await AttendanceRegularization.find(query)
    .populate("employeeId", "firstName lastName employeeCode department")
    .populate("reviewedBy", "name email")
    .sort({ createdAt: -1 });

  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const empId = (session.user as any).employeeId;
  if (!empId) return NextResponse.json({ error: "No employee profile linked" }, { status: 400 });

  const { date, requestedCheckIn, requestedCheckOut, reason } = await req.json();

  if (!date || !requestedCheckIn || !requestedCheckOut || !reason) {
    return NextResponse.json({ error: "Date, check-in, check-out and reason are required" }, { status: 400 });
  }

  const reqDate = new Date(date);
  reqDate.setHours(0, 0, 0, 0);

  // Can't regularize today or future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (reqDate >= today) {
    return NextResponse.json({ error: "Can only regularize past dates" }, { status: 400 });
  }

  // Check for existing pending request for same date
  const existing = await AttendanceRegularization.findOne({
    employeeId: empId,
    date: reqDate,
    status: "pending",
  });
  if (existing) {
    return NextResponse.json({ error: "A pending regularization request already exists for this date" }, { status: 409 });
  }

  const request = await AttendanceRegularization.create({
    employeeId: empId,
    date: reqDate,
    requestedCheckIn,
    requestedCheckOut,
    reason,
  });

  return NextResponse.json({ request }, { status: 201 });
}
