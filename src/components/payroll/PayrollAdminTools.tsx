"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "sonner";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { Wallet, TrendingUp, FileSpreadsheet, UserMinus, Loader2, Trash2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function useEmployees() {
  const { data } = useSWR("/api/employees?limit=500", fetcher);
  return (data?.employees || []) as any[];
}

export default function PayrollAdminTools({ month, year }: { month: number; year: number }) {
  const [open, setOpen] = useState<null | "advance" | "revise" | "reports" | "settle">(null);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen("advance")} className="border-slate-200">
          <Wallet className="w-4 h-4 mr-1.5 text-blue-500" /> Advances
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen("revise")} className="border-slate-200">
          <TrendingUp className="w-4 h-4 mr-1.5 text-emerald-500" /> Revise Salary
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen("settle")} className="border-slate-200">
          <UserMinus className="w-4 h-4 mr-1.5 text-amber-500" /> Final Settlement
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen("reports")} className="border-slate-200">
          <FileSpreadsheet className="w-4 h-4 mr-1.5 text-violet-500" /> Statutory Reports
        </Button>
      </div>

      {open === "advance" && <AdvancesDialog onClose={() => setOpen(null)} />}
      {open === "revise" && <ReviseSalaryDialog onClose={() => setOpen(null)} />}
      {open === "reports" && <ReportsDialog month={month} year={year} onClose={() => setOpen(null)} />}
      {open === "settle" && <SettlementDialog onClose={() => setOpen(null)} />}
    </>
  );
}

