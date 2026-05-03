import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import JobPosting from "@/models/JobPosting";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const jobs = await JobPosting.find()
    .populate("department", "name code")
    .sort({ createdAt: -1 });

  return NextResponse.json({ jobs });
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
    title,
    department,
    description,
    requirements,
    positions,
    experienceMin,
    experienceMax,
    salaryMin,
    salaryMax,
    location,
    jobType,
    status,
  } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const job = await JobPosting.create({
    title,
    department: department || undefined,
    description,
    requirements: requirements || [],
    positions,
    experienceMin,
    experienceMax,
    salaryMin,
    salaryMax,
    location,
    jobType,
    status,
    createdBy: session.user.id,
  });

  return NextResponse.json({ job }, { status: 201 });
}
