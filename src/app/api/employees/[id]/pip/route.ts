import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";

type Ctx = { params: { id: string } };

// HR initiates a PIP
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["super_admin", "hr_admin", "manager"].includes(role)) {
    return NextResponse.json({ error: "Only HR/Manager can initiate a PIP" }, { status: 403 });
  }

  await connectDB();
  const emp = await Employee.findById(params.id);
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  if (emp.pip?.status === "active") {
    return NextResponse.json({ error: "Employee already has an active PIP" }, { status: 400 });
  }

  const { goals, startDate, endDate, reviewDate, notes } = await req.json();
  if (!goals?.trim()) return NextResponse.json({ error: "Goals are required" }, { status: 400 });
  if (!startDate) return NextResponse.json({ error: "Start date is required" }, { status: 400 });
  if (!endDate)   return NextResponse.json({ error: "End date is required" }, { status: 400 });
  if (new Date(endDate) <= new Date(startDate)) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }

  emp.pip = {
    status: "active",
    goals: goals.trim(),
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    reviewDate: reviewDate ? new Date(reviewDate) : undefined,
    notes: notes?.trim() || undefined,
    initiatedBy: (session.user as any).id,
    initiatedAt: new Date(),
  };
  await emp.save();

  return NextResponse.json({ pip: emp.pip });
}

// HR updates PIP status (complete / cancel) or edits
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["super_admin", "hr_admin", "manager"].includes(role)) {
    return NextResponse.json({ error: "Only HR/Manager can update a PIP" }, { status: 403 });
  }

  await connectDB();
  const emp = await Employee.findById(params.id);
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (!emp.pip) return NextResponse.json({ error: "No PIP found" }, { status: 404 });

  const { action, goals, endDate, reviewDate, notes } = await req.json();

  if (action === "complete") {
    emp.pip.status = "completed";
    emp.pip.completedAt = new Date();
  } else if (action === "cancel") {
    emp.pip.status = "cancelled";
  } else {
    // Edit existing PIP
    if (goals?.trim())  emp.pip.goals = goals.trim();
    if (endDate)        emp.pip.endDate = new Date(endDate);
    if (reviewDate)     emp.pip.reviewDate = new Date(reviewDate);
    if (notes !== undefined) emp.pip.notes = notes?.trim() || undefined;
  }

  await emp.save();
  return NextResponse.json({ pip: emp.pip });
}
