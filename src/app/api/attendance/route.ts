import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Employee from "@/models/Employee";
import {
  todayStartIST, tomorrowStartIST, monthStartIST, nextMonthStartIST,
  istDayBounds, currentTimeIST, istHour, toISTDateString, nowIST,
} from "@/lib/ist";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const date = searchParams.get("date");

  const roles: string[] = (session.user as any).roles || [];
  let sessionEmployeeId = (session.user as any).employeeId;
  const activeRole  = searchParams.get("activeRole") ?? "";
  const impersonateId = searchParams.get("impersonateId") ?? "";

  const isImpersonating = !!impersonateId && roles.includes("super_admin");
  if (isImpersonating) sessionEmployeeId = impersonateId;

  const effectiveRole = roles.includes(activeRole) ? activeRole : (roles[0] ?? "employee");
  const isEmployeeView = isImpersonating || effectiveRole === "employee" || !roles.some(r => ["super_admin","finance_admin","hr_admin","manager"].includes(r));

  const query: any = {};

  if (isEmployeeView) {
    query.employeeId = sessionEmployeeId;
  } else if (employeeId) {
    query.employeeId = employeeId;
  }

  if (date) {
    const [start, end] = istDayBounds(date);
    query.date = { $gte: start, $lt: end };
  } else if (month && year) {
    const m = parseInt(month), y = parseInt(year);
    query.date = { $gte: monthStartIST(y, m), $lt: nextMonthStartIST(y, m) };
  }

  const attendance = await Attendance.find(query)
    .populate("employeeId", "firstName lastName employeeCode")
    .sort({ date: -1 });

  // For employee monthly view: compute absent days (weekdays with no record, before today)
  if (isEmployeeView && month && year) {
    const m = parseInt(month), y = parseInt(year);
    const todayStart = todayStartIST();
    const monthStart = monthStartIST(y, m);
    const monthEnd   = nextMonthStartIST(y, m);

    // Build set of recorded IST date strings
    const recordedDates = new Set(attendance.map((a: any) => toISTDateString(new Date(a.date))));
    const absentRecords: any[] = [];

    const cur = new Date(monthStart);
    while (cur < monthEnd && cur < todayStart) {
      const istStr = toISTDateString(cur);
      // day-of-week in IST
      const istDay = new Date(cur.getTime() + 5.5 * 60 * 60 * 1000).getUTCDay();
      if (istDay !== 0 && istDay !== 6 && !recordedDates.has(istStr)) {
        absentRecords.push({
          _id: `absent-${cur.toISOString()}`,
          employeeId: sessionEmployeeId,
          date: cur.toISOString(),
          status: "absent",
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          isComputed: true,
        });
      }
      cur.setTime(cur.getTime() + 86_400_000);
    }

    return NextResponse.json([...attendance, ...absentRecords]);
  }

  return NextResponse.json(attendance);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const body = await req.json();
  const { action } = body;

  const sessionEmployeeId = (session.user as any).employeeId;
  const roles: string[] = (session.user as any).roles || [];

  if (action === "checkin" || action === "checkout") {
    const employee = await Employee.findById(sessionEmployeeId);
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const today = todayStartIST();
    const now   = currentTimeIST(); // IST HH:MM

    let attendance = await Attendance.findOne({
      employeeId: sessionEmployeeId,
      date: today,
    });

    if (action === "checkin") {
      if (attendance) {
        return NextResponse.json({ error: "Already checked in today" }, { status: 400 });
      }

      const checkInHour = istHour(); // IST hour
      const isLate = checkInHour >= 10;

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

      const checkInTime  = new Date(`1970-01-01T${attendance.checkIn}`);
      const checkOutTime = new Date(`1970-01-01T${now}`);
      const workingHours = (checkOutTime.getTime() - checkInTime.getTime()) / 3_600_000;

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
    if (!roles.some(r => ["super_admin", "hr_admin", "manager"].includes(r))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { employeeId, date, checkIn, checkOut, status, notes } = body;

    const [dayStart] = istDayBounds(date);

    let workingHours = 0;
    if (checkIn && checkOut) {
      const start = new Date(`1970-01-01T${checkIn}`);
      const end   = new Date(`1970-01-01T${checkOut}`);
      workingHours = (end.getTime() - start.getTime()) / 3_600_000;
    }

    const attendance = await Attendance.findOneAndUpdate(
      { employeeId, date: dayStart },
      { checkIn, checkOut, status, notes, workingHours },
      { upsert: true, new: true }
    );

    return NextResponse.json(attendance);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
