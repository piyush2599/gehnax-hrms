import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Leave from "@/models/Leave";
import Employee from "@/models/Employee";

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

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const status = searchParams.get("status");
  const year = searchParams.get("year");

  const roles: string[] = (session.user as any).roles || [];
  const sessionEmployeeId = (session.user as any).employeeId;

  const query: any = {};

  if (roles.every(r => r === "employee")) {
    query.employeeId = sessionEmployeeId;
  } else if (employeeId) {
    query.employeeId = employeeId;
  }

  if (status) query.status = status;

  if (year) {
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year) + 1, 0, 1);
    query.startDate = { $gte: startDate, $lt: endDate };
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
  const { leaveType, startDate, endDate, reason } = body;
  const sessionEmployeeId = (session.user as any).employeeId;

  const employee = await Employee.findById(sessionEmployeeId);
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = countWeekdays(start, end);

  if (totalDays <= 0) {
    return NextResponse.json({ error: "Invalid leave dates" }, { status: 400 });
  }

  // Check leave balance
  const balanceKey = leaveType.toLowerCase() as keyof typeof employee.leaveBalance;
  if (leaveType !== "Unpaid" && employee.leaveBalance[balanceKey] < totalDays) {
    return NextResponse.json(
      { error: `Insufficient ${leaveType} leave balance` },
      { status: 400 }
    );
  }

  // Check for overlapping leaves
  const overlap = await Leave.findOne({
    employeeId: sessionEmployeeId,
    status: { $in: ["pending", "approved"] },
    $or: [
      { startDate: { $lte: end }, endDate: { $gte: start } },
    ],
  });

  if (overlap) {
    return NextResponse.json({ error: "Leave dates overlap with existing leave" }, { status: 400 });
  }

  const leave = await Leave.create({
    employeeId: sessionEmployeeId,
    leaveType,
    startDate: start,
    endDate: end,
    totalDays,
    reason,
    attachmentUrl: body.attachmentUrl,
  });

  return NextResponse.json(leave, { status: 201 });
}
