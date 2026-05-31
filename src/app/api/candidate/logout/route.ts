import { NextResponse } from "next/server";
import { CANDIDATE_COOKIE } from "@/lib/candidate-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CANDIDATE_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
