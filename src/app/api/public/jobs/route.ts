import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import JobPosting from "@/models/JobPosting";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();
  const jobs = await JobPosting.find({ status: "open" })
    .populate("department", "name")
    .sort({ createdAt: -1 })
    .select("-createdBy");
  return NextResponse.json({ jobs });
}
