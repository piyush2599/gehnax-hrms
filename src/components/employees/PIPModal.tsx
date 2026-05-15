"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { X, Target, CheckCircle2, XCircle, AlertTriangle, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { mutate } from "swr";

interface PIP {
  status: "active" | "completed" | "cancelled";
  startDate: string;
  endDate: string;
  goals: string;
  reviewDate?: string;
  notes?: string;
  initiatedAt: string;
}

interface Props {
  employeeId: string;
  employeeName: string;
  pip?: PIP;
  onClose: () => void;
}

export default function PIPModal({ employeeId, employeeName, pip, onClose }: Props) {
  const isActive = pip?.status === "active";
  const today = new Date().toISOString().split("T")[0];

  const [goals, setGoals] = useState(pip?.goals || "");
  const [startDate, setStartDate] = useState(pip?.startDate ? pip.startDate.slice(0, 10) : today);
  const [endDate, setEndDate] = useState(pip?.endDate ? pip.endDate.slice(0, 10) : "");
  const [reviewDate, setReviewDate] = useState(pip?.reviewDate ? pip.reviewDate.slice(0, 10) : "");
  const [notes, setNotes] = useState(pip?.notes || "");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(!pip);

  const save = async () => {
    if (!goals.trim()) { toast.error("Goals are required"); return; }
    if (!endDate) { toast.error("End date is required"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/pip`, {
        method: pip ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals, startDate, endDate, reviewDate: reviewDate || undefined, notes }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error); return; }
      toast.success(pip ? "PIP updated" : "PIP initiated successfully");
      mutate(`/api/employees/${employeeId}`);
      onClose();
    } finally { setLoading(false); }
  };

  const doAction = async (action: "complete" | "cancel") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/pip`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error); return; }
      toast.success(action === "complete" ? "PIP marked as completed" : "PIP cancelled");
      mutate(`/api/employees/${employeeId}`);
      onClose();
    } finally { setLoading(false); }
  };

  const STATUS_UI = {
    active:    { label: "Active",    cls: "bg-amber-50 text-amber-700 border-amber-200",   icon: Target },
    completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", cls: "bg-slate-50 text-slate-500 border-slate-200",   icon: XCircle },
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 animate-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-xl">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {pip ? (editing ? "Edit PIP" : "PIP Details") : "Initiate PIP"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{employeeName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          {/* Status banner for existing PIP */}
          {pip && !editing && (() => {
            const s = STATUS_UI[pip.status];
            const Icon = s.icon;
            return (
              <div className={`flex items-center gap-2.5 p-3 rounded-xl border ${s.cls}`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold">PIP {s.label}</p>
                  <p className="text-xs opacity-75 mt-0.5">Initiated {formatDate(pip.initiatedAt)}</p>
                </div>
              </div>
            );
          })()}

          {/* View mode */}
          {pip && !editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1"><Calendar className="w-3 h-3" /> Start Date</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{formatDate(pip.startDate)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1"><Calendar className="w-3 h-3" /> End Date</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{formatDate(pip.endDate)}</p>
                </div>
                {pip.reviewDate && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-400 font-medium">Review Date</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{formatDate(pip.reviewDate)}</p>
                  </div>
                )}
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-400 font-medium mb-1.5">Goals & Objectives</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{pip.goals}</p>
              </div>
              {pip.notes && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium mb-1.5">Manager Notes</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{pip.notes}</p>
                </div>
              )}
            </div>
          ) : (
            /* Create / Edit form */
            <>
              {!pip && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    A Performance Improvement Plan is a formal document to help the employee improve. It will be visible to the employee.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Goals & Objectives <span className="text-red-500">*</span></Label>
                <textarea
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-500/15 placeholder:text-slate-400"
                  placeholder="List specific, measurable goals the employee needs to achieve…"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Date <span className="text-red-500">*</span></Label>
                  <Input type="date" value={startDate} min={today} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date <span className="text-red-500">*</span></Label>
                  <Input type="date" value={endDate} min={startDate || today} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Review Date <span className="text-slate-400 font-normal">(optional)</span></Label>
                  <Input type="date" value={reviewDate} min={startDate} max={endDate} onChange={(e) => setReviewDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Manager Notes <span className="text-slate-400 font-normal">(optional)</span></Label>
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-500/15 placeholder:text-slate-400"
                  placeholder="Internal notes about this PIP…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-6 pt-2 flex-shrink-0 space-y-2 border-t border-slate-100">
          {pip && !editing ? (
            <>
              {isActive && (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 border-slate-200" onClick={() => setEditing(true)}>
                    Edit PIP
                  </Button>
                  <Button variant="success" className="flex-1" onClick={() => doAction("complete")} loading={loading}>
                    <CheckCircle2 className="w-4 h-4" /> Mark Complete
                  </Button>
                </div>
              )}
              {isActive && (
                <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" onClick={() => doAction("cancel")} loading={loading}>
                  Cancel PIP
                </Button>
              )}
              {!isActive && (
                <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
              )}
            </>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => pip ? setEditing(false) : onClose()} disabled={loading}>
                {pip ? "Back" : "Cancel"}
              </Button>
              <Button className="flex-1" onClick={save} loading={loading}>
                {pip ? "Save Changes" : "Initiate PIP"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}
