import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Candidate from "@/models/Candidate";
import JobPosting from "@/models/JobPosting";

export async function POST(req: NextRequest) {
  await connectDB();

  const body = await req.json();
  const {
    firstName, lastName, email, phone,
    jobPosting, currentCompany, currentDesignation,
    totalExperience, skills, coverNote, resumeUrl,
    candidateAccountId,
  } = body;

  if (!firstName || !lastName || !email || !jobPosting) {
    return NextResponse.json({ error: "First name, last name, email and job are required" }, { status: 400 });
  }

  const job = await JobPosting.findOne({ _id: jobPosting, status: "open" });
  if (!job) return NextResponse.json({ error: "Job not found or no longer open" }, { status: 404 });

  // Check for duplicate — match on this specific job only
  const dupQuery: any = { jobPosting };
  if (candidateAccountId) {
    dupQuery.$or = [{ email: email.toLowerCase() }, { candidateAccountId }];
  } else {
    dupQuery.email = email.toLowerCase();
  }
  const existing = await Candidate.findOne(dupQuery).select("stage");
  if (existing) {
    const stageLabels: Record<string, string> = {
      applied: "Applied", screening: "Under Screening",
      interview: "Interview in Progress", offer: "Offer Extended",
      hired: "Hired", rejected: "Application Closed",
    };
    const stageMsg = stageLabels[existing.stage] || existing.stage;
    return NextResponse.json(
      { error: `You have already applied for this position. Current status: ${stageMsg}` },
      { status: 409 }
    );
  }

  const candidate = await Candidate.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.toLowerCase().trim(),
    phone: phone?.trim(),
    jobPosting,
    currentCompany: currentCompany?.trim(),
    currentDesignation: currentDesignation?.trim(),
    totalExperience: totalExperience ? Number(totalExperience) : 0,
    skills: skills ? skills.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
    notes: coverNote?.trim(),
    resumeUrl: resumeUrl?.trim() || undefined,
    candidateAccountId: candidateAccountId || undefined,
    source: "job_portal",
    stage: "applied",
  });

  return NextResponse.json({ success: true, candidateId: candidate._id }, { status: 201 });
}
