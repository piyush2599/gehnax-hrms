import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

// EMERGENCY DEV-ONLY ROUTE — resets all MFA and clears the session cookie
// Automatically disabled in production
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  await connectDB();

  const result = await User.updateMany(
    {},
    {
      $set: {
        mfaEnabled:    false,
        mfaSkipCount:  0,
        mfaForceSetup: false,
      },
      $unset: {
        mfaSecret:        "",
        mfaVerifiedAt:    "",
        mfaSkippedAt:     "",
        mfaDisabledUntil: "",
      },
    }
  );

  // Clear the session cookie and redirect straight to /login
  const loginUrl = new URL("/login", req.url);
  const res = NextResponse.redirect(loginUrl);
  res.cookies.set("authjs.session-token", "", { maxAge: 0, path: "/" });
  res.cookies.set("__Secure-authjs.session-token", "", { maxAge: 0, path: "/" });
  return res;
}
