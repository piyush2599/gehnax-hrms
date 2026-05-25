import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const roles: string[] = (session.user as any).roles || [];
  const sessionEmployeeId = String((session.user as any).employeeId);

  const expense = await Expense.findById(params.id);
  if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  const body = await req.json();
  const { action, status, managerNote } = body;

  // Employee cancels their own pending expense
  if (action === "cancel") {
    if (String(expense.employeeId) !== sessionEmployeeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (expense.status !== "pending") {
      return NextResponse.json({ error: "Only pending expenses can be cancelled" }, { status: 400 });
    }
    expense.status = "rejected";
    expense.managerNote = "Cancelled by employee";
    await expense.save();
    return NextResponse.json(expense);
  }

  // Manager / HR approves or rejects
  if (!roles.some(r => ["super_admin", "hr_admin", "manager"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (expense.status !== "pending") {
    return NextResponse.json({ error: "Only pending expenses can be reviewed" }, { status: 400 });
  }

  expense.status = status;
  expense.reviewedBy = (session.user as any).employeeId;
  expense.reviewedAt = new Date();
  if (managerNote?.trim()) expense.managerNote = managerNote.trim();

  await expense.save();

  const populated = await expense.populate([
    { path: "employeeId", select: "firstName lastName employeeCode" },
    { path: "reviewedBy", select: "firstName lastName" },
  ]);

  return NextResponse.json(populated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const sessionEmployeeId = String((session.user as any).employeeId);
  const roles: string[] = (session.user as any).roles || [];

  const expense = await Expense.findById(params.id);
  if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  const isOwner = String(expense.employeeId) === sessionEmployeeId;
  const isAdmin = roles.some(r => ["super_admin", "hr_admin"].includes(r));

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (expense.status !== "pending") {
    return NextResponse.json({ error: "Only pending expenses can be deleted" }, { status: 400 });
  }

  await expense.deleteOne();
  return NextResponse.json({ message: "Deleted" });
}
