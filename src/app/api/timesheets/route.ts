import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Timesheet from "@/models/Timesheet";

function getWeekBounds(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const status = searchParams.get("status");
  const weekDate = searchParams.get("weekDate");

  const roles: string[] = (session.user as any).roles || [];
  const sessionEmployeeId = (session.user as any).employeeId;

  const query: any = {};

  if (roles.every(r => r === "employee")) {
    query.employeeId = sessionEmployeeId;
  } else if (employeeId) {
    query.employeeId = employeeId;
  }

  if (status) query.status = status;

  if (weekDate) {
    const { weekStart, weekEnd } = getWeekBounds(new Date(weekDate));
    query.weekStartDate = weekStart;
  }

  const timesheets = await Timesheet.find(query)
    .populate("employeeId", "firstName lastName employeeCode")
    .populate("reviewedBy", "firstName lastName")
    .sort({ weekStartDate: -1 });

  return NextResponse.json(timesheets);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const body = await req.json();
  const { weekDate, entries, action } = body;
  const sessionEmployeeId = (session.user as any).employeeId;

  const { weekStart, weekEnd } = getWeekBounds(new Date(weekDate));
  const totalHours = entries.reduce((sum: number, e: any) => sum + e.hours, 0);

  const timesheet = await Timesheet.findOneAndUpdate(
    { employeeId: sessionEmployeeId, weekStartDate: weekStart },
    {
      employeeId: sessionEmployeeId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      entries,
      totalHours,
      status: action === "submit" ? "submitted" : "draft",
      submittedOn: action === "submit" ? new Date() : undefined,
    },
    { upsert: true, new: true }
  );

  return NextResponse.json(timesheet, { status: 201 });
}
