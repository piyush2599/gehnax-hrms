import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import Task from "@/models/Task";

const VIEW_ROLES   = ["super_admin","finance_admin","hr_admin","manager","employee"];
const MANAGE_ROLES = ["super_admin","hr_admin","manager"];

function autoKey(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 6).toUpperCase();
  return words.map((w) => w[0]).join("").slice(0, 6).toUpperCase();
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  const userId   = (session.user as any).id;
  const empId    = (session.user as any).employeeId;

  if (!roles.some(r => VIEW_ROLES.includes(r))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status     = searchParams.get("status");
  const search     = searchParams.get("search");
  // activeRole sent by the client role-switcher — only trust it if it's actually in the user's roles
  const activeRole = searchParams.get("activeRole") ?? "";
  const effectiveRole = roles.includes(activeRole) ? activeRole : (roles[0] ?? "employee");

  const filter: any = {};

  // Restrict to assigned projects when viewing as employee
  const isEmployeeOnly = effectiveRole === "employee" ||
    !roles.some(r => ["super_admin", "finance_admin", "hr_admin", "manager"].includes(r));

  if (isEmployeeOnly) {
    filter.$or = empId
      ? [{ team: empId }, { manager: empId }]
      : [{ _id: null }]; // no linked employee record → show nothing
  }

  if (status && status !== "all") filter.status = status;
  if (search) {
    const searchConditions = [
      { name: { $regex: search, $options: "i" } },
      { key:  { $regex: search, $options: "i" } },
      { projectCode: { $regex: search, $options: "i" } },
    ];
    // Combine search with existing employee filter using $and
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
      delete filter.$or;
    } else {
      filter.$or = searchConditions;
    }
  }

  const projects = await Project.find(filter)
    .populate("manager",  "firstName lastName avatarData")
    .populate("team",     "firstName lastName avatarData")
    .populate("department", "name")
    .populate("purchaseOrder", "poNumber clientName totalAmount status")
    .sort({ createdAt: -1 });

  // Attach task counts
  const projectIds = projects.map((p) => p._id);
  const taskAggs = await Task.aggregate([
    { $match: { project: { $in: projectIds } } },
    { $group: { _id: { project: "$project", status: "$status" }, count: { $sum: 1 } } },
  ]);

  const countsMap: Record<string, any> = {};
  for (const agg of taskAggs) {
    const pid = agg._id.project.toString();
    if (!countsMap[pid]) countsMap[pid] = { total: 0, todo: 0, in_progress: 0, in_review: 0, done: 0, cancelled: 0 };
    countsMap[pid][agg._id.status] = agg.count;
    countsMap[pid].total += agg.count;
  }

  const result = projects.map((p: any) => ({
    ...p.toObject(),
    taskCounts: countsMap[p._id.toString()] ?? { total: 0, todo: 0, in_progress: 0, in_review: 0, done: 0, cancelled: 0 },
  }));

  // Stats
  const statsFilter = isEmployeeOnly
    ? (empId ? { $or: [{ team: empId }, { manager: empId }] } : { _id: null })
    : {};
  const all = await Project.find(statsFilter);
  const stats = {
    total: all.length,
    active: all.filter((p) => p.status === "active").length,
    planning: all.filter((p) => p.status === "planning").length,
    on_hold: all.filter((p) => p.status === "on_hold").length,
    completed: all.filter((p) => p.status === "completed").length,
  };

  return NextResponse.json({ projects: result, stats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  const userId = (session.user as any).id;
  if (!roles.some(r => MANAGE_ROLES.includes(r))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();

  const body = await req.json();
  const { name, description, type, priority, status, purchaseOrder, manager, team, department, startDate, dueDate, tags } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  // Generate project code
  const year  = new Date().getFullYear();
  const count = await Project.countDocuments();
  const projectCode = `PROJ-${year}-${String(count + 1).padStart(3, "0")}`;

  // Generate/validate key
  let key = (body.key?.trim() || autoKey(name)).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if (!key) key = autoKey(name);
  // Ensure uniqueness
  let keyCandidate = key;
  let suffix = 1;
  while (await Project.findOne({ key: keyCandidate })) {
    keyCandidate = key.slice(0, 5) + suffix++;
  }

  const project = await Project.create({
    projectCode,
    key: keyCandidate,
    name: name.trim(),
    description: description?.trim() || undefined,
    type:         type       || "internal",
    priority:     priority   || "medium",
    status:       status     || "planning",
    purchaseOrder: purchaseOrder || undefined,
    manager:       manager   || undefined,
    team:          Array.isArray(team) ? team : [],
    department:    department || undefined,
    startDate:     startDate || undefined,
    dueDate:       dueDate   || undefined,
    tags:          Array.isArray(tags) ? tags : [],
    createdBy:     userId,
  });

  const populated = await Project.findById(project._id)
    .populate("manager", "firstName lastName")
    .populate("team", "firstName lastName avatarData")
    .populate("department", "name")
    .populate("purchaseOrder", "poNumber clientName");

  return NextResponse.json(populated, { status: 201 });
}
