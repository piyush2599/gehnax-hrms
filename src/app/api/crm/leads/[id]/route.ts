import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import CRMLead, { STAGE_DEFAULT_PROBABILITY } from "@/models/CRMLead";

const VIEW_ROLES   = ["super_admin", "finance_admin", "manager", "employee", "sales"];
const WRITE_ROLES  = ["super_admin", "manager", "employee", "sales"];
const DELETE_ROLES = ["super_admin", "manager"];

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => VIEW_ROLES.includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { id } = await params;

  const lead = await CRMLead.findById(id)
    .populate("assignedTo", "firstName lastName employeeCode")
    .populate("createdBy", "name email")
    .populate("stageHistory.changedBy", "name")
    .populate("activities.createdBy", "name")
    .lean();

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ lead });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => WRITE_ROLES.includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const lead = await CRMLead.findById(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { stage: newStage, stageNote, ...rest } = body;

  // Track stage change in history
  if (newStage && newStage !== lead.stage) {
    const prob = rest.probability != null
      ? rest.probability
      : STAGE_DEFAULT_PROBABILITY[newStage as keyof typeof STAGE_DEFAULT_PROBABILITY] ?? lead.probability;

    lead.stageHistory.push({
      stage:       newStage,
      probability: prob,
      changedBy:   (session.user as any).id,
      changedAt:   new Date(),
      note:        stageNote,
    } as any);

    lead.stage = newStage;
    if (rest.probability == null) lead.probability = prob;
    if (newStage === "won" || newStage === "lost") {
      lead.actualCloseDate = new Date();
    }
  }

  // Apply remaining fields
  const allowed = ["title","accountName","contactName","contactEmail","contactPhone","contactDesignation","value","probability","expectedCloseDate","source","priority","product","description","assignedTo","lossReason","notes","tags"];
  for (const key of allowed) {
    if (key in rest) (lead as any)[key] = rest[key];
  }

  await lead.save();

  const updated = await CRMLead.findById(id)
    .populate("assignedTo", "firstName lastName employeeCode")
    .populate("createdBy", "name email")
    .populate("stageHistory.changedBy", "name")
    .populate("activities.createdBy", "name")
    .lean();

  return NextResponse.json({ lead: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => DELETE_ROLES.includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { id } = await params;

  const lead = await CRMLead.findByIdAndDelete(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
