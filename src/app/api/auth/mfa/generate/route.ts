import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { authenticator } from "otplib";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findById((session.user as any).id).select(
    "+mfaSecret mfaEnabled mfaSkipCount mfaForceSetup name email"
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.mfaEnabled) {
    // Set the mfa-complete session cookie only for the setup flow (mfaSetupRequired),
    // not for the login-verify flow (mfaPending) — prevents bypassing login MFA.
    const isSecure = req.url.startsWith("https://");
    const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, cookieName });
    const mfaPending = !!(token as any)?.mfaPending;

    const res = NextResponse.json({ error: "MFA already enabled" }, { status: 400 });
    if (!mfaPending) {
      // JWT has stale mfaSetupRequired — give the session pass so redirect to dashboard works
      res.cookies.set("mfa-complete", "1", { httpOnly: true, sameSite: "lax", path: "/" });
    }
    return res;
  }

  // Generate (or regenerate) pending secret
  const secret = authenticator.generateSecret();
  user.mfaSecret = secret;
  await user.save();

  const account = user.name || user.email || "User";
  const otpauthUrl = authenticator.keyuri(account, "Gehnax HRMS", secret);
  const qrImage = await QRCode.toDataURL(otpauthUrl, { width: 240, margin: 2 });
  const formattedSecret = secret.match(/.{1,4}/g)?.join(" ") ?? secret;

  const mandatory = user.mfaSkipCount >= 5 || !!user.mfaForceSetup;
  return NextResponse.json({
    qrImage,
    secret: formattedSecret,
    skipCount: user.mfaSkipCount,
    mandatory,
    remaining: mandatory ? 0 : Math.max(0, 5 - user.mfaSkipCount),
  });
}
