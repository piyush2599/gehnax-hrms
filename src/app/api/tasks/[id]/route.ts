import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";

const MANAGE_ROLES = ["super_admin","hr_admin","manager","finance_admin"];

async function populatedTask(id: string) {
  return Task.findById(id)
    .populate("assignee",   "firstName lastName avatarData employeeCode designation")
    .populate("reporter",   "name email")
    .populate("createdBy",  "name email")
    .populate("comments.author", "name email");
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const task = await populatedTask(params.id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role   = (session.user as any).role;
  const userId = (session.user as any).id;
  const empId  = (session.user as any).employeeId;

  await connectDB();
  const task = await Task.findById(params.id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // Employees can only update status of their own assigned tasks
  if (!MANAGE_ROLES.includes(role)) {
    const isAssigned = empId && task.assignee?.toString() === empId;
    if (!isAssigned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (body.status) task.status = body.status;
    await task.save();
    return NextResponse.json(await populatedTask(params.id));
  }

  // Managers/admins can update all fields
  const fields = ["title","description","type","status","priority","assignee","dueDate","estimatedHours","labels","parentTask"];
  for (const f of fields) {
    if (body[f] !== undefined) (task as any)[f] = body[f] || undefined;
  }
  if (body.title) task.title = body.title.trim();
  if (Array.isArray(body.labels)) task.labels = body.labels;
  if (body.order !== undefined) task.order = body.order;

  await task.save();
  return NextResponse.json(await populatedTask(params.id));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!MANAGE_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const task = await Task.findById(params.id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await task.deleteOne();
  return NextResponse.json({ message: "Deleted" });
}
