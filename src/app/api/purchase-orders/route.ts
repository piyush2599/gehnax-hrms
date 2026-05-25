import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import PurchaseOrder from "@/models/PurchaseOrder";

const VIEW_ROLES  = ["super_admin", "finance_admin", "manager", "hr_admin"];
const WRITE_ROLES = ["super_admin", "finance_admin", "manager"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => VIEW_ROLES.includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status")   || "";
  const priority = searchParams.get("priority") || "";
  const search   = searchParams.get("search")   || "";

  const query: any = {};
  if (status)   query.status   = status;
  if (priority) query.priority = priority;
  if (search) {
    query.$or = [
      { poNumber:   { $regex: search, $options: "i" } },
      { clientName: { $regex: search, $options: "i" } },
      { title:      { $regex: search, $options: "i" } },
    ];
  }

  const [pos, allPos] = await Promise.all([
    PurchaseOrder.find(query)
      .populate("assignedTo", "firstName lastName employeeCode")
      .populate("department", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean(),
    PurchaseOrder.find({}).select("status totalAmount priority").lean(),
  ]);

  const stats = {
    total:      allPos.length,
    totalValue: allPos.reduce((s, p) => s + (p.totalAmount ?? 0), 0),
    byStatus:   {} as Record<string, { count: number; value: number }>,
  };
  for (const p of allPos) {
    if (!stats.byStatus[p.status]) stats.byStatus[p.status] = { count: 0, value: 0 };
    stats.byStatus[p.status].count++;
    stats.byStatus[p.status].value += p.totalAmount ?? 0;
  }

  return NextResponse.json({ pos, stats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => WRITE_ROLES.includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const year = new Date().getFullYear();
  const lastPO = await PurchaseOrder.findOne(
    { poNumber: { $regex: `^PO-${year}-` } }
  ).sort({ poNumber: -1 });

  let seq = 1;
  if (lastPO?.poNumber) {
    const parts = lastPO.poNumber.split("-");
    seq = parseInt(parts[2] || "0") + 1;
  }
  const poNumber = `PO-${year}-${String(seq).padStart(3, "0")}`;

  const body = await req.json();
  const {
    title, clientName, clientEmail, clientPhone, clientAddress, clientGSTIN,
    poDate, dueDate, priority, status, lineItems,
    taxRate, currency, paymentTerms, notes, internalNotes,
    assignedTo, department, invoiceNumber, invoiceDate,
    paymentReceivedDate, paymentAmount, paymentMode,
  } = body;

  if (!title?.trim())      return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!clientName?.trim()) return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  if (!poDate)             return NextResponse.json({ error: "PO date is required" }, { status: 400 });

  const items    = Array.isArray(lineItems) ? lineItems : [];
  const subtotal = items.reduce((s: number, item: any) => s + (Number(item.amount) || 0), 0);
  const rateVal  = Number(taxRate) || 18;
  const taxAmt   = Math.round(subtotal * rateVal / 100 * 100) / 100;
  const total    = Math.round((subtotal + taxAmt) * 100) / 100;
  const userId   = (session.user as any).id;
  const initStatus = status || "received";

  const po = await PurchaseOrder.create({
    poNumber,
    title:         title.trim(),
    clientName:    clientName.trim(),
    clientEmail:   clientEmail?.trim()   || undefined,
    clientPhone:   clientPhone?.trim()   || undefined,
    clientAddress: clientAddress?.trim() || undefined,
    clientGSTIN:   clientGSTIN?.trim()   || undefined,
    poDate:        new Date(poDate),
    dueDate:       dueDate ? new Date(dueDate) : undefined,
    priority:      priority    || "medium",
    status:        initStatus,
    lineItems:     items,
    subtotal,
    taxRate:       rateVal,
    taxAmount:     taxAmt,
    totalAmount:   total,
    currency:      currency    || "INR",
    paymentTerms:        paymentTerms?.trim()   || undefined,
    notes:               notes?.trim()          || undefined,
    internalNotes:       internalNotes?.trim()  || undefined,
    assignedTo:          assignedTo             || undefined,
    department:          department             || undefined,
    invoiceNumber:       invoiceNumber?.trim()  || undefined,
    invoiceDate:         invoiceDate         ? new Date(invoiceDate)         : undefined,
    paymentReceivedDate: paymentReceivedDate ? new Date(paymentReceivedDate) : undefined,
    paymentAmount:       paymentAmount       ? Number(paymentAmount) : undefined,
    paymentMode:         paymentMode         || undefined,
    statusHistory: [{ status: initStatus, changedBy: userId, changedAt: new Date(), note: "PO created" }],
    createdBy: userId,
  });

  const populated = await po.populate([
    { path: "assignedTo", select: "firstName lastName employeeCode" },
    { path: "department", select: "name" },
    { path: "createdBy",  select: "name email" },
  ]);

  return NextResponse.json(populated, { status: 201 });
}
