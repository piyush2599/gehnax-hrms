"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Clock, LogIn, LogOut, Plus, CheckCircle, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import { useActiveRole } from "@/components/layout/active-role-context";
import { useImpersonate } from "@/components/layout/impersonate-context";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_COLORS: Record<string, string> = {
  present:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  late:     "bg-amber-50 text-amber-700 border-amber-200",
  absent:   "bg-red-50 text-red-600 border-red-200",
  on_leave: "bg-blue-50 text-blue-700 border-blue-200",
  half_day: "bg-orange-50 text-orange-700 border-orange-200",
  holiday:  "bg-violet-50 text-violet-700 border-violet-200",
  weekend:  "bg-slate-50 text-slate-400 border-slate-200",
};

export default function AttendanceClient() {
  const { data: session } = useSession();
  const { activeRole } = useActiveRole();
  const { impersonating } = useImpersonate();
  const impersonateId = impersonating?.id || "";
  const sessionEmployeeId = (session?.user as any)?.employeeId || "";
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [clockLoading, setClockLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [regularizeDate, setRegularizeDate] = useState<string | null>(null);

  const todayStr = format(today, "yyyy-MM-dd");
  const isAdminOrHR = ["super_admin", "hr_admin", "manager"].includes(activeRole);

  const { data: todayAttendance } = useSWR(
    `/api/attendance?date=${todayStr}&activeRole=${activeRole}${impersonateId ? `&impersonateId=${impersonateId}` : ""}`,
    fetcher,
    { refreshInterval: 30000 }
  );
  const { data: monthlyAttendance, isLoading } = useSWR(
    `/api/attendance?month=${month}&year=${year}&activeRole=${activeRole}${impersonateId ? `&impersonateId=${impersonateId}` : ""}`,
    fetcher
  );

  const todayRecord = todayAttendance?.[0];
  const records = monthlyAttendance || [];

  const presentDays = records.filter((r: any) => ["present","late"].includes(r.status)).length;
  const absentDays  = records.filter((r: any) => r.status === "absent").length;
  const leaveDays   = records.filter((r: any) => r.status === "on_leave").length;
  const totalHours  = records.reduce((s: number, r: any) => s + (r.workingHours || 0), 0);

  const handleClock = async (action: "checkin" | "checkout") => {
    setClockLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error);
      else {
        toast.success(action === "checkin" ? "Checked in!" : "Checked out!");
        mutate(`/api/attendance?date=${todayStr}&activeRole=${activeRole}${impersonateId ? `&impersonateId=${impersonateId}` : ""}`);
        mutate(`/api/attendance?month=${month}&year=${year}&activeRole=${activeRole}${impersonateId ? `&impersonateId=${impersonateId}` : ""}`);
      }
    } finally {
      setClockLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">{MONTHS[month - 1]} {year}</p>
        {isAdminOrHR && (
          <Button onClick={() => setManualOpen(true)} variant="outline" size="sm" className="border-slate-200">
            <Plus className="w-4 h-4 mr-1.5" />
            Manual Entry
          </Button>
        )}
      </div>

      {/* Clock in/out card (employee only) */}
      {activeRole === "employee" && (
        <Card className="border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-xl shadow-md shadow-blue-500/25">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{format(today, "EEEE, MMMM d")}</p>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-500 mt-0.5">
                    {todayRecord?.checkIn && (
                      <span className="flex items-center gap-1">
                        <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                        In: <span className="font-mono font-medium text-slate-700">{todayRecord.checkIn}</span>
                      </span>
                    )}
                    {todayRecord?.checkOut && (
                      <span className="flex items-center gap-1">
                        <LogOut className="w-3.5 h-3.5 text-red-500" />
                        Out: <span className="font-mono font-medium text-slate-700">{todayRecord.checkOut}</span>
                      </span>
                    )}
                    {todayRecord?.workingHours > 0 && (
                      <span className="text-slate-400">{todayRecord.workingHours}h worked</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {!todayRecord?.checkIn && (
                  <Button
                    onClick={() => handleClock("checkin")}
                    disabled={clockLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                    size="sm"
                  >
                    <LogIn className="w-4 h-4 mr-1.5" />
                    Check In
                  </Button>
                )}
                {todayRecord?.checkIn && !todayRecord?.checkOut && (
                  <Button
                    onClick={() => handleClock("checkout")}
                    disabled={clockLoading}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    size="sm"
                  >
                    <LogOut className="w-4 h-4 mr-1.5" />
                    Check Out
                  </Button>
                )}
                {todayRecord?.checkIn && todayRecord?.checkOut && (
                  <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold px-3">
                    <CheckCircle className="w-4 h-4" />
                    Complete
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Present",     value: presentDays,              color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Absent",      value: absentDays,               color: "text-red-600",     bg: "bg-red-50" },
          { label: "On Leave",    value: leaveDays,                color: "text-blue-600",    bg: "bg-blue-50" },
          { label: "Total Hours", value: `${totalHours.toFixed(1)}h`, color: "text-violet-600", bg: "bg-violet-50" },
        ].map((stat) => (
          <Card key={stat.label} className="border-slate-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <p className="text-xs font-medium text-slate-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Month filter */}
      <div className="flex gap-3">
        <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v ?? "1"))}>
          <SelectTrigger className="w-40 bg-white border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v ?? "2024"))}>
          <SelectTrigger className="w-28 bg-white border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[today.getFullYear() - 1, today.getFullYear()].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-14">
              <Clock className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">No records for this period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</TableHead>
                  {isAdminOrHR && <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</TableHead>}
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Check In</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Check Out</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hours</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                  {!isAdminOrHR && <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record: any) => (
                  <TableRow key={record._id} className={`hover:bg-slate-50 ${record.status === "absent" ? "bg-red-50/30" : ""}`}>
                    <TableCell className="text-sm font-medium text-slate-700">
                      {format(new Date(record.date), "EEE, MMM d")}
                    </TableCell>
                    {isAdminOrHR && (
                      <TableCell className="text-sm text-slate-700">
                        {record.employeeId
                          ? `${record.employeeId.firstName} ${record.employeeId.lastName}`
                          : "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-sm font-mono text-slate-600">{record.checkIn || "—"}</TableCell>
                    <TableCell className="text-sm font-mono text-slate-600">{record.checkOut || "—"}</TableCell>
                    <TableCell className="text-sm text-slate-600">{record.workingHours ? `${record.workingHours}h` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[record.status] || ""}`}>
                        {record.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    {!isAdminOrHR && (
                      <TableCell>
                        {record.status === "absent" && (
                          <button
                            onClick={() => setRegularizeDate(new Date(record.date).toISOString().split("T")[0])}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Regularize
                          </button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Regularization Dialog */}
      {regularizeDate && (
        <Dialog open onOpenChange={() => setRegularizeDate(null)} disablePointerDismissal>
          <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-blue-600" />Request Attendance Regularization</DialogTitle></DialogHeader>
            <RegularizeForm
              date={regularizeDate}
              onSuccess={() => {
                setRegularizeDate(null);
                mutate(`/api/attendance?month=${month}&year=${year}&activeRole=${activeRole}${impersonateId ? `&impersonateId=${impersonateId}` : ""}`);
              }}
              onCancel={() => setRegularizeDate(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Manual Entry Dialog */}
      {isAdminOrHR && (
        <Dialog open={manualOpen} onOpenChange={setManualOpen} disablePointerDismissal>
          <DialogContent>
            <DialogHeader><DialogTitle>Manual Attendance Entry</DialogTitle></DialogHeader>
            <ManualAttendanceForm
              onSuccess={() => {
                setManualOpen(false);
                mutate(`/api/attendance?month=${month}&year=${year}&activeRole=${activeRole}${impersonateId ? `&impersonateId=${impersonateId}` : ""}`);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ManualAttendanceForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    employeeId: "", date: "", checkIn: "", checkOut: "", status: "present", notes: "",
  });
  const [loading, setLoading] = useState(false);
  const { data: employees } = useSWR("/api/employees?limit=100", fetcher);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "manual", ...form }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error);
      else { toast.success("Attendance recorded"); onSuccess(); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label>Employee *</Label>
        <NativeSelect value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} required>
          <option value="">Select employee</option>
          {employees?.employees?.map((e: any) => (
            <option key={e._id} value={e._id}>
              {e.firstName} {e.lastName} ({e.employeeCode})
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Date *</Label>
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Status *</Label>
          <NativeSelect value={form.status} onChange={(e) => set("status", e.target.value)}>
            {["present","absent","half_day","late","on_leave","holiday"].map((s) => (
              <option key={s} value={s}>{s.replace("_"," ")}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label>Check In</Label>
          <Input type="time" value={form.checkIn} onChange={(e) => set("checkIn", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Check Out</Label>
          <Input type="time" value={form.checkOut} onChange={(e) => set("checkOut", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional notes" />
      </div>
      <Button type="submit" loading={loading} className="w-full">
        {loading ? "Saving…" : "Save Attendance"}
      </Button>
    </form>
  );
}

function RegularizeForm({ date, onSuccess, onCancel }: { date: string; onSuccess: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ checkIn: "09:00", checkOut: "18:00", reason: "" });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/regularize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, ...form }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed to submit");
      else { toast.success("Regularization request submitted — pending Super Admin approval"); onSuccess(); }
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        Requesting regularization for <strong>{format(new Date(date), "EEEE, MMMM d, yyyy")}</strong>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Check-in Time *</Label>
          <Input type="time" value={form.checkIn} onChange={e => set("checkIn", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Check-out Time *</Label>
          <Input type="time" value={form.checkOut} onChange={e => set("checkOut", e.target.value)} required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Reason *</Label>
        <Textarea value={form.reason} onChange={e => set("reason", e.target.value)} placeholder="Why were you unable to check in/out on this day?" rows={3} required />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
          {loading ? "Submitting…" : "Submit for Approval"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="border-slate-200">Cancel</Button>
      </div>
    </form>
  );
}
