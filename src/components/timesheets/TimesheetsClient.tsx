"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, addWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Clock, Check, X, Save, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useActiveRole } from "@/components/layout/active-role-context";
import { useImpersonate } from "@/components/layout/impersonate-context";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-slate-50 text-slate-600 border-slate-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  approved:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:  "bg-red-50 text-red-600 border-red-200",
};

export default function TimesheetsClient() {
  const { data: session } = useSession();
  const { activeRole } = useActiveRole();
  const { impersonating } = useImpersonate();
  const impersonateId = impersonating?.id || "";
  const [weekOffset, setWeekOffset] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [reviewTs, setReviewTs] = useState<any>(null);
  const isAdminOrHR = ["super_admin","hr_admin","manager"].includes(activeRole);

  const today = new Date();
  const weekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDateStr = format(weekStart, "yyyy-MM-dd");

  const { data: timesheets, isLoading } = useSWR(
    isAdminOrHR && !impersonateId ? `/api/timesheets?activeRole=${activeRole}` : `/api/timesheets?activeRole=${activeRole}${impersonateId ? `&impersonateId=${impersonateId}` : ""}`,
    fetcher
  );
  const { data: currentWeekTs } = useSWR(`/api/timesheets?weekDate=${weekDateStr}&activeRole=${activeRole}${impersonateId ? `&impersonateId=${impersonateId}` : ""}`, fetcher);

  const tsList = Array.isArray(timesheets) ? timesheets : [];
  const currentTs = Array.isArray(currentWeekTs) ? currentWeekTs[0] : null;
  const pendingCount = tsList.filter((t) => t.status === "submitted").length;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      {isAdminOrHR && pendingCount > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1.5">
            <Clock className="w-3 h-3" />
            {pendingCount} pending review
          </Badge>
        </div>
      )}

      {/* My Timesheet (employee view) */}
      {!isAdminOrHR && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-700">
                <Clock className="w-4 h-4 inline mr-2 text-blue-500" />
                {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" className="h-7 w-7 border-slate-200" onClick={() => setWeekOffset((o) => o - 1)}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7 border-slate-200" onClick={() => setWeekOffset((o) => o + 1)} disabled={weekOffset >= 0}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {currentTs ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[currentTs.status]}`}>
                      {currentTs.status}
                    </Badge>
                    <span className="text-sm text-slate-600 font-medium">
                      {currentTs.totalHours}h total
                    </span>
                  </div>
                  {currentTs.status === "draft" && (
                    <Button size="sm" onClick={() => setEditOpen(true)} variant="outline" className="border-slate-200">
                      Edit
                    </Button>
                  )}
                </div>
                {currentTs.entries?.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Project</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Task</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hrs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentTs.entries.map((entry: any, i: number) => (
                        <TableRow key={i} className="hover:bg-slate-50">
                          <TableCell className="text-sm">{format(new Date(entry.date), "EEE, MMM d")}</TableCell>
                          <TableCell className="text-sm">{entry.project}</TableCell>
                          <TableCell className="text-sm">{entry.task}</TableCell>
                          <TableCell className="text-sm font-semibold">{entry.hours}h</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600 mb-3">No timesheet for this week</p>
                <Button size="sm" onClick={() => setEditOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Timesheet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin/HR view */}
      {isAdminOrHR && (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-5 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            ) : tsList.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">No timesheets to review</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Week</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hours</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tsList.map((ts: any) => (
                    <TableRow key={ts._id} className="hover:bg-slate-50">
                      <TableCell className="text-sm font-semibold text-slate-800">
                        {ts.employeeId?.firstName} {ts.employeeId?.lastName}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {format(new Date(ts.weekStartDate), "MMM d")} – {format(new Date(ts.weekEndDate), "MMM d")}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-700">{ts.totalHours}h</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${STATUS_COLORS[ts.status]}`}>{ts.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {ts.status === "submitted" && (
                          <div className="flex gap-1">
                            <button onClick={() => setReviewTs({ ...ts, action: "approved" })} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50" title="Approve">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setReviewTs({ ...ts, action: "rejected" })} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Reject">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Entry dialog */}
      {editOpen && (
        <Dialog open={editOpen} onOpenChange={setEditOpen} disablePointerDismissal>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Timesheet: {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}</DialogTitle>
            </DialogHeader>
            <TimesheetEntryForm
              weekStart={weekStart}
              existingTs={currentTs}
              onSuccess={() => { setEditOpen(false); mutate(`/api/timesheets?weekDate=${weekDateStr}`); }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Review dialog */}
      {reviewTs && (
        <TimesheetReviewDialog
          ts={reviewTs}
          onClose={() => setReviewTs(null)}
          onDone={() => { setReviewTs(null); mutate(`/api/timesheets?activeRole=${activeRole}`); }}
        />
      )}
    </div>
  );
}

function TimesheetEntryForm({ weekStart, existingTs, onSuccess }: { weekStart: Date; existingTs: any; onSuccess: () => void }) {
  const [entries, setEntries] = useState<Array<{ date: string; project: string; task: string; hours: number; description: string }>>(
    existingTs?.entries?.map((e: any) => ({
      date: format(new Date(e.date), "yyyy-MM-dd"),
      project: e.project, task: e.task, hours: e.hours, description: e.description || "",
    })) || [{ date: format(weekStart, "yyyy-MM-dd"), project: "", task: "", hours: 8, description: "" }]
  );
  const [loading, setLoading] = useState(false);
  const totalHours = entries.reduce((s, e) => s + (e.hours || 0), 0);

  const updateEntry = (i: number, key: string, value: any) =>
    setEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, [key]: value } : e));

  const handleSave = async (action: "save" | "submit") => {
    setLoading(true);
    try {
      const res = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekDate: format(weekStart, "yyyy-MM-dd"), entries, action }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed");
      else { toast.success(action === "submit" ? "Timesheet submitted!" : "Draft saved"); onSuccess(); }
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4 mt-2">
      {entries.map((entry, i) => (
        <Card key={i} className="border-slate-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Date *</Label>
                <Input type="date" value={entry.date} onChange={(e) => updateEntry(i, "date", e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hours *</Label>
                <Input type="number" min="0.5" max="24" step="0.5" value={entry.hours} onChange={(e) => updateEntry(i, "hours", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Project *</Label>
                <Input value={entry.project} onChange={(e) => updateEntry(i, "project", e.target.value)} placeholder="Project name" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Task *</Label>
                <Input value={entry.task} onChange={(e) => updateEntry(i, "task", e.target.value)} placeholder="Task description" className="h-8 text-sm" />
              </div>
            </div>
            {entries.length > 1 && (
              <button onClick={() => setEntries((p) => p.filter((_, idx) => idx !== i))} className="mt-2 text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                <X className="w-3 h-3" /> Remove entry
              </button>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setEntries((p) => [...p, { date: format(weekStart, "yyyy-MM-dd"), project: "", task: "", hours: 8, description: "" }])} className="text-xs border-slate-200">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Entry
        </Button>
        <span className="text-sm font-semibold text-slate-700">Total: {totalHours}h</span>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={() => handleSave("save")} disabled={loading} className="flex-1 border-slate-200">
          <Save className="w-4 h-4 mr-1.5" /> Save Draft
        </Button>
        <Button onClick={() => handleSave("submit")} loading={loading} className="flex-1">
          <Send className="w-4 h-4 mr-1.5" /> Submit
        </Button>
      </div>
    </div>
  );
}

function TimesheetReviewDialog({ ts, onClose, onDone }: { ts: any; onClose: () => void; onDone: () => void }) {
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const isApproving = ts.action === "approved";

  const handleReview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/timesheets/${ts._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: ts.action, reviewComments: comments }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error);
      else { toast.success(`Timesheet ${isApproving ? "approved" : "rejected"}`); onDone(); }
    } finally { setLoading(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isApproving ? "Approve" : "Reject"} Timesheet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700">
            <p className="font-semibold">{ts.employeeId?.firstName} {ts.employeeId?.lastName}</p>
            <p className="text-slate-500 mt-0.5">
              {format(new Date(ts.weekStartDate), "MMM d")} to {format(new Date(ts.weekEndDate), "MMM d")} · {ts.totalHours}h
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Comments (optional)</Label>
            <Input value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Optional comments…" />
          </div>
          <Button
            onClick={handleReview}
            disabled={loading}
            className={`w-full ${isApproving ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
          >
            {loading ? "Processing…" : isApproving ? "Approve Timesheet" : "Reject Timesheet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
