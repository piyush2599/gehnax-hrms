import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Candidate from "@/models/Candidate";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const stage = searchParams.get("stage");

  const query: Record<string, unknown> = {};
  if (jobId) query.jobPosting = jobId;
  if (stage) query.stage = stage;

  const candidates = await Candidate.find(query)
    .populate("jobPosting", "title")
    .sort({ createdAt: -1 });

  return NextResponse.json({ candidates });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["super_admin", "hr_admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const body = await req.json();
  const {
    firstName,
    lastName,
    email,
    phone,
    jobPosting,
    currentCompany,
    currentDesignation,
    totalExperience,
    skills,
    source,
    notes,
  } = body;

  if (!firstName || !lastName || !email || !jobPosting) {
    return NextResponse.json(
      { error: "firstName, lastName, email and jobPosting are required" },
      { status: 400 }
    );
  }

  const candidate = await Candidate.create({
    firstName,
    lastName,
    email,
    phone,
    jobPosting,
    currentCompany,
    currentDesignation,
    totalExperience,
    skills: skills || [],
    source,
    notes,
    createdBy: session.user.id,
  });

  return NextResponse.json({ candidate }, { status: 201 });
}
