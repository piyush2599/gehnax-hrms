import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Announcement from "@/models/Announcement";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const announcements = await Announcement.find({ isActive: true })
    .populate("postedBy", "firstName lastName")
    .sort({ createdAt: -1 })
    .limit(20);

  return NextResponse.json(announcements);
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
  const sessionEmployeeId = (session.user as any).employeeId;

  const announcement = await Announcement.create({
    ...body,
    postedBy: sessionEmployeeId,
  });

  return NextResponse.json(announcement, { status: 201 });
}
