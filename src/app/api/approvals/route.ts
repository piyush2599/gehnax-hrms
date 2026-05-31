import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Candidate from "@/models/Candidate";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.includes("super_admin")) {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }

  await connectDB();

  const pending = await Candidate.find({ "offer.approvalStatus": "pending_approval" })
    .populate("jobPosting", "title department")
    .populate("offer.approvedBy", "name email")
    .select("firstName lastName email offer jobPosting stage createdAt")
    .sort({ "offer.generatedAt": -1 });

  return NextResponse.json({ offers: pending });
}
