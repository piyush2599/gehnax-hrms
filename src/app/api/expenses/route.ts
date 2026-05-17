import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import Employee from "@/models/Employee";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const role = (session.user as any).role;
  const sessionEmployeeId = (session.user as any).employeeId;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const employeeId = searchParams.get("employeeId") || "";

  const query: any = {};

  if (!["super_admin", "hr_admin", "manager"].includes(role)) {
    query.employeeId = sessionEmployeeId;
  } else if (employeeId) {
    query.employeeId = employeeId;
  }

  if (status) query.status = status;

  const expenses = await Expense.find(query)
    .populate("employeeId", "firstName lastName employeeCode department")
    .populate("reviewedBy", "firstName lastName")
    .sort({ submittedAt: -1 });

  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const sessionEmployeeId = (session.user as any).employeeId;
  if (!sessionEmployeeId) {
    return NextResponse.json({ error: "Employee record not found" }, { status: 400 });
  }

  const body = await req.json();
  const { title, category, amount, expenseDate, description, receiptUrl, receiptName, receiptType } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!category) return NextResponse.json({ error: "Category is required" }, { status: 400 });
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
  }
  if (!expenseDate) return NextResponse.json({ error: "Expense date is required" }, { status: 400 });
  if (!receiptUrl) return NextResponse.json({ error: "Receipt is required" }, { status: 400 });

  const expense = await Expense.create({
    employeeId: sessionEmployeeId,
    title: title.trim(),
    category,
    amount: Number(amount),
    expenseDate: new Date(expenseDate),
    description: description?.trim() || undefined,
    receiptUrl,
    receiptName: receiptName || undefined,
    receiptType: receiptType || undefined,
    status: "pending",
    submittedAt: new Date(),
  });

  const populated = await expense.populate("employeeId", "firstName lastName employeeCode");
  return NextResponse.json(populated, { status: 201 });
}
