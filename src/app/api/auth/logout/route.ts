import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Clear the MFA session pass alongside the sign-out flow
  res.cookies.set("mfa-complete", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
