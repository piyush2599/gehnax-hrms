import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import CRMLead from "@/models/CRMLead";

const WRITE_ROLES = ["super_admin", "manager", "employee", "sales"];

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => WRITE_ROLES.includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { id } = await params;

  const { type, title, description, outcome } = await req.json();
  if (!type || !title?.trim()) {
    return NextResponse.json({ error: "type and title are required" }, { status: 400 });
  }

  const lead = await CRMLead.findById(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  lead.activities.push({
    type,
    title: title.trim(),
    description: description?.trim(),
    outcome: outcome?.trim(),
    createdBy: (session.user as any).id,
    createdAt: new Date(),
  } as any);

  await lead.save();

  const updated = await CRMLead.findById(id)
    .populate("assignedTo", "firstName lastName employeeCode")
    .populate("createdBy", "name email")
    .populate("stageHistory.changedBy", "name")
    .populate("activities.createdBy", "name")
    .lean();

  return NextResponse.json({ lead: updated }, { status: 201 });
}
