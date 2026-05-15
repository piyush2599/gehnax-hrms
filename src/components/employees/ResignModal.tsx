"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X, LogOut, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { mutate } from "swr";

interface Props {
  employeeId: string;
  employeeName: string;
  resignation?: {
    status: "pending" | "accepted" | "withdrawn";
    submittedAt: string;
    lastWorkingDay: string;
    reason?: string;
    hrNotes?: string;
  };
  isHR: boolean;
  isOwner: boolean;
  onClose: () => void;
}

const STATUS_UI = {
  pending:   { label: "Pending Review",    cls: "bg-amber-50 text-amber-700 border-amber-200",   icon: Clock },
  accepted:  { label: "Accepted",          cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  withdrawn: { label: "Withdrawn",         cls: "bg-slate-50 text-slate-500 border-slate-200",   icon: XCircle },
};

export default function ResignModal({ employeeId, employeeName, resignation, isHR, isOwner, onClose }: Props) {
  const hasActive = resignation?.status === "pending" || resignation?.status === "accepted";

  const [lastWorkingDay, setLastWorkingDay] = useState("");
  const [reason, setReason] = useState("");
  const [hrNotes, setHrNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 14);
  const minDateStr = minDate.toISOString().split("T")[0];

  const submit = async () => {
    if (!lastWorkingDay) { toast.error("Please select a last working day"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/resign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastWorkingDay, reason }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error); return; }
      toast.success("Resignation submitted successfully");
      mutate(`/api/employees/${employeeId}`);
      onClose();
    } finally { setLoading(false); }
  };

  const doAction = async (action: "accept" | "withdraw") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/resign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, hrNotes }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error); return; }
      toast.success(action === "accept" ? "Resignation accepted" : "Resignation withdrawn");
      mutate(`/api/employees/${employeeId}`);
      onClose();
    } finally { setLoading(false); }
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-xl">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {hasActive ? "Resignation Details" : "Submit Resignation"}
              </h3>
              {!hasActive && (
                <p className="text-xs text-slate-500 mt-0.5">{employeeName}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Show existing resignation status */}
          {hasActive && resignation ? (
            <div className="space-y-4">
              {/* Status banner */}
              {(() => {
                const s = STATUS_UI[resignation.status];
                const Icon = s.icon;
                return (
                  <div className={`flex items-center gap-2.5 p-3 rounded-xl border ${s.cls}`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{s.label}</p>
                      <p className="text-xs opacity-75 mt-0.5">Submitted {formatDate(resignation.submittedAt)}</p>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">Last Working Day</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{formatDate(resignation.lastWorkingDay)}</p>
                </div>
                {resignation.reason && (
                  <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                    <p className="text-xs text-slate-400 font-medium">Reason</p>
                    <p className="text-sm text-slate-700 mt-0.5">{resignation.reason}</p>
                  </div>
                )}
                {resignation.hrNotes && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 col-span-2">
                    <p className="text-xs text-blue-400 font-medium">HR Notes</p>
                    <p className="text-sm text-slate-700 mt-0.5">{resignation.hrNotes}</p>
                  </div>
                )}
              </div>

              {/* HR: accept + notes */}
              {isHR && resignation.status === "pending" && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <Label className="text-xs">HR Notes (optional)</Label>
                    <textarea
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-500/15 placeholder:text-slate-400"
                      placeholder="Add notes before accepting…"
                      value={hrNotes}
                      onChange={(e) => setHrNotes(e.target.value)}
                    />
                  </div>
                  <Button variant="success" className="w-full" onClick={() => doAction("accept")} loading={loading}>
                    <CheckCircle2 className="w-4 h-4" />
                    Accept Resignation
                  </Button>
                </div>
              )}

              {/* Withdraw option */}
              {(isOwner || isHR) && resignation.status === "pending" && (
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => doAction("withdraw")}
                  loading={loading}
                >
                  Withdraw Resignation
                </Button>
              )}
            </div>
          ) : (
            /* Submit form */
            <>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Once submitted, your manager and HR will be notified. You can withdraw it while it's still pending review.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Last Working Day <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={lastWorkingDay}
                  min={minDateStr}
                  onChange={(e) => setLastWorkingDay(e.target.value)}
                />
                <p className="text-xs text-slate-400">Minimum notice period: 14 days</p>
              </div>

              <div className="space-y-1.5">
                <Label>Reason <span className="text-slate-400 font-normal">(optional)</span></Label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-500/15 placeholder:text-slate-400"
                  placeholder="Share your reason for leaving…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
                <Button className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700" onClick={submit} loading={loading}>
                  <LogOut className="w-4 h-4" />
                  Submit Resignation
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}
