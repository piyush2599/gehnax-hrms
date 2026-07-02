"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DollarSign, FileText, Download, Play, Loader2, ExternalLink, TrendingUp, TrendingDown, Clock, Calendar, Pencil, Trash2, CheckCircle2, BadgeCheck, Search } from "lucide-react";
import { formatCurrency, getMonthName, secureDocUrl } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useActiveRole } from "@/components/layout/active-role-context";
import { useImpersonate } from "@/components/layout/impersonate-context";
import PayrollAdminTools from "@/components/payroll/PayrollAdminTools";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const months = Array.from({ length: 12 }, (_, i) => i + 1);

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-slate-50 text-slate-600 border-slate-200",
  processed: "bg-blue-50 text-blue-700 border-blue-200",
  paid:      "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_DOT: Record<string, string> = {
  draft:     "bg-slate-400",
  processed: "bg-blue-500",
  paid:      "bg-emerald-500",
};

// Compact INR integer for dense breakdown tables (blank when zero)
const fmtInt = (v: number) => (v ? Math.round(v).toLocaleString("en-IN") : "—");

export default function PayrollClient() {
  const { data: session } = useSession();
  const { activeRole } = useActiveRole();
  const { impersonating } = useImpersonate();
  const impersonateId = impersonating?.id || "";
  const sessionEmployeeId = (session?.user as any)?.employeeId;
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [viewSlip, setViewSlip] = useState<any>(null);
  const [editRow, setEditRow] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isAdminOrHR = activeRole === "super_admin";
  const isEmployee  = activeRole === "employee";

  // Admin: filter by month+year. Employee: restrict to own records via employeeId.
  const adminUrl    = `/api/payroll?month=${month}&year=${year}&activeRole=${activeRole}`;
  const employeeUrl = `/api/payroll?year=${year}&activeRole=${activeRole}${impersonateId ? `&impersonateId=${impersonateId}` : (sessionEmployeeId ? `&employeeId=${sessionEmployeeId}` : "")}`;

  const { data: payrolls, isLoading } = useSWR(
    isEmployee ? employeeUrl : adminUrl,
    fetcher
  );
  const list = Array.isArray(payrolls) ? payrolls : [];

  // Client-side filters over the month's records
  const filtered = list.filter((p: any) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const name = `${p.employeeId?.firstName ?? ""} ${p.employeeId?.lastName ?? ""} ${p.employeeId?.employeeCode ?? ""} ${p.employeeId?.designation ?? ""}`.toLowerCase();
      if (!name.includes(q)) return false;
    }
    return true;
  });

  const totalNetPay = filtered.reduce((s: number, p: any) => s + (p.netPay || 0), 0);
  const totalGross  = filtered.reduce((s: number, p: any) => s + (p.grossPay || 0), 0);
  const sumL = (fn: (p: any) => number) => filtered.reduce((s: number, p: any) => s + (fn(p) || 0), 0);
  const statusCounts = list.reduce((acc: Record<string, number>, p: any) => {
    acc[p.status] = (acc[p.status] || 0) + 1; return acc;
  }, {});

  // Commit the run (called from the preview dialog after review)
  const handleRunPayroll = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed");
      else {
        toast.success(`Payroll drafts created for ${data.created} employees`);
        setShowPreview(false);
        mutate(adminUrl);
      }
    } finally { setProcessing(false); }
  };

  const refresh = () => mutate(isEmployee ? employeeUrl : adminUrl);

  const handleSaveEdit = async (id: string, payload: any) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/payroll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Update failed"); return false; }
      toast.success("Payroll recalculated");
      refresh();
      return true;
    } finally { setBusyId(null); }
  };

  const handleApprove = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/payroll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed");
      else { toast.success("Payroll approved"); refresh(); }
    } finally { setBusyId(null); }
  };

  const handleMarkPaid = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/payroll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed");
      else { toast.success("Marked as paid"); refresh(); }
    } finally { setBusyId(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payroll record? You can re-run payroll for this period afterwards.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/payroll/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Delete failed");
      else { toast.success("Payroll deleted"); refresh(); }
    } finally { setBusyId(null); }
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const bulkAction = async (
    label: string,
    filterFn: (p: any) => boolean,
    request: (id: string) => Promise<Response>,
  ) => {
    const ids = list.filter((p: any) => selected.includes(p._id) && filterFn(p)).map((p: any) => p._id);
    if (ids.length === 0) { toast.error(`No selected rows eligible to ${label.toLowerCase()}`); return; }
    setBulkBusy(true);
    try {
      const results = await Promise.all(ids.map((id: string) => request(id).then((r) => r.ok)));
      const ok = results.filter(Boolean).length;
      toast.success(`${label}: ${ok}/${ids.length} done`);
      setSelected([]);
      refresh();
    } finally { setBulkBusy(false); }
  };

  const bulkApprove = () => bulkAction("Approved", (p) => p.status === "draft", (id) =>
    fetch(`/api/payroll/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve" }) }));

  const bulkMarkPaid = () => bulkAction("Marked paid", (p) => p.status === "processed", (id) =>
    fetch(`/api/payroll/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "paid" }) }));

  const bulkDelete = () => {
    if (!confirm(`Delete ${selected.length} selected payroll record(s)?`)) return;
    return bulkAction("Deleted", (p) => p.status !== "paid", (id) => fetch(`/api/payroll/${id}`, { method: "DELETE" }));
  };

  const handleGeneratePdf = async (payrollId: string) => {
    setGeneratingPdf(payrollId);
    try {
      const res = await fetch(`/api/payroll/${payrollId}/payslip`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "PDF generation failed");
      else {
        toast.success("Salary slip PDF generated");
        mutate(isEmployee ? employeeUrl : adminUrl);
        setViewSlip((prev: any) =>
          prev?._id === payrollId ? { ...prev, payslipUrl: data.payslipUrl } : prev
        );
      }
    } finally { setGeneratingPdf(null); }
  };

  // ── Employee view ──────────────────────────────────────────────────────────
  if (isEmployee) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">My Salary Slips</h2>
            <p className="text-sm text-slate-500 mt-0.5">View and download your monthly salary slips</p>
          </div>
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v ?? String(today.getFullYear())))}>
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

        {/* Summary strip */}
        {list.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-blue-100 bg-blue-50/50 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-blue-700">{list.length}</p>
                  <p className="text-xs text-slate-500">Slips in {year}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-emerald-100 bg-emerald-50/50 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-emerald-700">{formatCurrency(totalNetPay)}</p>
                  <p className="text-xs text-slate-500">Total Net Pay</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-violet-100 bg-violet-50/50 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-violet-700">
                    {list.length > 0 ? formatCurrency(Math.round(totalNetPay / list.length)) : "—"}
                  </p>
                  <p className="text-xs text-slate-500">Monthly Avg</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payslip cards */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : list.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-16 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No salary slips for {year}</p>
              <p className="text-xs text-slate-400 mt-1">
                Your payroll records will appear here once processed by HR.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {[...list].sort((a: any, b: any) => b.month - a.month).map((p: any) => (
              <EmployeePayslipCard
                key={p._id}
                payroll={p}
                onView={() => setViewSlip(p)}
              />
            ))}
          </div>
        )}

        {/* Detail dialog */}
        {viewSlip && (
          <Dialog open={!!viewSlip} onOpenChange={() => setViewSlip(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Salary Slip — {getMonthName(viewSlip.month)} {viewSlip.year}
                </DialogTitle>
              </DialogHeader>
              <PaySlip payroll={viewSlip} isAdmin={false} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // ── Admin / HR view ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">{getMonthName(month)} {year}</p>
        <div className="flex items-center gap-2">
          {isAdminOrHR && <PayrollAdminTools month={month} year={year} />}
          <Button onClick={() => setShowPreview(true)} disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Play className="w-4 h-4 mr-1.5" />
            Run Payroll
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {list.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Employees", value: list.length,                                           color: "text-slate-700",   bg: "bg-slate-50" },
            { label: "Gross Pay", value: formatCurrency(totalGross),                            color: "text-blue-700",    bg: "bg-blue-50" },
            { label: "Net Pay",   value: formatCurrency(totalNetPay),                           color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "Processed", value: list.filter((p: any) => p.status !== "draft").length, color: "text-violet-700",  bg: "bg-violet-50" },
          ].map((stat) => (
            <Card key={stat.label} className="border-slate-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect
          value={String(month)}
          onChange={(e) => setMonth(parseInt(e.target.value))}
          className="h-9 w-36 bg-white"
        >
          {months.map((m) => <option key={m} value={m}>{getMonthName(m)}</option>)}
        </NativeSelect>

        <NativeSelect
          value={String(year)}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="h-9 w-24 bg-white"
        >
          {[today.getFullYear() - 1, today.getFullYear()].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </NativeSelect>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, code, designation…"
            className="h-9 pl-9 bg-white border-slate-200"
          />
        </div>

        <NativeSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 w-48 bg-white"
        >
          <option value="all">All statuses ({list.length})</option>
          <option value="draft">Draft ({statusCounts.draft || 0})</option>
          <option value="processed">Approved ({statusCounts.processed || 0})</option>
          <option value="paid">Paid ({statusCounts.paid || 0})</option>
        </NativeSelect>

        {(search || statusFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); }} className="text-slate-500 h-9">
            Clear
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
      {isAdminOrHR && selected.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
          <span className="text-sm font-semibold text-blue-800">{selected.length} selected</span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={bulkApprove} disabled={bulkBusy}
            className="border-blue-200 text-blue-700 hover:bg-blue-100">
            <BadgeCheck className="w-4 h-4 mr-1.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={bulkMarkPaid} disabled={bulkBusy}
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-100">
            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Mark Paid
          </Button>
          <Button size="sm" variant="outline" onClick={bulkDelete} disabled={bulkBusy}
            className="border-red-200 text-red-600 hover:bg-red-100">
            <Trash2 className="w-4 h-4 mr-1.5" /> Delete
          </Button>
          <button onClick={() => setSelected([])} className="text-xs text-slate-500 hover:text-slate-700 px-2">Clear</button>
          {bulkBusy && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
        </div>
      )}

      {/* Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No payroll records for this period</p>
              <Button onClick={() => setShowPreview(true)} disabled={processing} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                Run Payroll
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  {isAdminOrHR && (
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-blue-600 cursor-pointer"
                        checked={filtered.length > 0 && selected.length === filtered.length}
                        ref={(el) => { if (el) el.indeterminate = selected.length > 0 && selected.length < filtered.length; }}
                        onChange={(e) => setSelected(e.target.checked ? filtered.map((p: any) => p._id) : [])}
                        title="Select all"
                      />
                    </TableHead>
                  )}
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Days</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Gross</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Deductions</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Net Pay</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdminOrHR ? 8 : 7} className="text-center text-sm text-slate-400 py-8">
                      No records match the current filters.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((p: any) => (
                  <TableRow key={p._id} className={`hover:bg-slate-50 ${selected.includes(p._id) ? "bg-blue-50/40" : ""}`}>
                    {isAdminOrHR && (
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-blue-600 cursor-pointer"
                          checked={selected.includes(p._id)}
                          onChange={() => toggleSelect(p._id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <p className="text-sm font-semibold text-slate-800">{p.employeeId?.firstName} {p.employeeId?.lastName}</p>
                      <p className="text-xs text-slate-400">{p.employeeId?.designation}</p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                      {p.payableDays ?? p.workingDays}/{p.workingDays}
                      {p.lopDays > 0 && <span className="text-amber-600"> · {p.lopDays} LOP</span>}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium text-slate-700 tabular-nums">{formatCurrency(p.grossPay)}</TableCell>
                    <TableCell className="text-sm text-right text-red-500 tabular-nums">-{formatCurrency(p.totalDeductions)}</TableCell>
                    <TableCell className="text-sm text-right font-bold text-emerald-600 tabular-nums">{formatCurrency(p.netPay)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[p.status]}`}>{p.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewSlip(p)}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          title="View payslip"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {secureDocUrl(p.payslipUrl) ? (
                          <a
                            href={secureDocUrl(p.payslipUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        ) : (
                          <button
                            onClick={() => handleGeneratePdf(p._id)}
                            disabled={generatingPdf === p._id}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50"
                            title="Generate PDF payslip"
                          >
                            {generatingPdf === p._id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Download className="w-4 h-4" />}
                          </button>
                        )}
                        {isAdminOrHR && p.status !== "paid" && (
                          <>
                            <button
                              onClick={() => setEditRow(p)}
                              disabled={busyId === p._id}
                              className="p-1.5 rounded-lg text-violet-500 hover:bg-violet-50 transition-colors disabled:opacity-50"
                              title="Edit / recalculate"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {p.status === "draft" && (
                              <button
                                onClick={() => handleApprove(p._id)}
                                disabled={busyId === p._id}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                                title="Approve"
                              >
                                <BadgeCheck className="w-4 h-4" />
                              </button>
                            )}
                            {p.status === "processed" && (
                              <button
                                onClick={() => handleMarkPaid(p._id)}
                                disabled={busyId === p._id}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                                title="Mark as paid"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(p._id)}
                              disabled={busyId === p._id}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Delete (allows re-run)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals */}
                {filtered.length > 0 && (
                <TableRow className="bg-slate-100 hover:bg-slate-100 font-semibold border-t-2 border-slate-300">
                  {isAdminOrHR && <TableCell />}
                  <TableCell className="text-xs uppercase text-slate-600 whitespace-nowrap">Total ({filtered.length})</TableCell>
                  <TableCell />
                  <TableCell className="text-sm text-right tabular-nums text-slate-700">{formatCurrency(totalGross)}</TableCell>
                  <TableCell className="text-sm text-right tabular-nums text-red-600">-{formatCurrency(sumL((p) => p.totalDeductions))}</TableCell>
                  <TableCell className="text-sm text-right tabular-nums text-emerald-700">{formatCurrency(totalNetPay)}</TableCell>
                  <TableCell />
                  <TableCell />
                </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {viewSlip && (
        <Dialog open={!!viewSlip} onOpenChange={() => setViewSlip(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Salary Slip — {getMonthName(viewSlip.month)} {viewSlip.year}</DialogTitle>
            </DialogHeader>
            <PaySlip
              payroll={viewSlip}
              isAdmin={true}
              generating={generatingPdf === viewSlip._id}
              onGeneratePdf={() => handleGeneratePdf(viewSlip._id)}
            />
          </DialogContent>
        </Dialog>
      )}

      {editRow && (
        <EditPayrollDialog
          payroll={editRow}
          saving={busyId === editRow._id}
          onClose={() => setEditRow(null)}
          onSave={async (payload) => {
            const ok = await handleSaveEdit(editRow._id, payload);
            if (ok) setEditRow(null);
          }}
        />
      )}

      {showPreview && (
        <PayrollPreviewDialog
          month={month}
          year={year}
          processing={processing}
          onClose={() => setShowPreview(false)}
          onConfirm={handleRunPayroll}
        />
      )}
    </div>
  );
}

// ── Dry-run preview (before committing the run) ───────────────────────────────
function PayrollPreviewDialog({ month, year, processing, onClose, onConfirm }: {
  month: number;
  year: number;
  processing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { data, isLoading } = useSWR(`/api/payroll/preview?month=${month}&year=${year}`, fetcher);
  const rows = data?.rows || [];
  const skipped = data?.skipped || [];
  const totals = data?.totals || { gross: 0, deductions: 0, net: 0 };

  // Compact INR integer (blank when zero, to reduce clutter)
  const n = (v: number) => (v ? Math.round(v).toLocaleString("en-IN") : "—");
  const sum = (fn: (r: any) => number) => rows.reduce((s: number, r: any) => s + (fn(r) || 0), 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-[1400px] sm:max-w-[1400px]">
        <DialogHeader>
          <DialogTitle>Payroll Preview — {getMonthName(month)} {year}</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-slate-500">
          Draft preview — nothing is saved yet. Review the figures, then confirm to create draft payslips.
        </p>

        {isLoading ? (
          <div className="space-y-2 py-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 rounded-lg" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No eligible employees to process for this period.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-3">
              <StatBox label="Employees" value={String(rows.length)} tone="slate" />
              <StatBox label="Gross" value={formatCurrency(totals.gross)} tone="blue" />
              <StatBox label="Deductions" value={formatCurrency(totals.deductions)} tone="red" />
              <StatBox label="Net Pay" value={formatCurrency(totals.net)} tone="emerald" />
            </div>

            <div className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200">
              <Table className="min-w-[1250px]">
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="bg-slate-100 hover:bg-slate-100">
                    <TableHead className="text-[11px] sticky left-0 bg-slate-100 z-20">Employee</TableHead>
                    <TableHead className="text-[11px] whitespace-nowrap">Days</TableHead>
                    <TableHead className="text-[11px] text-right">Basic</TableHead>
                    <TableHead className="text-[11px] text-right">HRA</TableHead>
                    <TableHead className="text-[11px] text-right">Allow.</TableHead>
                    <TableHead className="text-[11px] text-right">OT</TableHead>
                    <TableHead className="text-[11px] text-right">Bonus</TableHead>
                    <TableHead className="text-[11px] text-right">Arrears</TableHead>
                    <TableHead className="text-[11px] text-right bg-blue-50 text-blue-700">Gross</TableHead>
                    <TableHead className="text-[11px] text-right">PF</TableHead>
                    <TableHead className="text-[11px] text-right">ESI</TableHead>
                    <TableHead className="text-[11px] text-right">TDS</TableHead>
                    <TableHead className="text-[11px] text-right">Adv.</TableHead>
                    <TableHead className="text-[11px] text-right">Other</TableHead>
                    <TableHead className="text-[11px] text-right bg-red-50 text-red-600">Deduct.</TableHead>
                    <TableHead className="text-[11px] text-right bg-emerald-50 text-emerald-700">Net Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r: any) => (
                    <TableRow key={r.employeeId} className="hover:bg-slate-50">
                      <TableCell className="text-xs sticky left-0 bg-white z-10 whitespace-nowrap">
                        <span className="font-medium text-slate-800">{r.employeeName}</span>
                        <span className="text-[10px] text-slate-400 ml-1">{r.employeeCode}</span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                        {r.payableDays}/{r.workingDays}
                        {r.lopDays > 0 && <span className="text-amber-600"> · {r.lopDays}L</span>}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{n(r.earnings?.basic)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{n(r.earnings?.hra)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{n(r.earnings?.allowances)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{n(r.earnings?.overtime)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{n(r.earnings?.bonus)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-violet-600">{n(r.earnings?.arrears)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-semibold text-blue-700 bg-blue-50/40">{n(r.grossPay)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-red-500">{n(r.deductions?.pf)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-red-500">{n(r.deductions?.esi)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-red-500">{n(r.deductions?.tax)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-red-500">{n(r.deductions?.advance)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-red-500">{n(r.deductions?.other)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-medium text-red-600 bg-red-50/40">{n(r.totalDeductions)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-bold text-emerald-600 bg-emerald-50/40">{n(r.netPay)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals */}
                  <TableRow className="bg-slate-100 hover:bg-slate-100 font-semibold">
                    <TableCell className="text-xs sticky left-0 bg-slate-100 z-10">TOTAL ({rows.length})</TableCell>
                    <TableCell />
                    <TableCell className="text-xs text-right tabular-nums">{n(sum((r: any) => r.earnings?.basic))}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{n(sum((r: any) => r.earnings?.hra))}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{n(sum((r: any) => r.earnings?.allowances))}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{n(sum((r: any) => r.earnings?.overtime))}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{n(sum((r: any) => r.earnings?.bonus))}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{n(sum((r: any) => r.earnings?.arrears))}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-blue-700 bg-blue-50">{n(totals.gross)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{n(sum((r: any) => r.deductions?.pf))}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{n(sum((r: any) => r.deductions?.esi))}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{n(sum((r: any) => r.deductions?.tax))}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{n(sum((r: any) => r.deductions?.advance))}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{n(sum((r: any) => r.deductions?.other))}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-red-600 bg-red-50">{n(totals.deductions)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-emerald-700 bg-emerald-50">{n(totals.net)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <p className="text-[10px] text-slate-400">All figures in ₹. OT = overtime, L = loss-of-pay days. Scroll horizontally for all columns.</p>

            {skipped.length > 0 && (
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-slate-600">{skipped.length} skipped:</span>{" "}
                {skipped.map((s: any) => `${s.employeeName} (${s.reason})`).join(", ")}
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>Cancel</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={onConfirm}
            disabled={processing || isLoading || rows.length === 0}
          >
            {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            {processing ? "Creating…" : `Confirm & Create ${rows.length} Draft${rows.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, tone }: { label: string; value: string; tone: string }) {
  const tones: Record<string, string> = {
    slate: "text-slate-700 bg-slate-50",
    blue: "text-blue-700 bg-blue-50",
    red: "text-red-600 bg-red-50",
    emerald: "text-emerald-700 bg-emerald-50",
  };
  return (
    <div className={`rounded-lg p-3 text-center ${tones[tone]}`}>
      <p className="text-base font-bold">{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

// ── Edit / recalculate dialog ─────────────────────────────────────────────────
function EditPayrollDialog({ payroll, saving, onClose, onSave }: {
  payroll: any;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: any) => void;
}) {
  const [bonus, setBonus]       = useState(String(payroll.earnings?.bonus ?? 0));
  const [advance, setAdvance]   = useState(String(payroll.deductions?.advance ?? 0));
  const [other, setOther]       = useState(String(payroll.deductions?.other ?? 0));
  const [lopDays, setLopDays]   = useState(String(payroll.lopDays ?? 0));
  const [payableDays, setPayableDays] = useState(String(payroll.payableDays ?? payroll.workingDays ?? 0));

  const num = (v: string) => (v === "" || isNaN(Number(v)) ? 0 : Number(v));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit & Recalculate — {getMonthName(payroll.month)} {payroll.year}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <p className="text-xs text-slate-500">
            Basic / HRA / PF / ESI / TDS recompute automatically from the salary structure and the
            paid-days below. Edit adjustments here, then Save to recalculate.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Paid Days (of {payroll.workingDays})</Label>
              <Input type="number" min={0} max={payroll.workingDays} value={payableDays}
                onChange={(e) => setPayableDays(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Loss-of-Pay Days</Label>
              <Input type="number" min={0} value={lopDays}
                onChange={(e) => setLopDays(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Bonus (₹)</Label>
              <Input type="number" min={0} value={bonus} onChange={(e) => setBonus(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Advance Recovery (₹)</Label>
              <Input type="number" min={0} value={advance} onChange={(e) => setAdvance(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Other Deduction (₹)</Label>
              <Input type="number" min={0} value={other} onChange={(e) => setOther(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={saving}
            onClick={() => onSave({
              bonus: num(bonus),
              advanceDeduction: num(advance),
              otherDeduction: num(other),
              lopDays: num(lopDays),
              payableDays: num(payableDays),
            })}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {saving ? "Saving…" : "Save & Recalculate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Employee payslip card ─────────────────────────────────────────────────────
function EmployeePayslipCard({ payroll, onView }: { payroll: any; onView: () => void }) {
  const hasPdf = !!secureDocUrl(payroll.payslipUrl);
  const attendancePct = payroll.workingDays
    ? Math.round((payroll.presentDays / payroll.workingDays) * 100)
    : 0;

  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">

          {/* Month icon + label */}
          <div className="flex items-center gap-3 sm:w-44 flex-shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-blue-600 uppercase leading-none">
                {getMonthName(payroll.month).slice(0, 3)}
              </span>
              <span className="text-sm font-bold text-blue-700 leading-none mt-0.5">{payroll.year}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{getMonthName(payroll.month)} {payroll.year}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[payroll.status] ?? "bg-slate-400"}`} />
                <span className="text-xs text-slate-500 capitalize">{payroll.status}</span>
              </div>
            </div>
          </div>

          {/* Net pay */}
          <div className="sm:flex-1">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Net Take Home</p>
            <p className="text-2xl font-black text-emerald-600 leading-tight mt-0.5">
              {formatCurrency(payroll.netPay)}
            </p>
          </div>

          {/* Breakdown chips */}
          <div className="flex flex-wrap gap-2 sm:w-64">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
              <TrendingUp className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-medium text-blue-700">{formatCurrency(payroll.grossPay)}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 rounded-lg border border-red-100">
              <TrendingDown className="w-3 h-3 text-red-500" />
              <span className="text-xs font-medium text-red-600">-{formatCurrency(payroll.totalDeductions)}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-xs font-medium text-slate-600">
                {payroll.presentDays}/{payroll.workingDays}d · {attendancePct}%
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onView}
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Details
            </Button>
            {hasPdf ? (
              <a href={secureDocUrl(payroll.payslipUrl)} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  PDF
                </Button>
              </a>
            ) : (
              <Button size="sm" variant="outline" disabled className="border-slate-200 text-slate-400 cursor-not-allowed">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Pending
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Payslip detail dialog ─────────────────────────────────────────────────────
function PaySlip({ payroll, isAdmin, generating, onGeneratePdf }: {
  payroll: any;
  isAdmin?: boolean;
  generating?: boolean;
  onGeneratePdf?: () => void;
}) {
  const emp = payroll.employeeId;
  return (
    <div className="border border-slate-200 rounded-xl p-6 space-y-5 bg-white">
      {/* Header */}
      <div className="flex justify-between items-start pb-4 border-b border-slate-100">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gehnax-logo.png" alt="Gehnax" className="h-8 w-auto mb-1" />
          <p className="text-xs text-slate-500">Salary Slip — {getMonthName(payroll.month)} {payroll.year}</p>
        </div>
        <Badge variant="outline" className={STATUS_COLORS[payroll.status]}>
          {payroll.status?.toUpperCase()}
        </Badge>
      </div>

      {/* Employee info */}
      {emp && (
        <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 rounded-xl p-4">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Employee Name</p>
            <p className="font-semibold text-slate-900">{emp.firstName} {emp.lastName}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Employee Code</p>
            <p className="font-semibold text-slate-900">{emp.employeeCode}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Designation</p>
            <p className="font-semibold text-slate-900">{emp.designation}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Paid Days</p>
            <p className="font-semibold text-slate-900">
              {payroll.payableDays ?? payroll.workingDays}/{payroll.workingDays}
              {payroll.lopDays > 0 && <span className="text-amber-600"> · {payroll.lopDays} LOP</span>}
            </p>
          </div>
        </div>
      )}

      <Separator />

      <div className="grid grid-cols-2 gap-6 text-sm">
        <div>
          <h3 className="font-bold text-slate-700 mb-3">Earnings</h3>
          <div className="space-y-2">
            {([
              ["Basic Salary", payroll.earnings?.basic],
              ["HRA", payroll.earnings?.hra],
              ["Allowances", payroll.earnings?.allowances],
              ["Overtime", payroll.earnings?.overtime],
              ["Bonus", payroll.earnings?.bonus],
              ["Arrears", payroll.earnings?.arrears],
            ] as [string, number][]).map(([l, v]) =>
              v > 0 ? (
                <div key={l} className="flex justify-between">
                  <span className="text-slate-500">{l}</span>
                  <span className="font-medium">{formatCurrency(v)}</span>
                </div>
              ) : null
            )}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Gross Pay</span>
              <span className="text-blue-600">{formatCurrency(payroll.grossPay)}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-700 mb-3">Deductions</h3>
          <div className="space-y-2">
            {([
              ["Provident Fund", payroll.deductions?.pf],
              ["ESI", payroll.deductions?.esi],
              ["Income Tax", payroll.deductions?.tax],
              ["Advance", payroll.deductions?.advance],
              ["Other", payroll.deductions?.other],
            ] as [string, number][]).map(([l, v]) =>
              v > 0 ? (
                <div key={l} className="flex justify-between">
                  <span className="text-slate-500">{l}</span>
                  <span className="font-medium text-red-500">-{formatCurrency(v)}</span>
                </div>
              ) : null
            )}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total Deductions</span>
              <span className="text-red-500">-{formatCurrency(payroll.totalDeductions)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net pay */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-emerald-700 font-medium">Net Pay (Take Home)</p>
          <p className="text-2xl font-bold text-emerald-700 mt-0.5">{formatCurrency(payroll.netPay)}</p>
        </div>
        <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {secureDocUrl(payroll.payslipUrl) ? (
          <a href={secureDocUrl(payroll.payslipUrl)} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="outline" className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </a>
        ) : isAdmin ? (
          <Button
            variant="outline"
            className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={onGeneratePdf}
            disabled={generating}
          >
            {generating
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              : <Download className="w-4 h-4 mr-2" />}
            {generating ? "Generating PDF…" : "Generate PDF Slip"}
          </Button>
        ) : (
          <Button variant="outline" className="flex-1 border-slate-200 text-slate-400" disabled>
            <Download className="w-4 h-4 mr-2" />
            PDF not generated yet
          </Button>
        )}
        <Button variant="outline" className="border-slate-200" onClick={() => window.print()} title="Print">
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
