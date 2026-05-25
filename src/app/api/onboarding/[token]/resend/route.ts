import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import OnboardingInvite from "@/models/OnboardingInvite";
import { sendOnboardingInviteEmail } from "@/lib/email";

export async function POST(
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

  const invite = await OnboardingInvite.findOne({ token: params.token });
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  if (!["pending", "in_progress"].includes(invite.status)) {
    return NextResponse.json(
      { error: `Cannot resend — invite is ${invite.status}` },
      { status: 400 }
    );
  }

  const to = invite.personalEmail || invite.email;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${appUrl}/onboarding/${invite.token}`;
  const displayName = [invite.firstName, invite.lastName].filter(Boolean).join(" ");

  try {
    await sendOnboardingInviteEmail(to, displayName, inviteLink, invite.employeeCode, invite.designation);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[Resend invite] SMTP error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
