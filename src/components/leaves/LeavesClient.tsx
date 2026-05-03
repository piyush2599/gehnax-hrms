"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Calendar, Check, X, Clock } from "lucide-react";
import { useSession } from "next-auth/react";
import { formatDate } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  approved:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:  "bg-red-50 text-red-600 border-red-200",
  cancelled: "bg-slate-50 text-slate-500 border-slate-200",
};

const LEAVE_TYPES = ["Annual","Sick","Casual","Maternity","Paternity","Unpaid"];

export default function LeavesClient() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "employee";
  const [applyOpen, setApplyOpen] = useState(false);
  const [reviewLeave, setReviewLeave] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const isAdminOrHR = ["super_admin","hr_admin","manager"].includes(role);

  const url = `/api/leaves${filterStatus !== "all" ? `?status=${filterStatus}` : ""}`;
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
        <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm" size="sm" onClick={() => setApplyOpen(true)}>
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
      {role === "employee" && <LeaveBalanceCard />}

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
                  {isAdminOrHR && <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</TableHead>}
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
                    {isAdminOrHR && (
                      <TableCell>
                        {leave.status === "pending" ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => setReviewLeave({ ...leave, action: "approved" })}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Approve"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setReviewLeave({ ...leave, action: "rejected" })}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                              title="Reject"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {reviewLeave && (
        <ReviewLeaveDialog
          leave={reviewLeave}
          onClose={() => setReviewLeave(null)}
          onDone={() => { setReviewLeave(null); mutate(url); }}
        />
      )}
    </div>
  );
}

function LeaveBalanceCard() {
  const { data: employee } = useSWR("/api/employees/me", fetcher);
  if (!employee?.leaveBalance) return null;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {Object.entries(employee.leaveBalance).map(([type, days]) => (
        <Card key={type} className="border-slate-200 shadow-sm text-center">
          <CardContent className="p-3">
            <p className="text-xl font-bold text-blue-600">{days as number}</p>
            <p className="text-xs text-slate-500 capitalize mt-0.5">{type}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ApplyLeaveForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ leaveType: "", startDate: "", endDate: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

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
      <div className="space-y-1.5">
        <Label>Leave Type *</Label>
        <NativeSelect value={form.leaveType} onChange={(e) => set("leaveType", e.target.value)} required>
          <option value="">Select leave type</option>
          {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t} Leave</option>)}
        </NativeSelect>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Start Date *</Label>
          <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>End Date *</Label>
          <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Reason *</Label>
        <Textarea value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Reason for leave…" rows={3} required />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
        {loading ? "Submitting…" : "Submit Application"}
      </Button>
    </form>
  );
}

function ReviewLeaveDialog({ leave, onClose, onDone }: { leave: any; onClose: () => void; onDone: () => void }) {
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const isApproving = leave.action === "approved";

  const handleReview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaves/${leave._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: leave.action, reviewComments: comments }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error);
      else { toast.success(`Leave ${isApproving ? "approved" : "rejected"}`); onDone(); }
    } finally { setLoading(false); }
  };

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isApproving ? "Approve" : "Reject"} Leave Request</AlertDialogTitle>
          <AlertDialogDescription className="space-y-1.5">
            <span className="block font-medium text-slate-700">
              {leave.employeeId?.firstName} {leave.employeeId?.lastName} — {leave.leaveType} Leave
            </span>
            <span className="block text-slate-500">
              {formatDate(leave.startDate)} → {formatDate(leave.endDate)} ({leave.totalDays} days)
            </span>
            <span className="block italic text-slate-500">&ldquo;{leave.reason}&rdquo;</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-6 -mt-2">
          <Label className="text-sm">Comments (optional)</Label>
          <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Review comments…" rows={2} className="mt-1.5" />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReview}
            disabled={loading}
            className={isApproving ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
          >
            {loading ? "Processing…" : isApproving ? "Approve" : "Reject"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
