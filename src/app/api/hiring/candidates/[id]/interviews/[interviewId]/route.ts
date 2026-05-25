import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Candidate from "@/models/Candidate";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; interviewId: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["super_admin", "hr_admin"].includes(((session.user as any).roles || []))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const candidate = await Candidate.findById(params.id);
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const interview = (candidate.interviews as any[]).find(
    (i) => i._id.toString() === params.interviewId
  );
  if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

  const updates = await req.json();
  Object.assign(interview, updates);
  await candidate.save();

  return NextResponse.json({ interview });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; interviewId: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["super_admin", "hr_admin"].includes(((session.user as any).roles || []))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const candidate = await Candidate.findById(params.id);
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const idx = (candidate.interviews as any[]).findIndex(
    (i) => i._id.toString() === params.interviewId
  );
  if (idx === -1) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

  candidate.interviews.splice(idx, 1);
  await candidate.save();

  return NextResponse.json({ success: true });
}
