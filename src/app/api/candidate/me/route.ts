import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import CandidateAccount from "@/models/CandidateAccount";
import { getCandidateSessionFromRequest } from "@/lib/candidate-auth";

export async function GET(req: NextRequest) {
  const session = await getCandidateSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const account = await CandidateAccount.findById(session.id).select("-password");
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  return NextResponse.json({ account });
}
