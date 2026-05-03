import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import JobPosting from "@/models/JobPosting";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const job = await JobPosting.findOne({ _id: id, status: "open" })
    .populate("department", "name")
    .select("-createdBy");
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({ job });
}
