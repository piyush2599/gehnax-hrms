import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Candidate from "@/models/Candidate";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const candidate = await Candidate.findById(params.id).populate("jobPosting", "title");

  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ candidate });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["super_admin", "hr_admin"].includes(role)) {
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

  const role = (session.user as any).role;
  if (role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const candidate = await Candidate.findByIdAndDelete(params.id);

  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ message: "Candidate deleted" });
}
