"use client";

import { useState } from "react";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "sonner";
import {
  X, Pencil, Trash2, RefreshCw, IndianRupee, Building2,
  User, Calendar, Phone, Mail, MapPin, FileText,
  CreditCard, Clock, CheckCircle2, StickyNote,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { STATUS_LABEL, STATUS_COLORS, PRIORITY_COLORS } from "./PurchaseOrdersClient";

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

const STATUS_ICONS: Record<string, React.ReactNode> = {
  received:     <Clock        className="w-3.5 h-3.5" />,
  acknowledged: <CheckCircle2 className="w-3.5 h-3.5" />,
  in_progress:  <RefreshCw    className="w-3.5 h-3.5" />,
  on_hold:      <Clock        className="w-3.5 h-3.5" />,
  delivered:    <CheckCircle2 className="w-3.5 h-3.5" />,
  invoiced:     <FileText     className="w-3.5 h-3.5" />,
  paid:         <CreditCard   className="w-3.5 h-3.5" />,
  cancelled:    <X            className="w-3.5 h-3.5" />,
};

function currency(n: number) {
  return "₹" + (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

interface Props {
  po: any;
  canWrite: boolean;
  canDelete: boolean;
  onClose: () => void;
  onEdit: (po: any) => void;
  onDelete: (id: string) => void;
  onStatusChange: (updated: any) => void;
}

export default function PODetailDialog({ po, canWrite, canDelete, onClose, onEdit, onDelete, onStatusChange }: Props) {
  const [statusOpen,  setStatusOpen]  = useState(false);
  const [newStatus,   setNewStatus]   = useState(po.status);
  const [statusNote,  setStatusNote]  = useState("");
  const [updating,    setUpdating]    = useState(false);

  async function handleStatusUpdate() {
    if (newStatus === po.status && !statusNote.trim()) {
      setStatusOpen(false);
      return;
    }
    setUpdating(true);
    try {
      const res  = await fetch(`/api/purchase-orders/${po._id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "status", status: newStatus, note: statusNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success("Status updated");
      setStatusOpen(false);
      setStatusNote("");
      onStatusChange(data);
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setUpdating(false);
    }
  }

  const paymentModeLabel: Record<string, string> = {
    bank_transfer: "Bank Transfer", cheque: "Cheque",
    upi: "UPI", cash: "Cash", other: "Other",
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-white">
        {/* ── Header ── */}
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-mono text-slate-500 mb-1">{po.poNumber}</p>
              <DialogTitle className="text-lg font-bold text-slate-900 leading-tight">{po.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[po.status])}>
                  {STATUS_ICONS[po.status]}&nbsp;{STATUS_LABEL[po.status]}
                </Badge>
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold capitalize", PRIORITY_COLORS[po.priority])}>
                  {po.priority}
                </span>
                {po.dueDate && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Due {formatDate(po.dueDate)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {canWrite && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setStatusOpen(true)} className="gap-1.5 text-xs h-8">
                    <RefreshCw className="w-3.5 h-3.5" /> Update Status
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onEdit(po)} className="gap-1.5 text-xs h-8">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                </>
              )}
              {canDelete && (
                <Button size="sm" variant="outline" onClick={() => onDelete(po._id)} className="gap-1.5 text-xs h-8 text-red-500 hover:text-red-600 hover:border-red-200">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* ── Client + Meta info ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client Card */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Client
              </p>
              <p className="font-semibold text-slate-900">{po.clientName}</p>
              {po.clientEmail && (
                <p className="text-sm text-slate-600 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {po.clientEmail}
                </p>
              )}
              {po.clientPhone && (
                <p className="text-sm text-slate-600 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {po.clientPhone}
                </p>
              )}
              {po.clientGSTIN && (
                <p className="text-sm text-slate-600 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" /> GSTIN: {po.clientGSTIN}
                </p>
              )}
              {po.clientAddress && (
                <p className="text-sm text-slate-600 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" /> {po.clientAddress}
                </p>
              )}
            </div>

            {/* PO Meta Card */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> PO Info
              </p>
              <Row label="PO Date"    value={formatDate(po.poDate)} />
              {po.dueDate && <Row label="Due Date"   value={formatDate(po.dueDate)} />}
              {po.assignedTo && (
                <Row label="Assigned To" value={`${po.assignedTo.firstName} ${po.assignedTo.lastName}`} icon={<User className="w-3.5 h-3.5 text-slate-400" />} />
              )}
              {po.department && <Row label="Department"  value={po.department.name} />}
              {po.paymentTerms && <Row label="Payment Terms" value={po.paymentTerms} />}
              {po.createdBy && (
                <Row label="Created By" value={`${po.createdBy.name}`} />
              )}
              <Row label="Created"    value={formatDate(po.createdAt)} />
            </div>
          </div>

          {/* ── Line Items ── */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Line Items</p>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Qty</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Unit</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Rate</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {po.lineItems?.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-700">{item.description}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-center text-slate-500 text-xs">{item.unit}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{currency(item.rate)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-800">{currency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-sm text-slate-600">Subtotal</td>
                    <td className="px-4 py-2 text-right text-sm font-medium text-slate-800">{currency(po.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 py-1.5 text-right text-sm text-slate-600">GST / Tax ({po.taxRate}%)</td>
                    <td className="px-4 py-1.5 text-right text-sm font-medium text-slate-800">{currency(po.taxAmount)}</td>
                  </tr>
                  <tr className="font-bold">
                    <td colSpan={4} className="px-4 py-3 text-right text-base text-slate-900">Total</td>
                    <td className="px-4 py-3 text-right text-base text-slate-900 flex items-center justify-end gap-0.5">
                      <IndianRupee className="w-4 h-4" />
                      {(po.totalAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Payment Info ── */}
          {(po.invoiceNumber || po.invoiceDate || po.paymentAmount || po.paymentReceivedDate) && (
            <div className="bg-emerald-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Payment Details
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {po.invoiceNumber && <Row label="Invoice #"        value={po.invoiceNumber} />}
                {po.invoiceDate   && <Row label="Invoice Date"     value={formatDate(po.invoiceDate)} />}
                {po.paymentAmount && <Row label="Amount Received"  value={currency(po.paymentAmount)} />}
                {po.paymentReceivedDate && <Row label="Received On" value={formatDate(po.paymentReceivedDate)} />}
                {po.paymentMode   && <Row label="Payment Mode"     value={paymentModeLabel[po.paymentMode] ?? po.paymentMode} />}
              </div>
            </div>
          )}

          {/* ── Notes ── */}
          {(po.notes || po.internalNotes) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {po.notes && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                    <FileText className="w-3.5 h-3.5" /> Notes
                  </p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{po.notes}</p>
                </div>
              )}
              {po.internalNotes && (
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                    <StickyNote className="w-3.5 h-3.5" /> Internal Notes
                  </p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{po.internalNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Status Timeline ── */}
          {po.statusHistory?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Activity Timeline</p>
              <div className="space-y-2">
                {[...po.statusHistory].reverse().map((h: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs",
                      h.status === "paid"      ? "bg-emerald-500" :
                      h.status === "cancelled" ? "bg-red-500"     :
                      h.status === "invoiced"  ? "bg-violet-500"  :
                      "bg-blue-500"
                    )}>
                      {STATUS_ICONS[h.status] ?? <Clock className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800">{STATUS_LABEL[h.status] ?? h.status}</span>
                        {h.changedBy?.name && (
                          <span className="text-xs text-slate-500">by {h.changedBy.name}</span>
                        )}
                        <span className="text-xs text-slate-400">{h.changedAt ? formatDate(h.changedAt) : ""}</span>
                      </div>
                      {h.note && <p className="text-xs text-slate-500 mt-0.5">{h.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Status Update Panel ── */}
        {statusOpen && canWrite && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Update Status</p>
            <div className="flex gap-3">
              <NativeSelect
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="flex-1"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </NativeSelect>
            </div>
            <Textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Optional note about this status change…"
              rows={2}
              className="resize-none text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setStatusOpen(false); setNewStatus(po.status); setStatusNote(""); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleStatusUpdate} disabled={updating} className="bg-blue-600 hover:bg-blue-700 text-white">
                {updating ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5 mt-0.5">
        {icon}{value}
      </p>
    </div>
  );
}
