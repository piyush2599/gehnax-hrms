import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";

type Ctx = { params: { id: string } };

// Employee submits resignation
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const emp = await Employee.findById(params.id);
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const myEmpId = (session.user as any).employeeId?.toString();
  const role = (session.user as any).role;
  const isHR = ["super_admin", "hr_admin"].includes(role);
  const isOwner = myEmpId === params.id;

  if (!isOwner && !isHR) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (emp.resignation?.status === "pending" || emp.resignation?.status === "accepted") {
    return NextResponse.json({ error: "Resignation already submitted" }, { status: 400 });
  }

  const { lastWorkingDay, reason } = await req.json();
  if (!lastWorkingDay) return NextResponse.json({ error: "Last working day is required" }, { status: 400 });

  if (new Date(lastWorkingDay) <= new Date()) {
    return NextResponse.json({ error: "Last working day must be in the future" }, { status: 400 });
  }

  emp.resignation = {
    submittedAt: new Date(),
    lastWorkingDay: new Date(lastWorkingDay),
    reason: reason?.trim() || undefined,
    status: "pending",
  };
  await emp.save();

  return NextResponse.json({ resignation: emp.resignation });
}

// HR accepts / HR rejects / Employee withdraws
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const emp = await Employee.findById(params.id);
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const myEmpId = (session.user as any).employeeId?.toString();
  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const isHR = ["super_admin", "hr_admin"].includes(role);
  const isOwner = myEmpId === params.id;

  const { action, hrNotes } = await req.json();

  if (action === "withdraw") {
    if (!isOwner && !isHR) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (emp.resignation?.status !== "pending") {
      return NextResponse.json({ error: "Only pending resignations can be withdrawn" }, { status: 400 });
    }
    emp.resignation.status = "withdrawn";
    await emp.save();
    return NextResponse.json({ resignation: emp.resignation });
  }

  if (action === "accept") {
    if (!isHR) return NextResponse.json({ error: "Only HR can accept resignations" }, { status: 403 });
    if (emp.resignation?.status !== "pending") {
      return NextResponse.json({ error: "No pending resignation to accept" }, { status: 400 });
    }
    emp.resignation.status = "accepted";
    emp.resignation.acceptedBy = userId;
    emp.resignation.acceptedAt = new Date();
    if (hrNotes) emp.resignation.hrNotes = hrNotes;
    await emp.save();
    return NextResponse.json({ resignation: emp.resignation });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
