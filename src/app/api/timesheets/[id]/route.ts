import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Timesheet from "@/models/Timesheet";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const body = await req.json();
  const { status, reviewComments } = body;

  const role = (session.user as any).role;
  const sessionEmployeeId = (session.user as any).employeeId;

  if (!["super_admin", "hr_admin", "manager"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const timesheet = await Timesheet.findByIdAndUpdate(
    params.id,
    {
      status,
      reviewComments,
      reviewedBy: sessionEmployeeId,
      reviewedOn: new Date(),
    },
    { new: true }
  ).populate("employeeId", "firstName lastName");

  if (!timesheet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(timesheet);
}
