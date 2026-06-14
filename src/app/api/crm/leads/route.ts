import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import CRMLead, { STAGE_DEFAULT_PROBABILITY } from "@/models/CRMLead";
import Employee from "@/models/Employee";

const VIEW_ROLES  = ["super_admin", "finance_admin", "manager", "employee", "sales"];
const WRITE_ROLES = ["super_admin", "manager", "employee", "sales"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => VIEW_ROLES.includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const stage      = searchParams.get("stage")      || "";
  const priority   = searchParams.get("priority")   || "";
  const search     = searchParams.get("search")     || "";
  const assignedTo = searchParams.get("assignedTo") || "";
  const activeRole = searchParams.get("activeRole") || roles[0];

  const query: any = {};
  if (stage)      query.stage    = stage;
  if (priority)   query.priority = priority;
  if (assignedTo) query.assignedTo = assignedTo;

  // Employees without elevated roles only see leads assigned to them
  const isEmployeeOnly = activeRole === "employee" && !roles.some(r => ["super_admin","manager","finance_admin"].includes(r));
  if (isEmployeeOnly) {
    const emp = await Employee.findOne({ userId: (session.user as any).id }).select("_id").lean();
    if (!emp) return NextResponse.json({ leads: [], stats: { total: 0, pipelineValue: 0, pipelineCount: 0, wonThisMonthCount: 0, wonThisMonthValue: 0, conversionRate: 0, byStage: {} } });
    query.assignedTo = (emp as any)._id;
  }

  if (search) {
    query.$or = [
      { title:       { $regex: search, $options: "i" } },
      { accountName: { $regex: search, $options: "i" } },
      { contactName: { $regex: search, $options: "i" } },
      { leadNumber:  { $regex: search, $options: "i" } },
    ];
  }

  const [leads, allLeads] = await Promise.all([
    CRMLead.find(query)
      .populate("assignedTo", "firstName lastName employeeCode")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .select("-stageHistory -activities")
      .lean(),
    CRMLead.find(isEmployeeOnly ? { assignedTo: query.assignedTo } : {})
      .select("stage value updatedAt")
      .lean(),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const activeStages = ["new","contacted","qualified","proposal","negotiation"];

  const pipelineLeads    = allLeads.filter(l => activeStages.includes(l.stage));
  const wonAll           = allLeads.filter(l => l.stage === "won");
  const lostAll          = allLeads.filter(l => l.stage === "lost");
  const wonThisMonth     = wonAll.filter(l => new Date(l.updatedAt) >= monthStart);

  const stats = {
    total:               allLeads.length,
    pipelineValue:       pipelineLeads.reduce((s, l) => s + (l.value ?? 0), 0),
    pipelineCount:       pipelineLeads.length,
    wonThisMonthCount:   wonThisMonth.length,
    wonThisMonthValue:   wonThisMonth.reduce((s, l) => s + (l.value ?? 0), 0),
    conversionRate:      (wonAll.length + lostAll.length) > 0
      ? Math.round((wonAll.length / (wonAll.length + lostAll.length)) * 100)
      : 0,
    byStage: {} as Record<string, { count: number; value: number }>,
  };

  for (const l of allLeads) {
    if (!stats.byStage[l.stage]) stats.byStage[l.stage] = { count: 0, value: 0 };
    stats.byStage[l.stage].count++;
    stats.byStage[l.stage].value += l.value ?? 0;
  }

  return NextResponse.json({ leads, stats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => WRITE_ROLES.includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const body = await req.json();
  const { title, accountName, contactName, stage = "new" } = body;

  if (!title?.trim() || !accountName?.trim() || !contactName?.trim()) {
    return NextResponse.json({ error: "title, accountName and contactName are required" }, { status: 400 });
  }

  // Auto-generate lead number: LEAD-YYYY-NNN
  const year = new Date().getFullYear();
  const prefix = `LEAD-${year}-`;
  const last = await CRMLead.findOne({ leadNumber: { $regex: `^${prefix}` } })
    .sort({ leadNumber: -1 })
    .select("leadNumber")
    .lean();
  const seq = last ? parseInt((last as any).leadNumber.split("-")[2] || "0") + 1 : 1;
  const leadNumber = `${prefix}${String(seq).padStart(3, "0")}`;

  const probability = body.probability != null
    ? body.probability
    : STAGE_DEFAULT_PROBABILITY[stage as keyof typeof STAGE_DEFAULT_PROBABILITY] ?? 10;

  const lead = await CRMLead.create({
    ...body,
    leadNumber,
    probability,
    createdBy: (session.user as any).id,
    stageHistory: [{
      stage,
      probability,
      changedBy: (session.user as any).id,
      changedAt: new Date(),
    }],
  });

  const populated = await CRMLead.findById(lead._id)
    .populate("assignedTo", "firstName lastName employeeCode")
    .populate("createdBy", "name email")
    .lean();

  return NextResponse.json({ lead: populated }, { status: 201 });
}
