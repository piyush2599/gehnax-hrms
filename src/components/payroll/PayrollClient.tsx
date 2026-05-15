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
import { DollarSign, FileText, Download, Play } from "lucide-react";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const months = Array.from({ length: 12 }, (_, i) => i + 1);

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-slate-50 text-slate-600 border-slate-200",
  processed: "bg-blue-50 text-blue-700 border-blue-200",
  paid:      "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function PayrollClient() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "employee";
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [viewSlip, setViewSlip] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  const isAdminOrHR = ["super_admin","hr_admin"].includes(role);
  const { data: payrolls, isLoading } = useSWR(`/api/payroll?month=${month}&year=${year}`, fetcher);
  const list = Array.isArray(payrolls) ? payrolls : [];

  const totalNetPay  = list.reduce((s: number, p: any) => s + (p.netPay || 0), 0);
  const totalGross   = list.reduce((s: number, p: any) => s + (p.grossPay || 0), 0);

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
      else { toast.success(`Payroll processed for ${data.created} employees`); mutate(`/api/payroll?month=${month}&year=${year}`); }
    } finally { setProcessing(false); }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">{getMonthName(month)} {year}</p>
        {isAdminOrHR && (
          <Button onClick={handleRunPayroll} disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Play className="w-4 h-4 mr-1.5" />
            {processing ? "Processing…" : "Run Payroll"}
          </Button>
        )}
      </div>

      {/* Summary cards (admin) */}
      {isAdminOrHR && list.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Employees",  value: list.length,                                        color: "text-slate-700",  bg: "bg-slate-50" },
            { label: "Gross Pay",  value: formatCurrency(totalGross),                         color: "text-blue-700",   bg: "bg-blue-50" },
            { label: "Net Pay",    value: formatCurrency(totalNetPay),                        color: "text-emerald-700",bg: "bg-emerald-50" },
            { label: "Processed",  value: list.filter((p: any) => p.status !== "draft").length, color: "text-violet-700", bg: "bg-violet-50" },
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
            <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : list.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No payroll records for this period</p>
              {isAdminOrHR && (
                <Button onClick={handleRunPayroll} disabled={processing} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                  Run Payroll
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  {isAdminOrHR && <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</TableHead>}
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Attendance</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gross</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Deductions</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Pay</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p: any) => (
                  <TableRow key={p._id} className="hover:bg-slate-50">
                    {isAdminOrHR && (
                      <TableCell>
                        <p className="text-sm font-semibold text-slate-800">{p.employeeId?.firstName} {p.employeeId?.lastName}</p>
                        <p className="text-xs text-slate-400">{p.employeeId?.designation}</p>
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-slate-600">{p.presentDays}/{p.workingDays} days</TableCell>
                    <TableCell className="text-sm font-medium text-slate-700">{formatCurrency(p.grossPay)}</TableCell>
                    <TableCell className="text-sm text-red-500">-{formatCurrency(p.totalDeductions)}</TableCell>
                    <TableCell className="text-sm font-bold text-emerald-600">{formatCurrency(p.netPay)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[p.status]}`}>{p.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <button onClick={() => setViewSlip(p)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="View payslip">
                        <FileText className="w-4 h-4" />
                      </button>
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
            <DialogHeader><DialogTitle>Salary Slip</DialogTitle></DialogHeader>
            <PaySlip payroll={viewSlip} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function PaySlip({ payroll }: { payroll: any }) {
  const emp = payroll.employeeId;
  return (
    <div className="border border-slate-200 rounded-xl p-6 space-y-5 bg-white">
      {/* Header */}
      <div className="flex justify-between items-start pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Gehnax Technologies</h2>
          </div>
          <p className="text-xs text-slate-500">Salary Slip — {getMonthName(payroll.month)} {payroll.year}</p>
        </div>
        <Badge variant="outline" className={`${STATUS_COLORS[payroll.status]}`}>
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
            {[["Basic Salary", payroll.earnings?.basic], ["HRA", payroll.earnings?.hra], ["Allowances", payroll.earnings?.allowances], ["Overtime", payroll.earnings?.overtime], ["Bonus", payroll.earnings?.bonus]].map(([l, v]) =>
              (v as number) > 0 ? (
                <div key={l as string} className="flex justify-between">
                  <span className="text-slate-500">{l}</span>
                  <span className="font-medium">{formatCurrency(v as number)}</span>
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
            {[["Provident Fund", payroll.deductions?.pf], ["ESI", payroll.deductions?.esi], ["Income Tax", payroll.deductions?.tax], ["Advance", payroll.deductions?.advance], ["Other", payroll.deductions?.other]].map(([l, v]) =>
              (v as number) > 0 ? (
                <div key={l as string} className="flex justify-between">
                  <span className="text-slate-500">{l}</span>
                  <span className="font-medium text-red-500">-{formatCurrency(v as number)}</span>
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

      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-emerald-700 font-medium">Net Pay (Take Home)</p>
          <p className="text-2xl font-bold text-emerald-700 mt-0.5">{formatCurrency(payroll.netPay)}</p>
        </div>
        <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-white" />
        </div>
      </div>

      <Button variant="outline" className="w-full border-slate-200" onClick={() => window.print()}>
        <Download className="w-4 h-4 mr-2" />
        Print / Download
      </Button>
    </div>
  );
}
