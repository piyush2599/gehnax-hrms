import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import OnboardingInvite from "@/models/OnboardingInvite";
import crypto from "crypto";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["super_admin", "hr_admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  await OnboardingInvite.updateMany(
    { status: { $in: ["pending", "in_progress"] }, expiresAt: { $lt: new Date() } },
    { $set: { status: "expired" } }
  );

  const invites = await OnboardingInvite.find()
    .populate("department", "name")
    .populate("createdBy", "name")
    .sort({ createdAt: -1 });

  return NextResponse.json({ invites });
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
  const { employeeCode, email, firstName, lastName, department, designation, employmentType, joiningDate } = body;

  if (!employeeCode || !email || !department || !designation || !joiningDate) {
    return NextResponse.json(
      { error: "Employee ID, email, department, designation and joining date are required" },
      { status: 400 }
    );
  }

  const existing = await OnboardingInvite.findOne({
    employeeCode,
    status: { $in: ["pending", "in_progress", "submitted"] },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An active onboarding invite already exists for this Employee ID" },
      { status: 409 }
    );
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await OnboardingInvite.create({
    token,
    employeeCode,
    email,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    department,
    designation,
    employmentType: employmentType || "full_time",
    joiningDate,
    expiresAt,
    createdBy: session.user.id,
  });

  return NextResponse.json({ invite }, { status: 201 });
}
