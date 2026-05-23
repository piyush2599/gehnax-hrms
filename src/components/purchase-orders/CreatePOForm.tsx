"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "sonner";
import { Plus, Trash2, IndianRupee } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

const BLANK_LINE: LineItem = { description: "", quantity: 1, unit: "units", rate: 0, amount: 0 };
const UNIT_OPTIONS = ["units","hrs","days","months","pieces","modules","licenses","tasks","others"];
const PAYMENT_TERMS = ["Advance","Net 15","Net 30","Net 45","Net 60","50% Advance, 50% on Delivery","On Completion","Monthly","Custom"];
const PRIORITY_OPTIONS = [
  { value: "low",    label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High" },
  { value: "urgent", label: "Urgent" },
];
const STATUS_OPTIONS = [
  { value: "received",     label: "Received" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "in_progress",  label: "In Progress" },
  { value: "on_hold",      label: "On Hold" },
  { value: "delivered",    label: "Delivered" },
  { value: "invoiced",     label: "Invoiced" },
  { value: "paid",         label: "Paid" },
  { value: "cancelled",    label: "Cancelled" },
];

function currency(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function toDateInput(d?: string) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

interface Props {
  editData?: any;
  onSuccess: (po?: any) => void;
  onCancel: () => void;
}

export default function CreatePOForm({ editData, onSuccess, onCancel }: Props) {
  const isEdit = !!editData;

  const { data: employees } = useSWR("/api/employees", fetcher);
  const { data: departments } = useSWR("/api/departments", fetcher);
  const empList  = Array.isArray(employees)  ? employees  : (employees?.employees  ?? []);
  const deptList = Array.isArray(departments)? departments: (departments?.departments ?? []);

  /* ── form state ── */
  const [title,        setTitle]        = useState("");
  const [clientName,   setClientName]   = useState("");
  const [clientEmail,  setClientEmail]  = useState("");
  const [clientPhone,  setClientPhone]  = useState("");
  const [clientGSTIN,  setClientGSTIN]  = useState("");
  const [clientAddress,setClientAddress]= useState("");
  const [poDate,       setPoDate]       = useState(new Date().toISOString().slice(0, 10));
  const [dueDate,      setDueDate]      = useState("");
  const [priority,     setPriority]     = useState("medium");
  const [status,       setStatus]       = useState("received");
  const [assignedTo,   setAssignedTo]   = useState("");
  const [department,   setDepartment]   = useState("");
  const [taxRate,      setTaxRate]      = useState(18);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [customTerms,  setCustomTerms]  = useState("");
  const [notes,        setNotes]        = useState("");
  const [internalNotes,setInternalNotes]= useState("");
  const [invoiceNumber,setInvoiceNumber]= useState("");
  const [invoiceDate,  setInvoiceDate]  = useState("");
  const [paymentReceivedDate, setPaymentReceivedDate] = useState("");
  const [paymentAmount,setPaymentAmount]= useState("");
  const [paymentMode,  setPaymentMode]  = useState("");
  const [lineItems,    setLineItems]    = useState<LineItem[]>([{ ...BLANK_LINE }]);
  const [saving,       setSaving]       = useState(false);

  /* ── populate from editData ── */
  useEffect(() => {
    if (!editData) return;
    setTitle(editData.title ?? "");
    setClientName(editData.clientName ?? "");
    setClientEmail(editData.clientEmail ?? "");
    setClientPhone(editData.clientPhone ?? "");
    setClientGSTIN(editData.clientGSTIN ?? "");
    setClientAddress(editData.clientAddress ?? "");
    setPoDate(toDateInput(editData.poDate));
    setDueDate(toDateInput(editData.dueDate));
    setPriority(editData.priority ?? "medium");
    setStatus(editData.status ?? "received");
    setAssignedTo(editData.assignedTo?._id ?? editData.assignedTo ?? "");
    setDepartment(editData.department?._id ?? editData.department ?? "");
    setTaxRate(editData.taxRate ?? 18);
    const pt = editData.paymentTerms ?? "";
    if (PAYMENT_TERMS.includes(pt) || pt === "") {
      setPaymentTerms(pt);
      setCustomTerms("");
    } else {
      setPaymentTerms("Custom");
      setCustomTerms(pt);
    }
    setNotes(editData.notes ?? "");
    setInternalNotes(editData.internalNotes ?? "");
    setInvoiceNumber(editData.invoiceNumber ?? "");
    setInvoiceDate(toDateInput(editData.invoiceDate));
    setPaymentReceivedDate(toDateInput(editData.paymentReceivedDate));
    setPaymentAmount(editData.paymentAmount ? String(editData.paymentAmount) : "");
    setPaymentMode(editData.paymentMode ?? "");
    const items = editData.lineItems?.length
      ? editData.lineItems.map((i: any) => ({
          description: i.description,
          quantity:    i.quantity,
          unit:        i.unit || "units",
          rate:        i.rate,
          amount:      i.amount,
        }))
      : [{ ...BLANK_LINE }];
    setLineItems(items);
  }, [editData]);

  /* ── line item helpers ── */
  const updateLine = useCallback((idx: number, field: keyof LineItem, val: string | number) => {
    setLineItems((prev) => {
      const next = [...prev];
      const row  = { ...next[idx], [field]: val };
      if (field === "quantity" || field === "rate") {
        row.amount = Math.round(Number(row.quantity) * Number(row.rate) * 100) / 100;
      }
      next[idx] = row;
      return next;
    });
  }, []);

  const addLine    = () => setLineItems((p) => [...p, { ...BLANK_LINE }]);
  const removeLine = (i: number) => setLineItems((p) => p.filter((_, idx) => idx !== i));

  /* ── totals ── */
  const subtotal = lineItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const taxAmt   = Math.round(subtotal * taxRate / 100 * 100) / 100;
  const total    = subtotal + taxAmt;

  /* ── submit ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim())      return toast.error("Title is required");
    if (!clientName.trim()) return toast.error("Client name is required");
    if (!poDate)            return toast.error("PO date is required");
    if (lineItems.some((i) => !i.description.trim())) {
      return toast.error("All line item descriptions are required");
    }

    const resolvedTerms = paymentTerms === "Custom" ? customTerms : paymentTerms;

    const body = {
      title, clientName, clientEmail, clientPhone, clientGSTIN, clientAddress,
      poDate, dueDate: dueDate || null, priority, status, lineItems,
      taxRate, currency: "INR",
      paymentTerms: resolvedTerms,
      notes, internalNotes,
      assignedTo:   assignedTo   || null,
      department:   department   || null,
      invoiceNumber: invoiceNumber || null,
      invoiceDate:   invoiceDate  || null,
      paymentReceivedDate: paymentReceivedDate || null,
      paymentAmount: paymentAmount ? Number(paymentAmount) : null,
      paymentMode:   paymentMode  || null,
    };

    setSaving(true);
    try {
      const url    = isEdit ? `/api/purchase-orders/${editData._id}` : "/api/purchase-orders";
      const method = isEdit ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data   = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success(isEdit ? "Purchase order updated" : "Purchase order created");
      onSuccess(data);
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Section: Basic Info ── */}
          <Section title="PO Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Title <span className="text-red-500">*</span></Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Website Redesign Project" className="mt-1" />
              </div>
              <div>
                <Label>PO Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Due / Delivery Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Priority</Label>
                <NativeSelect value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1">
                  {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label>Status</Label>
                <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1">
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label>Assigned To</Label>
                <NativeSelect value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="mt-1">
                  <option value="">— Select employee —</option>
                  {empList.map((e: any) => (
                    <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <Label>Department</Label>
                <NativeSelect value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-1">
                  <option value="">— Select department —</option>
                  {deptList.map((d: any) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>
          </Section>

          {/* ── Section: Client Info ── */}
          <Section title="Client Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Client / Company Name <span className="text-red-500">*</span></Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="ABC Corp Ltd." className="mt-1" />
              </div>
              <div>
                <Label>Client Email</Label>
                <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="contact@client.com" className="mt-1" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+91 98765 43210" className="mt-1" />
              </div>
              <div>
                <Label>GSTIN</Label>
                <Input value={clientGSTIN} onChange={(e) => setClientGSTIN(e.target.value)} placeholder="27AAPFU0939F1ZV" className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <Label>Address</Label>
                <Textarea value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Client billing address" rows={2} className="mt-1 resize-none" />
              </div>
            </div>
          </Section>

          {/* ── Section: Line Items ── */}
          <Section title="Line Items">
            <div className="space-y-2">
              <div className="grid gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 hidden sm:grid" style={{ gridTemplateColumns: "1fr 70px 80px 90px 90px 32px" }}>
                <span>Description</span>
                <span>Qty</span>
                <span>Unit</span>
                <span>Rate (₹)</span>
                <span>Amount (₹)</span>
                <span></span>
              </div>
              {lineItems.map((item, idx) => (
                <div key={idx} className="grid gap-2 items-center" style={{ gridTemplateColumns: "1fr 70px 80px 90px 90px 32px" }}>
                  <Input
                    value={item.description}
                    onChange={(e) => updateLine(idx, "description", e.target.value)}
                    placeholder="Service / item description"
                    className="text-sm"
                  />
                  <Input
                    type="number" min="0" step="0.5"
                    value={item.quantity}
                    onChange={(e) => updateLine(idx, "quantity", parseFloat(e.target.value) || 0)}
                    className="text-sm text-center"
                  />
                  <NativeSelect value={item.unit} onChange={(e) => updateLine(idx, "unit", e.target.value)} className="text-sm">
                    {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </NativeSelect>
                  <Input
                    type="number" min="0" step="0.01"
                    value={item.rate}
                    onChange={(e) => updateLine(idx, "rate", parseFloat(e.target.value) || 0)}
                    className="text-sm text-right"
                  />
                  <div className="h-9 flex items-center justify-end pr-2 text-sm font-medium text-slate-700 bg-slate-50 rounded-md border border-slate-200">
                    {(item.amount).toLocaleString("en-IN")}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={lineItems.length === 1}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1.5 mt-1 text-xs">
                <Plus className="w-3.5 h-3.5" /> Add Line Item
              </Button>
            </div>

            {/* Totals */}
            <div className="mt-4 ml-auto w-full sm:w-72 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{currency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-2">
                  <span>GST / Tax (%)</span>
                  <Input
                    type="number" min="0" max="100" step="0.5"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-16 h-7 text-xs text-center"
                  />
                </div>
                <span>{currency(taxAmt)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-200 pt-1.5">
                <span>Total</span>
                <div className="flex items-center gap-0.5">
                  <IndianRupee className="w-4 h-4" />
                  <span>{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Section: Payment & Terms ── */}
          <Section title="Payment & Terms">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Payment Terms</Label>
                <NativeSelect value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="mt-1">
                  <option value="">— Select —</option>
                  {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                  <option value="Custom">Custom</option>
                </NativeSelect>
                {paymentTerms === "Custom" && (
                  <Input value={customTerms} onChange={(e) => setCustomTerms(e.target.value)} placeholder="Describe payment terms" className="mt-2" />
                )}
              </div>
              <div>
                <Label>Invoice Number</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-2026-001" className="mt-1" />
              </div>
              <div>
                <Label>Invoice Date</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Payment Mode</Label>
                <NativeSelect value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="mt-1">
                  <option value="">— Select —</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </NativeSelect>
              </div>
              <div>
                <Label>Payment Received Date</Label>
                <Input type="date" value={paymentReceivedDate} onChange={(e) => setPaymentReceivedDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Payment Amount Received</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                  <Input type="number" min="0" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="pl-7" placeholder="0.00" />
                </div>
              </div>
            </div>
          </Section>

          {/* ── Section: Notes ── */}
          <Section title="Notes">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Client-Facing Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notes visible to client (e.g. on invoice)" className="mt-1 resize-none" />
              </div>
              <div>
                <Label>Internal Notes</Label>
                <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={3} placeholder="Internal team notes (not shared with client)" className="mt-1 resize-none" />
              </div>
            </div>
          </Section>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create PO"}
            </Button>
          </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-1.5 border-b border-slate-100">{title}</h3>
      {children}
    </div>
  );
}
