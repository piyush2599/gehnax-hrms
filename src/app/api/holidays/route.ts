import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Holiday from "@/models/Holiday";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const year = parseInt(req.nextUrl.searchParams.get("year") || String(new Date().getFullYear()));

  const holidays = await Holiday.find({ year, isActive: true })
    .sort({ date: 1 })
    .lean();

  return NextResponse.json(holidays);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["super_admin", "hr_admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const { name, date, type, description } = body;

  if (!name || !date) {
    return NextResponse.json({ error: "Name and date are required" }, { status: 400 });
  }

  const holidayDate = new Date(date);
  const year = holidayDate.getFullYear();

  const holiday = await Holiday.create({
    name: name.trim(),
    date: holidayDate,
    type: type || "national",
    description,
    year,
    createdBy: (session.user as any).employeeId,
  });

  return NextResponse.json(holiday, { status: 201 });
}
