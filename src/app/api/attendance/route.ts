import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Employee from "@/models/Employee";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const date = searchParams.get("date");

  const role = (session.user as any).role;
  const sessionEmployeeId = (session.user as any).employeeId;

  const query: any = {};

  if (["employee"].includes(role)) {
    query.employeeId = sessionEmployeeId;
  } else if (employeeId) {
    query.employeeId = employeeId;
  }

  if (date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);
    query.date = { $gte: d, $lt: nextDay };
  } else if (month && year) {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 1);
    query.date = { $gte: startDate, $lt: endDate };
  }

  const attendance = await Attendance.find(query)
    .populate("employeeId", "firstName lastName employeeCode")
    .sort({ date: -1 });

  return NextResponse.json(attendance);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const body = await req.json();
  const { action } = body; // "checkin" | "checkout" | "manual"

  const sessionEmployeeId = (session.user as any).employeeId;
  const role = (session.user as any).role;

  if (action === "checkin" || action === "checkout") {
    const employee = await Employee.findById(sessionEmployeeId);
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;

    let attendance = await Attendance.findOne({
      employeeId: sessionEmployeeId,
      date: today,
    });

    if (action === "checkin") {
      if (attendance) {
        return NextResponse.json({ error: "Already checked in today" }, { status: 400 });
      }

      const checkInHour = new Date().getHours();
      const isLate = checkInHour >= 10; // Late if after 10 AM

      attendance = await Attendance.create({
        employeeId: sessionEmployeeId,
        date: today,
        checkIn: now,
        status: isLate ? "late" : "present",
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      });
    } else {
      if (!attendance || !attendance.checkIn) {
        return NextResponse.json({ error: "Not checked in yet" }, { status: 400 });
      }

      const checkInTime = new Date(`1970-01-01T${attendance.checkIn}`);
      const checkOutTime = new Date(`1970-01-01T${now}`);
      const workingHours = (checkOutTime.getTime() - checkInTime.getTime()) / 3600000;

      attendance = await Attendance.findByIdAndUpdate(
        attendance._id,
        {
          checkOut: now,
          workingHours: Math.round(workingHours * 100) / 100,
          overtime: workingHours > 8 ? Math.round((workingHours - 8) * 100) / 100 : 0,
        },
        { new: true }
      );
    }

    return NextResponse.json(attendance);
  }

  // Manual attendance (HR/Admin only)
  if (action === "manual") {
    if (!["super_admin", "hr_admin", "manager"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { employeeId, date, checkIn, checkOut, status, notes } = body;

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    let workingHours = 0;
    if (checkIn && checkOut) {
      const start = new Date(`1970-01-01T${checkIn}`);
      const end = new Date(`1970-01-01T${checkOut}`);
      workingHours = (end.getTime() - start.getTime()) / 3600000;
    }

    const attendance = await Attendance.findOneAndUpdate(
      { employeeId, date: d },
      { checkIn, checkOut, status, notes, workingHours },
      { upsert: true, new: true }
    );

    return NextResponse.json(attendance);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
