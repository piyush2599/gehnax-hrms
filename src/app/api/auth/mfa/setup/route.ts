import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { authenticator } from "otplib";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { otp } = await req.json();
  if (!otp) return NextResponse.json({ error: "Verification code is required" }, { status: 400 });

  await connectDB();
  const user = await User.findById((session.user as any).id).select("+mfaSecret mfaEnabled");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.mfaEnabled) return NextResponse.json({ error: "MFA already enabled" }, { status: 400 });
  if (!user.mfaSecret) return NextResponse.json({ error: "No pending MFA setup. Please refresh." }, { status: 400 });

  const isValid = authenticator.verify({ token: otp.replace(/\s/g, ""), secret: user.mfaSecret });
  if (!isValid) return NextResponse.json({ error: "Invalid code. Try again." }, { status: 400 });

  user.mfaEnabled    = true;
  user.mfaForceSetup = false;
  user.mfaVerifiedAt = new Date();
  await user.save();

  // Set short-lived cookie — middleware reads this to bypass stale JWT flags
  const res = NextResponse.json({ success: true });
  res.cookies.set("mfa-complete", "1", { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
