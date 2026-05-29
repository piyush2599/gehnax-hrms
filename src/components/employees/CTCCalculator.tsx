"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calculateCRM, fmt, type CRMBreakdown, type PFConfig } from "@/lib/ctc-calculator";
import { Sparkles, MapPin, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onApply: (salary: { basic: number; hra: number; allowances: number; deductions: number }) => void;
  initialCTC?: number;
}

export default function CTCCalculator({ onApply, initialCTC = 0 }: Props) {
  const [crmInput, setCrmInput]         = useState(initialCTC ? String(initialCTC) : "");
  const [isMetro, setIsMetro]           = useState(true);
  const [pfEnabled, setPfEnabled]       = useState(true);
  const [pfType, setPfType]             = useState<"fixed" | "percent">("percent");
  const [pfFixed, setPfFixed]           = useState("1800");
  const [pfPct, setPfPct]               = useState("12");
  const [includeGratuity, setGratuity]  = useState(true);
  const [result, setResult]             = useState<CRMBreakdown | null>(null);
  const [applied, setApplied]           = useState(false);

  useEffect(() => {
    const val = parseInt(crmInput.replace(/,/g, "")) || 0;
    const pf: PFConfig = pfEnabled
      ? pfType === "fixed"
        ? { type: "fixed",   fixedMonthly: Math.max(0, parseInt(pfFixed) || 0) }
        : { type: "percent", pct: Math.max(0, Math.min(parseFloat(pfPct) || 12, 100)) }
      : { type: "none" };
    setResult(calculateCRM(val, isMetro, pf, includeGratuity));
    setApplied(false);
  }, [crmInput, isMetro, pfEnabled, pfType, pfFixed, pfPct, includeGratuity]);

  const handleApply = () => {
    if (!result) return;
    onApply({
      basic:      result.basicMonthly,
      hra:        result.hraMonthly,
      allowances: result.otherAllowancesMonthly,
      deductions: result.totalDeductionsMonthly,
    });
    setApplied(true);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-blue-100 rounded-lg">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-900">CRM Calculator</p>
          <p className="text-xs text-blue-600">New Tax Regime · FY 2025-26</p>
        </div>
      </div>

      {/* CRM Input + Metro toggle */}
      <div className="flex gap-3 items-end">
        <div className="flex-1 space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Annual CRM (₹)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₹</span>
            <Input
              className="pl-7 bg-white border-blue-200 focus:border-blue-400"
              placeholder="e.g. 320016"
              value={crmInput}
              onChange={(e) => setCrmInput(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>
          {crmInput && parseInt(crmInput) > 0 && (
            <p className="text-xs text-slate-400">
              {parseInt(crmInput).toLocaleString("en-IN")} / year
              {parseInt(crmInput) >= 100000 && ` · ₹${(parseInt(crmInput) / 100000).toFixed(1)} LPA`}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            City
          </Label>
          <div className="flex rounded-lg border border-blue-200 overflow-hidden text-xs">
            <button type="button" onClick={() => setIsMetro(true)}
              className={cn("px-3 py-2 font-semibold transition-colors",
                isMetro ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}>
              Metro
            </button>
            <button type="button" onClick={() => setIsMetro(false)}
              className={cn("px-3 py-2 font-semibold transition-colors",
                !isMetro ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}>
              Non-Metro
            </button>
          </div>
        </div>
      </div>

      {/* Config grid: PF + Gratuity */}
      <div className="grid grid-cols-2 gap-3">

        {/* ── PF Column ── */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Provident Fund (PF)
          </Label>

          {/* Yes / No */}
          <div className="flex rounded-lg border border-blue-200 overflow-hidden text-xs">
            <button type="button" onClick={() => setPfEnabled(true)}
              className={cn("flex-1 py-2 font-semibold transition-colors",
                pfEnabled ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}>
              Yes
            </button>
            <button type="button" onClick={() => setPfEnabled(false)}
              className={cn("flex-1 py-2 font-semibold transition-colors",
                !pfEnabled ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}>
              No
            </button>
          </div>

          {/* Fixed / Percent — shown only when PF = Yes */}
          {pfEnabled && (
            <>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                <button type="button" onClick={() => setPfType("fixed")}
                  className={cn("flex-1 py-1.5 font-semibold transition-colors",
                    pfType === "fixed" ? "bg-slate-700 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}>
                  Fixed ₹
                </button>
                <button type="button" onClick={() => setPfType("percent")}
                  className={cn("flex-1 py-1.5 font-semibold transition-colors",
                    pfType === "percent" ? "bg-slate-700 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}>
                  Percent %
                </button>
              </div>

              {pfType === "fixed" ? (
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">₹</span>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    className="pl-6 bg-white border-blue-200 text-sm h-8"
                    placeholder="e.g. 1800"
                    value={pfFixed}
                    onChange={(e) => setPfFixed(e.target.value)}
                  />
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    className="pr-7 bg-white border-blue-200 text-sm h-8"
                    placeholder="e.g. 12"
                    value={pfPct}
                    onChange={(e) => setPfPct(e.target.value)}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">%</span>
                </div>
              )}

              <p className="text-[11px] text-slate-400 leading-snug">
                {pfType === "fixed"
                  ? `₹${(parseInt(pfFixed) || 0).toLocaleString("en-IN")}/mo fixed (Employee + Employer)`
                  : `Max ₹${Math.round(15000 * (parseFloat(pfPct) || 12) / 100).toLocaleString("en-IN")}/mo on ₹15k wage ceiling`}
              </p>
            </>
          )}

          {!pfEnabled && (
            <p className="text-[11px] text-slate-400">No PF deducted — exempt</p>
          )}
        </div>

        {/* ── Gratuity Column ── */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-600">Gratuity</Label>

          <div className="flex rounded-lg border border-blue-200 overflow-hidden text-xs">
            <button type="button" onClick={() => setGratuity(true)}
              className={cn("flex-1 py-2 font-semibold transition-colors",
                includeGratuity ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}>
              Yes
            </button>
            <button type="button" onClick={() => setGratuity(false)}
              className={cn("flex-1 py-2 font-semibold transition-colors",
                !includeGratuity ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}>
              No
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-snug">
            {includeGratuity
              ? "Basic × 15/312 — included in CRM cost"
              : "Not included in CRM cost"}
          </p>
        </div>
      </div>

      {/* Result table */}
      {result && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <div className="px-3 py-2">Component</div>
              <div className="px-3 py-2 text-right">Monthly</div>
              <div className="px-3 py-2 text-right">Annual</div>
            </div>

            {/* Earnings */}
            <div className="px-3 py-1.5 bg-emerald-50 border-b border-slate-100">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Earnings</span>
            </div>
            <TableRow label="Basic Salary"                               monthly={fmt(result.basicMonthly)}           annual={fmt(result.basicAnnual)}           accent />
            <TableRow label={`HRA (${isMetro ? "50%" : "40%"} of Basic)`} monthly={fmt(result.hraMonthly)}           annual={fmt(result.hraAnnual)} />
            <TableRow label="Other Allowances"                           monthly={fmt(result.otherAllowancesMonthly)} annual={fmt(result.otherAllowancesAnnual)} />
            <TableRow label="Gross Salary"                               monthly={fmt(result.grossMonthly)}           annual={fmt(result.grossAnnual)}           bold />

            {/* Deductions */}
            <div className="px-3 py-1.5 bg-red-50 border-y border-slate-100">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">Deductions</span>
            </div>
            {result.pfConfig.type !== "none" ? (
              <TableRow label={`Employee PF (${result.pfLabel})`} monthly={`− ${fmt(result.employeePFMonthly)}`} annual={`− ${fmt(result.employeePFAnnual)}`} red />
            ) : (
              <TableRow label="Employee PF" monthly="Nil (Exempt)" annual="Nil" green />
            )}
            <TableRow
              label={result.monthlyTDS === 0 ? "Income Tax TDS (87A Rebate)" : "Income Tax TDS"}
              monthly={result.monthlyTDS === 0 ? "Nil" : `− ${fmt(result.monthlyTDS)}`}
              annual={result.annualTax === 0 ? "Nil" : `− ${fmt(result.annualTax)}`}
              red={result.monthlyTDS > 0}
              green={result.monthlyTDS === 0}
            />

            {/* In-hand = Gross − Employee PF − TDS */}
            <div className="border-t-2 border-emerald-200 bg-emerald-50">
              <TableRow label="In-Hand (Net Pay)" monthly={fmt(result.inHandMonthly)} annual={fmt(result.inHandAnnual)} bold green />
            </div>

            {/* Employer contributions — not deducted from employee, part of CRM cost */}
            {(result.pfConfig.type !== "none" || result.includeGratuity) && (
              <>
                <div className="px-3 py-1.5 bg-violet-50 border-y border-slate-100">
                  <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wide">Employer Contributions (CRM Cost)</span>
                </div>
                {result.pfConfig.type !== "none" && (
                  <TableRow label={`Employer PF (${result.pfLabel})`} monthly={fmt(result.employerPFMonthly)} annual={fmt(result.employerPFAnnual)} violet />
                )}
                {result.includeGratuity && (
                  <TableRow label="Gratuity (Basic × 15/312)" monthly={fmt(result.gratuityMonthly)} annual={fmt(result.gratuityAnnual)} violet />
                )}
              </>
            )}

            {/* CRM total */}
            <div className="border-t-2 border-slate-300 bg-blue-50">
              <TableRow label="CRM (Cost to Company)" monthly={fmt(Math.round(result.crmAnnual / 12))} annual={fmt(result.crmAnnual)} bold blue />
            </div>
          </div>

          {/* Summary strip */}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-4 text-xs">
            <div>
              <p className="text-slate-400">Take-home</p>
              <p className="font-bold text-emerald-600 text-sm">{result.takeHomePct}% of CRM</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-slate-400">Effective tax</p>
              <p className="font-bold text-slate-700 text-sm">{result.effectiveTaxRate}%</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-slate-400">Tax slab</p>
              <p className="font-bold text-blue-600 text-sm">{result.taxSlab}</p>
            </div>
          </div>

          {/* Apply button */}
          <Button
            type="button"
            onClick={handleApply}
            className={cn(
              "w-full gap-2 transition-all",
              applied ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700 text-white"
            )}
          >
            <Sparkles className="w-4 h-4" />
            {applied ? "✓ Applied to Salary Fields" : "Apply to Salary Fields"}
          </Button>
          {applied && (
            <p className="text-xs text-center text-emerald-600 font-medium -mt-1">
              Basic, HRA, Allowances &amp; Deductions have been filled in below
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TableRow({
  label, monthly, annual,
  bold, red, green, accent, violet, blue,
}: {
  label: string; monthly: string; annual: string;
  bold?: boolean; red?: boolean; green?: boolean;
  accent?: boolean; violet?: boolean; blue?: boolean;
}) {
  return (
    <div className={cn("grid grid-cols-3 text-xs border-b border-slate-100 last:border-0", bold && "font-bold bg-slate-50")}>
      <span className={cn("px-3 py-2 text-slate-600", bold && "text-slate-800", accent && "font-semibold text-slate-700")}>
        {label}
      </span>
      <span className={cn("px-3 py-2 text-right font-semibold",
        red && "text-red-600", green && "text-emerald-600",
        violet && "text-violet-700", blue && "text-blue-700",
        !red && !green && !violet && !blue && "text-slate-800")}>
        {monthly}
      </span>
      <span className={cn("px-3 py-2 text-right font-semibold",
        red && "text-red-600", green && "text-emerald-600",
        violet && "text-violet-700", blue && "text-blue-700",
        !red && !green && !violet && !blue && "text-slate-800")}>
        {annual}
      </span>
    </div>
  );
}
