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
  } = body;

  if (!firstName || !lastName || !email || !jobPosting) {
    return NextResponse.json({ error: "First name, last name, email and job are required" }, { status: 400 });
  }

  const job = await JobPosting.findOne({ _id: jobPosting, status: "open" });
  if (!job) return NextResponse.json({ error: "Job not found or no longer open" }, { status: 404 });

  const existing = await Candidate.findOne({ email: email.toLowerCase(), jobPosting });
  if (existing) {
    return NextResponse.json({ error: "You have already applied for this position" }, { status: 409 });
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
    source: "job_portal",
    stage: "applied",
  });

  return NextResponse.json({ success: true, candidateId: candidate._id }, { status: 201 });
}
