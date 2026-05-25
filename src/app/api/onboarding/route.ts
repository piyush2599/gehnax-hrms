import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import OnboardingInvite from "@/models/OnboardingInvite";
import crypto from "crypto";
import { sendOnboardingInviteEmail } from "@/lib/email";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => ["super_admin", "hr_admin"].includes(r))) {
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

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => ["super_admin", "hr_admin"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const body = await req.json();
  const { employeeCode, email, personalEmail, firstName, lastName, department, designation, employmentType, joiningDate } = body;

  if (!employeeCode || !email || !personalEmail || !department || !designation || !joiningDate) {
    return NextResponse.json(
      { error: "Employee ID, work email, personal email, department, designation and joining date are required" },
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
    personalEmail: personalEmail.trim().toLowerCase(),
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    department,
    designation,
    employmentType: employmentType || "full_time",
    joiningDate,
    expiresAt,
    createdBy: session.user.id,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${appUrl}/onboarding/${token}`;
  const displayName = [firstName, lastName].filter(Boolean).join(" ");
  try {
    await sendOnboardingInviteEmail(personalEmail.trim().toLowerCase(), displayName, inviteLink, employeeCode, designation);
  } catch (emailErr) {
    console.error("[Onboarding] Failed to send invite email to", personalEmail, emailErr);
  }

  return NextResponse.json({ invite }, { status: 201 });
}
