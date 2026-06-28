"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Calendar, Clock } from "lucide-react";
import { useSession } from "next-auth/react";
import { useActiveRole } from "@/components/layout/active-role-context";
import { useImpersonate } from "@/components/layout/impersonate-context";
import { formatDate } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  approved:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:  "bg-red-50 text-red-600 border-red-200",
  cancelled: "bg-slate-50 text-slate-500 border-slate-200",
};


export default function LeavesClient() {
  const { data: session } = useSession();
  const { activeRole } = useActiveRole();
  const { impersonating } = useImpersonate();
  const impersonateId = impersonating?.id || "";
  const [applyOpen, setApplyOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const isAdminOrHR = ["super_admin","hr_admin","manager"].includes(activeRole);

  const params = new URLSearchParams({ activeRole });
  if (filterStatus !== "all") params.set("status", filterStatus);
  const url = `/api/leaves?${params.toString()}`;
  const { data: leaves, isLoading } = useSWR(url, fetcher);
  const leaveList = Array.isArray(leaves) ? leaves : [];
  const pendingCount = leaveList.filter((l) => l.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {isAdminOrHR && pendingCount > 0 && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5">
              <Clock className="w-3 h-3" />
              {pendingCount} pending
            </Badge>
          )}
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" size="sm" onClick={() => setApplyOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Apply Leave
        </Button>
      </div>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen} disablePointerDismissal>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
          <ApplyLeaveForm onSuccess={() => { setApplyOpen(false); mutate(url); }} />
        </DialogContent>
      </Dialog>

      {/* Leave balance (employee) */}
      {activeRole === "employee" && <LeaveBalanceCard />}

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {["all","pending","approved","rejected","cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
              filterStatus === s
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : leaveList.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No leaves found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  {isAdminOrHR && <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</TableHead>}
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">From</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">To</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Days</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveList.map((leave: any) => (
                  <TableRow key={leave._id} className="hover:bg-slate-50">
                    {isAdminOrHR && (
                      <TableCell className="text-sm font-medium text-slate-800">
                        {leave.employeeId?.firstName} {leave.employeeId?.lastName}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {leave.leaveType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{formatDate(leave.startDate)}</TableCell>
                    <TableCell className="text-sm text-slate-600">{formatDate(leave.endDate)}</TableCell>
                    <TableCell className="text-sm font-semibold text-slate-700">{leave.totalDays}d</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[leave.status] || ""}`}>
                        {leave.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

function LeaveBalanceCard() {
  const { data: employee, isLoading } = useSWR("/api/employees/me", fetcher);

  if (isLoading) return (
    <div className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse" />
  );
  if (!employee) return null;

  const balance = employee?.leaveBalance?.leaves ?? 0;

  const maxDisplay   = Math.max(balance, 24); // scale bar to at least 24
  const pct          = Math.min(100, Math.round((balance / maxDisplay) * 100));
  const color        = balance >= 10 ? "bg-emerald-500" : balance >= 5 ? "bg-amber-500" : "bg-red-500";
  const textColor    = balance >= 10 ? "text-emerald-600" : balance >= 5 ? "text-amber-600" : "text-red-600";

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Leave Balance</p>
            <p className={`text-4xl font-bold ${textColor}`}>
              {balance}
              <span className="text-lg font-medium text-slate-400 ml-1">days</span>
            </p>
          </div>
          <div className="text-right text-xs text-slate-400 space-y-1">
            <p className="flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              2 leaves credited every month
            </p>
            <p className="flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
              Max 10 days carry forward per year
            </p>
            <p className="flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Excess lapses on Jan 1
            </p>
          </div>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-400 mt-2">{balance} day{balance !== 1 ? "s" : ""} available</p>
      </CardContent>
    </Card>
  );
}

function ApplyLeaveForm({ onSuccess }: { onSuccess: () => void }) {
  const { data: employee } = useSWR("/api/employees/me", fetcher);
  const balance = employee?.leaveBalance?.leaves ?? null;

  const [form, setForm]   = useState({ startDate: "", endDate: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const weekdays = form.startDate && form.endDate
    ? (() => {
        let n = 0;
        const cur = new Date(form.startDate);
        const end = new Date(form.endDate);
        while (cur <= end) { const d = cur.getDay(); if (d !== 0 && d !== 6) n++; cur.setDate(cur.getDate() + 1); }
        return n;
      })()
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed");
      else { toast.success("Leave application submitted"); onSuccess(); }
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      {balance !== null && (
        <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium ${
          balance >= 5 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"
        }`}>
          <span>Available Balance</span>
          <span className="font-bold">{balance} day{balance !== 1 ? "s" : ""}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Start Date *</Label>
          <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} required min={new Date().toISOString().split("T")[0]} />
        </div>
        <div className="space-y-1.5">
          <Label>End Date *</Label>
          <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} required min={form.startDate || new Date().toISOString().split("T")[0]} />
        </div>
      </div>
      {weekdays > 0 && (
        <p className="text-xs text-slate-500 -mt-1">
          {weekdays} working day{weekdays !== 1 ? "s" : ""} selected (weekends excluded)
        </p>
      )}
      <div className="space-y-1.5">
        <Label>Reason *</Label>
        <Textarea value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Reason for leave…" rows={3} required />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
        {loading ? "Submitting…" : "Submit Application"}
      </Button>
    </form>
  );
}

