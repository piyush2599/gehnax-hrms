import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import OnboardingInvite from "@/models/OnboardingInvite";

export async function GET(
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

  const invite = await OnboardingInvite.findOne({ token: params.token })
    .populate("department", "name")
    .populate("createdBy", "name");

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  return NextResponse.json({ invite });
}
