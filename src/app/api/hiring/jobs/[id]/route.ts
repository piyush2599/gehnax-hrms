import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import JobPosting from "@/models/JobPosting";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const job = await JobPosting.findById(params.id).populate("department", "name code");

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ job });
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

  const job = await JobPosting.findByIdAndUpdate(params.id, body, {
    new: true,
    runValidators: true,
  }).populate("department", "name code");

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ job });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const job = await JobPosting.findByIdAndDelete(params.id);

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ message: "Job posting deleted" });
}
