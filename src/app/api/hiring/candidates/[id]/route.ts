import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Candidate from "@/models/Candidate";
import CandidateAccount from "@/models/CandidateAccount";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const candidate = await Candidate.findById(params.id).populate("jobPosting", "title");

  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If no resume on the candidate but they applied via the portal, fetch & sync from their account
  if (!candidate.resumeUrl && candidate.candidateAccountId) {
    const account = await CandidateAccount.findById(candidate.candidateAccountId)
      .select("resumeUrl")
      .lean() as any;
    if (account?.resumeUrl) {
      candidate.resumeUrl = account.resumeUrl;
      await Candidate.findByIdAndUpdate(params.id, { resumeUrl: account.resumeUrl });
    }
  }

  return NextResponse.json({ candidate });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => ["super_admin", "hr_admin"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const body = await req.json();

  const candidate = await Candidate.findByIdAndUpdate(
    params.id,
    body,
    { new: true, runValidators: true }
  ).populate("jobPosting", "title");

  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ candidate });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.includes("super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const candidate = await Candidate.findByIdAndDelete(params.id);

  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ message: "Candidate deleted" });
}
