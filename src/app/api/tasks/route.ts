import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";
import Project from "@/models/Project";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project");
  const status    = searchParams.get("status");
  const assignee  = searchParams.get("assignee");
  const type      = searchParams.get("type");

  if (!projectId) return NextResponse.json({ error: "project param required" }, { status: 400 });

  const filter: any = { project: projectId };
  if (status   && status   !== "all") filter.status   = status;
  if (assignee && assignee !== "all") filter.assignee = assignee;
  if (type     && type     !== "all") filter.type      = type;

  const tasks = await Task.find(filter)
    .populate("assignee", "firstName lastName avatarData")
    .populate("reporter", "name email")
    .sort({ status: 1, order: 1, createdAt: 1 });

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  await connectDB();

  const body = await req.json();
  const { project: projectId, title, description, type, priority, status, assignee, dueDate, estimatedHours, labels, parentTask } = body;

  if (!projectId) return NextResponse.json({ error: "project is required" }, { status: 400 });
  if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const project = await Project.findById(projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Generate task code: KEY-N
  const taskCount = await Task.countDocuments({ project: projectId });
  const taskCode  = `${project.key}-${taskCount + 1}`;

  // Order: put at end of the column
  const lastTask = await Task.findOne({ project: projectId, status: status || "todo" }).sort({ order: -1 });
  const order = lastTask ? lastTask.order + 1 : 0;

  const task = await Task.create({
    taskCode,
    project: projectId,
    title:          title.trim(),
    description:    description?.trim() || undefined,
    type:           type       || "task",
    status:         status     || "todo",
    priority:       priority   || "medium",
    assignee:       assignee   || undefined,
    reporter:       userId,
    labels:         Array.isArray(labels) ? labels : [],
    dueDate:        dueDate    || undefined,
    estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
    parentTask:     parentTask || undefined,
    order,
    createdBy: userId,
  });

  const populated = await Task.findById(task._id)
    .populate("assignee", "firstName lastName avatarData")
    .populate("reporter", "name email");

  return NextResponse.json(populated, { status: 201 });
}
