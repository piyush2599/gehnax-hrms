import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findById((session.user as any).id).select("mfaEnabled mfaSkipCount");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.mfaEnabled) return NextResponse.json({ error: "MFA already enabled" }, { status: 400 });
  if (user.mfaSkipCount >= 10) {
    return NextResponse.json({ error: "Skip limit reached. MFA setup is now mandatory." }, { status: 400 });
  }

  user.mfaSkipCount = (user.mfaSkipCount || 0) + 1;
  user.mfaSkippedAt = new Date();
  await user.save();

  // Set short-lived cookie — middleware reads this to bypass stale JWT flags
  const res = NextResponse.json({ skipCount: user.mfaSkipCount, remaining: 10 - user.mfaSkipCount });
  res.cookies.set("mfa-complete", "1", { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
