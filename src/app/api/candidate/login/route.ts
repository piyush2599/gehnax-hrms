import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import CandidateAccount from "@/models/CandidateAccount";
import { signCandidateToken, CANDIDATE_COOKIE } from "@/lib/candidate-auth";

export async function POST(req: NextRequest) {
  await connectDB();
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const account = await CandidateAccount.findOne({ email: email.toLowerCase(), isActive: true }).select("+password");
  if (!account) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const valid = await bcrypt.compare(password, account.password);
  if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = await signCandidateToken({ id: account._id.toString(), email: account.email });

  const res = NextResponse.json({
    account: { id: account._id, email: account.email, firstName: account.firstName, lastName: account.lastName },
  });

  res.cookies.set(CANDIDATE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  return res;
}
