import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Candidate from "@/models/Candidate";
import JobPosting from "@/models/JobPosting";
import { sendInterviewScheduledEmail } from "@/lib/email";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const candidate = await Candidate.findById(params.id).select("interviews");
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ interviews: candidate.interviews || [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["super_admin", "hr_admin"].includes(((session.user as any).roles || []))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const candidate = await Candidate.findById(params.id);
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { round, type, scheduledAt, interviewer, location, meetingLink, meetingInvite } = await req.json();
  if (!round || !type || !scheduledAt || !interviewer) {
    return NextResponse.json({ error: "round, type, scheduledAt and interviewer are required" }, { status: 400 });
  }

  candidate.interviews.push({ round, type, scheduledAt, interviewer, location, meetingLink, meetingInvite, status: "scheduled" } as any);
  await candidate.save();

  const added = candidate.interviews[candidate.interviews.length - 1];

  // Send interview invite email to candidate (fire-and-forget)
  try {
    const job = await JobPosting.findById(candidate.jobPosting).select("title").lean() as any;
    const jobTitle = job?.title ?? "the role";
    sendInterviewScheduledEmail(
      candidate.email,
      `${candidate.firstName} ${candidate.lastName}`,
      jobTitle,
      round,
      type,
      scheduledAt,
      interviewer,
      meetingLink,
      meetingInvite,
    ).catch(() => {});
  } catch {}

  return NextResponse.json({ interview: added }, { status: 201 });
}