// ── Advances ──────────────────────────────────────────────────────────────────
function AdvancesDialog({ onClose }: { onClose: () => void }) {
  const employees = useEmployees();
  const { data } = useSWR("/api/advances", fetcher);
  const advances = data?.advances || [];
  const [emp, setEmp] = useState("");
  const [principal, setPrincipal] = useState("");
  const [emi, setEmi] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const startPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const add = async () => {
    if (!emp || !principal || !emi) { toast.error("Employee, principal and EMI are required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/advances", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: emp, principal: Number(principal), emiAmount: Number(emi), startPeriod, reason }),
      });
      const d = await res.json();
      if (!res.ok) toast.error(d.error || "Failed");
      else { toast.success("Advance created — auto-recovered from next payroll"); mutate("/api/advances"); setPrincipal(""); setEmi(""); setReason(""); }
    } finally { setSaving(false); }
  };

  const close = async (id: string, status: string) => {
    const res = await fetch(`/api/advances/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    if (res.ok) { toast.success(`Advance ${status}`); mutate("/api/advances"); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Salary Advances & Loans</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-4">
          <div className="col-span-2">
            <Label className="text-xs">Employee</Label>
            <NativeSelect value={emp} onChange={(e) => setEmp(e.target.value)}>
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>{e.firstName} {e.lastName} · {e.employeeCode}</option>
              ))}
            </NativeSelect>
          </div>
          <div><Label className="text-xs">Principal (₹)</Label><Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} /></div>
          <div><Label className="text-xs">Monthly EMI (₹)</Label><Input type="number" value={emi} onChange={(e) => setEmi(e.target.value)} /></div>
          <div className="col-span-2"><Label className="text-xs">Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <div className="col-span-2 flex justify-end">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={add} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null} Add Advance (from {startPeriod})
            </Button>
          </div>
        </div>
        <div className="max-h-64 overflow-auto space-y-2 pt-2">
          {advances.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No advances yet</p>}
          {advances.map((a: any) => (
            <div key={a._id} className="flex items-center justify-between text-sm border border-slate-100 rounded-lg p-3">
              <div>
                <p className="font-medium text-slate-800">{a.employeeId?.firstName} {a.employeeId?.lastName}</p>
                <p className="text-xs text-slate-500">
                  EMI {formatCurrency(a.emiAmount)} · Balance {formatCurrency(a.balance)} of {formatCurrency(a.principal)} · {a.status}
                </p>
              </div>
              {a.status === "active" && (
                <div className="flex gap-1">
                  <button onClick={() => close(a._id, "closed")} className="text-xs text-emerald-600 hover:underline px-2">Close</button>
                  <button onClick={() => close(a._id, "cancelled")} className="text-xs text-red-500 hover:underline px-2">Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Revise Salary ─────────────────────────────────────────────────────────────
function ReviseSalaryDialog({ onClose }: { onClose: () => void }) {
  const employees = useEmployees();
  const [emp, setEmp] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [basic, setBasic] = useState("");
  const [hra, setHra] = useState("");
  const [allowances, setAllowances] = useState("");
  const [pf, setPf] = useState("");
  const [tds, setTds] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!emp || !basic) { toast.error("Employee and basic are required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${emp}/salary-revisions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          effectiveFrom,
          salary: { basic: Number(basic), hra: Number(hra) || 0, allowances: Number(allowances) || 0, pf: pf ? Number(pf) : undefined, tds: tds ? Number(tds) : undefined },
          reason,
        }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || "Failed"); return; }
      if (d.arrears > 0) toast.success(`Revision saved. Arrears ${formatCurrency(d.arrears)} queued for next payroll.`);
      else toast.success("Salary revision saved");
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Revise Salary</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs">Employee</Label>
            <NativeSelect value={emp} onChange={(e) => setEmp(e.target.value)}>
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>{e.firstName} {e.lastName} · {e.employeeCode}</option>
              ))}
            </NativeSelect>
          </div>
          <div><Label className="text-xs">Effective From</Label><Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} /></div>
          <div><Label className="text-xs">Basic (₹)</Label><Input type="number" value={basic} onChange={(e) => setBasic(e.target.value)} /></div>
          <div><Label className="text-xs">HRA (₹)</Label><Input type="number" value={hra} onChange={(e) => setHra(e.target.value)} /></div>
          <div><Label className="text-xs">Allowances (₹)</Label><Input type="number" value={allowances} onChange={(e) => setAllowances(e.target.value)} /></div>
          <div><Label className="text-xs">Employee PF (₹/mo)</Label><Input type="number" value={pf} onChange={(e) => setPf(e.target.value)} /></div>
          <div><Label className="text-xs">TDS (₹/mo)</Label><Input type="number" value={tds} onChange={(e) => setTds(e.target.value)} /></div>
          <div className="col-span-2"><Label className="text-xs">Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Annual increment, promotion…" /></div>
        </div>
        <p className="text-xs text-slate-400">Back-dating before already-run payrolls auto-computes arrears for the next run.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save Revision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Statutory Reports ─────────────────────────────────────────────────────────
function ReportsDialog({ month, year, onClose }: { month: number; year: number; onClose: () => void }) {
  const reports = [
    { type: "summary", label: "Payroll Summary" },
    { type: "pf", label: "PF ECR (Provident Fund)" },
    { type: "esi", label: "ESI Contribution" },
    { type: "tds", label: "TDS / Income Tax" },
  ];
  const download = (type: string) => {
    window.open(`/api/reports/statutory?year=${year}&month=${month}&type=${type}&format=csv`, "_blank");
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Statutory Reports — {getMonthName(month)} {year}</DialogTitle></DialogHeader>
        <p className="text-xs text-slate-500">Download CSV registers for the selected pay period.</p>
        <div className="space-y-2">
          {reports.map((r) => (
            <button key={r.type} onClick={() => download(r.type)}
              className="w-full flex items-center justify-between border border-slate-200 rounded-lg p-3 hover:bg-slate-50 text-sm">
              <span className="font-medium text-slate-700">{r.label}</span>
              <FileSpreadsheet className="w-4 h-4 text-violet-500" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Final Settlement ──────────────────────────────────────────────────────────
function SettlementDialog({ onClose }: { onClose: () => void }) {
  const employees = useEmployees();
  const [emp, setEmp] = useState("");
  const [lwd, setLwd] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const runPreview = async () => {
    if (!emp) { toast.error("Select an employee"); return; }
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (lwd) qs.set("lastWorkingDay", lwd);
      const res = await fetch(`/api/employees/${emp}/settlement?${qs}`);
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || "Failed"); setPreview(null); }
      else setPreview(d.preview);
    } finally { setLoading(false); }
  };

  const save = async (status: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${emp}/settlement`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastWorkingDay: lwd || preview?.lastWorkingDay, status }),
      });
      const d = await res.json();
      if (!res.ok) toast.error(d.error || "Failed");
      else { toast.success(`Settlement ${status}`); onClose(); }
    } finally { setSaving(false); }
  };

  const Row = ({ l, v, neg }: { l: string; v: number; neg?: boolean }) => v ? (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{l}</span>
      <span className={neg ? "text-red-500" : "text-slate-800"}>{neg ? "-" : ""}{formatCurrency(v)}</span>
    </div>
  ) : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Full & Final Settlement</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs">Employee</Label>
            <NativeSelect value={emp} onChange={(e) => { setEmp(e.target.value); setPreview(null); }}>
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>{e.firstName} {e.lastName} · {e.employeeCode}</option>
              ))}
            </NativeSelect>
          </div>
          <div><Label className="text-xs">Last Working Day</Label><Input type="date" value={lwd} onChange={(e) => setLwd(e.target.value)} /></div>
          <div className="flex items-end">
            <Button size="sm" variant="outline" onClick={runPreview} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null} Preview
            </Button>
          </div>
        </div>

        {preview && (
          <div className="border border-slate-200 rounded-xl p-4 space-y-1.5 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase">Earnings</p>
            <Row l="Salary (final month)" v={preview.salaryPayable} />
            <Row l="Leave Encashment" v={preview.leaveEncashment} />
            <Row l="Gratuity" v={preview.gratuity} />
            <Row l="Bonus" v={preview.bonus} />
            <p className="text-xs font-semibold text-slate-500 uppercase pt-2">Deductions</p>
            <Row l="Advance Recovery" v={preview.advanceRecovery} neg />
            <Row l="Notice Recovery" v={preview.noticeRecovery} neg />
            <Row l="TDS" v={preview.tds} neg />
            <div className="flex justify-between font-bold text-emerald-700 border-t border-slate-200 pt-2 mt-2">
              <span>Net Settlement</span><span>{formatCurrency(preview.netSettlement)}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          {preview && (
            <>
              <Button variant="outline" onClick={() => save("draft")} disabled={saving}>Save Draft</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => save("approved")} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Approve & Close Advances
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
