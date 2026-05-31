import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Candidate from "@/models/Candidate";
import { getCandidateSessionFromRequest } from "@/lib/candidate-auth";

export async function GET(req: NextRequest) {
  const session = await getCandidateSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const applications = await Candidate.find({ candidateAccountId: session.id })
    .populate("jobPosting", "title department employmentType location")
    .select("stage status offer appliedOn candidateAccountId jobPosting firstName lastName")
    .sort({ createdAt: -1 });

  return NextResponse.json({ applications });
}
