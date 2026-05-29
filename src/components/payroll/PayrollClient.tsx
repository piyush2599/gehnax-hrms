"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DollarSign, FileText, Download, Play, Loader2, ExternalLink, TrendingUp, TrendingDown, Clock, Calendar } from "lucide-react";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useActiveRole } from "@/components/layout/active-role-context";

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

export default function PayrollClient() {
  const { data: session } = useSession();
  const { activeRole } = useActiveRole();
  const sessionEmployeeId = (session?.user as any)?.employeeId;
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [viewSlip, setViewSlip] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const isAdminOrHR = ["super_admin", "hr_admin"].includes(activeRole);
  const isEmployee  = activeRole === "employee";

  // Admin: filter by month+year. Employee: restrict to own records via employeeId.
  const adminUrl    = `/api/payroll?month=${month}&year=${year}`;
  const employeeUrl = `/api/payroll?year=${year}${sessionEmployeeId ? `&employeeId=${sessionEmployeeId}` : ""}`;

  const { data: payrolls, isLoading } = useSWR(
    isEmployee ? employeeUrl : adminUrl,
    fetcher
  );
  const list = Array.isArray(payrolls) ? payrolls : [];

  const totalNetPay = list.reduce((s: number, p: any) => s + (p.netPay || 0), 0);
  const totalGross  = list.reduce((s: number, p: any) => s + (p.grossPay || 0), 0);

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
        toast.success(`Payroll processed for ${data.created} employees`);
        mutate(adminUrl);
      }
    } finally { setProcessing(false); }
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
        <Button onClick={handleRunPayroll} disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
          <Play className="w-4 h-4 mr-1.5" />
          {processing ? "Processing…" : "Run Payroll"}
        </Button>
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

      {/* Month/year filter */}
      <div className="flex gap-3">
        <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v ?? "1"))}>
          <SelectTrigger className="w-40 bg-white border-slate-200"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m) => <SelectItem key={m} value={String(m)}>{getMonthName(m)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v ?? "2026"))}>
          <SelectTrigger className="w-28 bg-white border-slate-200"><SelectValue /></SelectTrigger>
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
          ) : list.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No payroll records for this period</p>
              <Button onClick={handleRunPayroll} disabled={processing} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                Run Payroll
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Attendance</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gross</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Deductions</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Pay</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p: any) => (
                  <TableRow key={p._id} className="hover:bg-slate-50">
                    <TableCell>
                      <p className="text-sm font-semibold text-slate-800">{p.employeeId?.firstName} {p.employeeId?.lastName}</p>
                      <p className="text-xs text-slate-400">{p.employeeId?.designation}</p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{p.presentDays}/{p.workingDays} days</TableCell>
                    <TableCell className="text-sm font-medium text-slate-700">{formatCurrency(p.grossPay)}</TableCell>
                    <TableCell className="text-sm text-red-500">-{formatCurrency(p.totalDeductions)}</TableCell>
                    <TableCell className="text-sm font-bold text-emerald-600">{formatCurrency(p.netPay)}</TableCell>
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
                        {p.payslipUrl ? (
                          <a
                            href={p.payslipUrl}
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
    </div>
  );
}

// ── Employee payslip card ─────────────────────────────────────────────────────
function EmployeePayslipCard({ payroll, onView }: { payroll: any; onView: () => void }) {
  const hasPdf = !!payroll.payslipUrl;
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
              <a href={payroll.payslipUrl} target="_blank" rel="noopener noreferrer">
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
          <img src="https://www.gehnax.com/Gehnax-logo.png" alt="Gehnax" className="h-8 w-auto mb-1" />
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
            <p className="text-xs text-slate-500 mb-0.5">Attendance</p>
            <p className="font-semibold text-slate-900">{payroll.presentDays}/{payroll.workingDays} days</p>
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
        {payroll.payslipUrl ? (
          <a href={payroll.payslipUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
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
