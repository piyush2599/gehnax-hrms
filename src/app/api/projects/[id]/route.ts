import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import Task from "@/models/Task";

const VIEW_ROLES   = ["super_admin","finance_admin","hr_admin","manager","employee"];
const MANAGE_ROLES = ["super_admin","hr_admin","manager"];

async function populated(id: string) {
  return Project.findById(id)
    .populate("manager",       "firstName lastName avatarData employeeCode")
    .populate("team",          "firstName lastName avatarData employeeCode designation")
    .populate("department",    "name")
    .populate("purchaseOrder", "poNumber clientName totalAmount status priority")
    .populate("createdBy",     "name email");
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  const empId = (session.user as any).employeeId;
  if (!roles.some(r => VIEW_ROLES.includes(r))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const activeRole    = searchParams.get("activeRole") ?? "";
  const effectiveRole = roles.includes(activeRole) ? activeRole : (roles[0] ?? "employee");
  const isEmployeeView = effectiveRole === "employee" || !roles.some(r => ["super_admin","finance_admin","hr_admin","manager"].includes(r));

  await connectDB();
  const project = await populated(params.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Employee access guard
  if (isEmployeeView && empId) {
    const inTeam = project.team.some((m: any) => m._id.toString() === empId);
    const isManager = project.manager?._id?.toString() === empId;
    if (!inTeam && !isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Task counts
  const taskAgg = await Task.aggregate([
    { $match: { project: project._id } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const taskCounts: any = { total: 0, todo: 0, in_progress: 0, in_review: 0, done: 0, cancelled: 0 };
  for (const { _id, count } of taskAgg) {
    taskCounts[_id] = count;
    taskCounts.total += count;
  }

  return NextResponse.json({ ...project.toObject(), taskCounts });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => MANAGE_ROLES.includes(r))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const project = await Project.findById(params.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const fields = ["name","description","type","priority","status","purchaseOrder","manager","department","startDate","dueDate","tags"];
  for (const f of fields) {
    if (body[f] !== undefined) (project as any)[f] = body[f] || undefined;
  }
  if (Array.isArray(body.team)) project.team = body.team;
  if (body.status === "completed" && !project.completedAt) project.completedAt = new Date();
  if (body.status && body.status !== "completed") project.completedAt = undefined;
  if (body.name) project.name = body.name.trim();

  await project.save();
  return NextResponse.json(await populated(params.id));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => ["super_admin","hr_admin"].includes(r))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const project = await Project.findById(params.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await Task.deleteMany({ project: params.id });
  await project.deleteOne();
  return NextResponse.json({ message: "Deleted" });
}
