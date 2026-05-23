import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import PurchaseOrder from "@/models/PurchaseOrder";

const VIEW_ROLES     = ["super_admin", "finance_admin", "manager", "hr_admin"];
const STATUS_ROLES   = ["super_admin", "finance_admin", "manager"];
const FULL_EDIT_ROLES = ["super_admin", "finance_admin"];

async function populated(id: string) {
  return PurchaseOrder.findById(id)
    .populate("assignedTo", "firstName lastName employeeCode")
    .populate("department", "name")
    .populate("createdBy",  "name email")
    .populate("statusHistory.changedBy", "name");
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!VIEW_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const po = await populated(params.id);
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(po);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!STATUS_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();

  const po = await PurchaseOrder.findById(params.id);
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body   = await req.json();
  const userId = (session.user as any).id;

  if (body.action === "status") {
    const { status, note } = body;
    const valid = ["received","acknowledged","in_progress","on_hold","delivered","invoiced","paid","cancelled"];
    if (!valid.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    po.status = status;
    po.statusHistory.push({ status, changedBy: userId, changedAt: new Date(), note: note?.trim() || undefined } as any);
    await po.save();
  } else if (FULL_EDIT_ROLES.includes(role)) {
    const {
      title, clientName, clientEmail, clientPhone, clientAddress, clientGSTIN,
      poDate, dueDate, priority, lineItems, taxRate, currency,
      paymentTerms, notes, internalNotes, assignedTo, department,
      invoiceNumber, invoiceDate, paymentReceivedDate, paymentAmount, paymentMode,
    } = body;

    if (title)         po.title      = title.trim();
    if (clientName)    po.clientName = clientName.trim();
    if (clientEmail   !== undefined) po.clientEmail   = clientEmail?.trim()   || undefined;
    if (clientPhone   !== undefined) po.clientPhone   = clientPhone?.trim()   || undefined;
    if (clientAddress !== undefined) po.clientAddress = clientAddress?.trim() || undefined;
    if (clientGSTIN   !== undefined) po.clientGSTIN   = clientGSTIN?.trim()   || undefined;
    if (poDate)        po.poDate   = new Date(poDate);
    if (dueDate       !== undefined) po.dueDate  = dueDate  ? new Date(dueDate)  : undefined;
    if (priority)      po.priority = priority;
    if (currency)      po.currency = currency;
    if (paymentTerms  !== undefined) po.paymentTerms  = paymentTerms?.trim()  || undefined;
    if (notes         !== undefined) po.notes         = notes?.trim()         || undefined;
    if (internalNotes !== undefined) po.internalNotes = internalNotes?.trim() || undefined;
    if (assignedTo    !== undefined) po.assignedTo    = assignedTo            || undefined;
    if (department    !== undefined) po.department    = department            || undefined;
    if (invoiceNumber !== undefined) po.invoiceNumber = invoiceNumber?.trim() || undefined;
    if (invoiceDate   !== undefined) po.invoiceDate   = invoiceDate   ? new Date(invoiceDate)   : undefined;
    if (paymentReceivedDate !== undefined) po.paymentReceivedDate = paymentReceivedDate ? new Date(paymentReceivedDate) : undefined;
    if (paymentAmount !== undefined) po.paymentAmount = paymentAmount ? Number(paymentAmount) : undefined;
    if (paymentMode   !== undefined) po.paymentMode   = paymentMode   || undefined;

    if (Array.isArray(lineItems)) {
      (po as any).lineItems = lineItems;
      const subtotal = lineItems.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
      const rate     = Number(taxRate ?? po.taxRate) || 18;
      po.taxRate   = rate;
      po.subtotal  = subtotal;
      po.taxAmount = Math.round(subtotal * rate / 100 * 100) / 100;
      po.totalAmount = Math.round((po.subtotal + po.taxAmount) * 100) / 100;
    } else if (taxRate !== undefined) {
      const rate   = Number(taxRate) || 18;
      po.taxRate   = rate;
      po.taxAmount = Math.round(po.subtotal * rate / 100 * 100) / 100;
      po.totalAmount = Math.round((po.subtotal + po.taxAmount) * 100) / 100;
    }

    await po.save();
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(await populated(params.id));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!FULL_EDIT_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();

  const po = await PurchaseOrder.findById(params.id);
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await po.deleteOne();
  return NextResponse.json({ message: "Deleted" });
}
