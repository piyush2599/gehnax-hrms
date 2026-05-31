import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import OnboardingInvite from "@/models/OnboardingInvite";

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  await connectDB();

  const invite = await OnboardingInvite.findOne({ token: params.token }).populate(
    "department",
    "name"
  );

  if (!invite) {
    return NextResponse.json({ error: "Invalid onboarding link" }, { status: 404 });
  }

  if (invite.expiresAt < new Date() && !["completed", "expired"].includes(invite.status)) {
    invite.status = "expired";
    await invite.save();
  }

  if (invite.status === "expired") {
    return NextResponse.json({ error: "This onboarding link has expired" }, { status: 410 });
  }

  if (invite.status === "completed") {
    return NextResponse.json({ error: "This onboarding has already been completed" }, { status: 410 });
  }

  if (invite.status === "pending") {
    invite.status = "in_progress";
    await invite.save();
  }

  return NextResponse.json({ invite });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  await connectDB();

  const invite = await OnboardingInvite.findOne({ token: params.token }).select("status");

  if (!invite) {
    return NextResponse.json({ error: "Invalid onboarding link" }, { status: 404 });
  }

  if (!["in_progress", "pending"].includes(invite.status)) {
    return NextResponse.json({ error: "This form can no longer be edited" }, { status: 410 });
  }

  const { formData, submit, profilePicture } = await req.json();

  const update: any = {
    formData,
    status: submit ? "submitted" : "in_progress",
  };
  if (profilePicture) update.profilePicture = profilePicture;

  await OnboardingInvite.updateOne({ token: params.token }, { $set: update });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => ["super_admin", "hr_admin"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const invite = await OnboardingInvite.findOneAndDelete({ token: params.token });
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  return NextResponse.json({ message: "Invite deleted" });
}
