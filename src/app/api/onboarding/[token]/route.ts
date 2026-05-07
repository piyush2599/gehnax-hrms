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

  const invite = await OnboardingInvite.findOne({ token: params.token });

  if (!invite) {
    return NextResponse.json({ error: "Invalid onboarding link" }, { status: 404 });
  }

  if (!["in_progress", "pending"].includes(invite.status)) {
    return NextResponse.json({ error: "This form can no longer be edited" }, { status: 410 });
  }

  const { formData, submit, profilePicture } = await req.json();

  invite.formData = formData;
  invite.status = submit ? "submitted" : "in_progress";
  // Re-save profilePicture on every PUT so it is never lost
  if (profilePicture) invite.profilePicture = profilePicture;
  await invite.save();

  return NextResponse.json({ invite });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["super_admin", "hr_admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const invite = await OnboardingInvite.findOneAndDelete({ token: params.token });
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  return NextResponse.json({ message: "Invite deleted" });
}
