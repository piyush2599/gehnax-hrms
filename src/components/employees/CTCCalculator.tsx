"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calculateCTC, fmt, type CTCBreakdown } from "@/lib/ctc-calculator";
import { Sparkles, Info, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onApply: (salary: { basic: number; hra: number; allowances: number; deductions: number }) => void;
  initialCTC?: number;
}

export default function CTCCalculator({ onApply, initialCTC = 0 }: Props) {
  const [ctcInput, setCtcInput] = useState(initialCTC ? String(initialCTC) : "");
  const [isMetro, setIsMetro] = useState(true);
  const [result, setResult] = useState<CTCBreakdown | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    const val = parseInt(ctcInput.replace(/,/g, "")) || 0;
    setResult(calculateCTC(val, isMetro));
    setApplied(false);
  }, [ctcInput, isMetro]);

  const handleApply = () => {
    if (!result) return;
    onApply({
      basic:       result.basicMonthly,
      hra:         result.hraMonthly,
      allowances:  result.specialAllowanceMonthly,
      deductions:  result.employeePFMonthly + result.esiMonthly + result.professionalTaxMonthly,
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
          <p className="text-sm font-semibold text-blue-900">CTC Calculator</p>
          <p className="text-xs text-blue-600">New Tax Regime · FY 2025-26 (Budget 2025)</p>
        </div>
      </div>

      {/* CTC Input */}
      <div className="flex gap-3 items-end">
        <div className="flex-1 space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Annual CTC (₹)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₹</span>
            <Input
              className="pl-7 bg-white border-blue-200 focus:border-blue-400"
              placeholder="e.g. 1200000"
              value={ctcInput}
              onChange={(e) => setCtcInput(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>
          {ctcInput && (
            <p className="text-xs text-slate-400">
              {parseInt(ctcInput).toLocaleString("en-IN")} / year
              {parseInt(ctcInput) >= 100000 && ` · ₹${(parseInt(ctcInput) / 100000).toFixed(1)} LPA`}
            </p>
          )}
        </div>
        {/* Metro toggle */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            City
          </Label>
          <div className="flex rounded-lg border border-blue-200 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setIsMetro(true)}
              className={cn(
                "px-3 py-2 font-semibold transition-colors",
                isMetro ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
              )}
            >
              Metro
            </button>
            <button
              type="button"
              onClick={() => setIsMetro(false)}
              className={cn(
                "px-3 py-2 font-semibold transition-colors",
                !isMetro ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
              )}
            >
              Non-Metro
            </button>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-3">
          {/* CTC → Gross derivation — shown first so it's clear what employer pays vs employee receives */}
          <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3 text-xs space-y-1.5">
            <p className="font-semibold text-violet-900 mb-2 text-sm">CTC Breakdown (Annual)</p>
            <div className="flex justify-between text-slate-700 font-semibold">
              <span>Cost to Company (CTC)</span>
              <span className="text-violet-700">{fmt(result.ctcAnnual)}</span>
            </div>
            <div className="flex justify-between text-slate-500 pl-2">
              <span>− Employer PF (12% of Basic)</span>
              <span className="font-medium text-red-500">− {fmt(result.employerPFAnnual)}</span>
            </div>
            <div className="flex justify-between text-slate-500 pl-2">
              <span>− Gratuity (4.81% of Basic)</span>
              <span className="font-medium text-red-500">− {fmt(result.gratuityAnnual)}</span>
            </div>
            <div className="flex justify-between text-slate-800 font-bold border-t border-violet-200 pt-1.5">
              <span>= Gross Salary (Annual)</span>
              <span className="text-violet-700">{fmt(result.grossAnnual)}</span>
            </div>
            <div className="flex justify-between text-slate-600 border-t border-violet-100 pt-1.5">
              <span>Gross Monthly</span>
              <span className="font-semibold">{fmt(result.grossMonthly)}</span>
            </div>
            <p className="text-slate-400 pt-0.5">
              Employer PF &amp; Gratuity are part of CTC but paid separately — not credited to employee's salary account.
            </p>
          </div>

          {/* In-Hand highlight */}
          <div className="bg-white rounded-xl border border-emerald-200 p-4 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">In-Hand Monthly</p>
              <p className="text-2xl font-black text-emerald-600 mt-0.5">{fmt(result.inHandMonthly)}</p>
              <p className="text-xs text-slate-400 mt-0.5">{fmt(result.inHandAnnual)} / year</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-emerald-600">{result.takeHomePct}%</div>
              <p className="text-xs text-slate-400">of CTC</p>
              <Badge variant="outline" className="text-xs mt-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                Tax: {result.effectiveTaxRate}%
              </Badge>
            </div>
          </div>

          {/* Salary structure */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Salary Structure (Monthly)</p>
            <SalaryRow label="Basic Salary"        value={fmt(result.basicMonthly)}        accent />
            <SalaryRow label={`HRA (${isMetro ? "Metro 50%" : "Non-Metro 40%"})`} value={fmt(result.hraMonthly)} />
            <SalaryRow label="Special Allowance"   value={fmt(result.specialAllowanceMonthly)} />
            <div className="border-t border-slate-100 pt-2">
              <SalaryRow label="Gross Salary"       value={fmt(result.grossMonthly)} bold />
            </div>
          </div>

          {/* Deductions */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Monthly Deductions</p>
            <SalaryRow label="Employee PF (12% of Basic)" value={`− ${fmt(result.employeePFMonthly)}`} red />
            {result.esiMonthly > 0 && (
              <SalaryRow label="ESI (0.75% of Gross)"     value={`− ${fmt(result.esiMonthly)}`}          red />
            )}
            <SalaryRow label="Professional Tax"            value={`− ${fmt(result.professionalTaxMonthly)}`} red />
            <SalaryRow
              label={result.monthlyTDS === 0 ? "Income Tax TDS (87A Rebate ✓)" : "Income Tax TDS"}
              value={result.monthlyTDS === 0 ? "Nil" : `− ${fmt(result.monthlyTDS)}`}
              red={result.monthlyTDS > 0}
              green={result.monthlyTDS === 0}
            />
            <div className="border-t border-slate-100 pt-2">
              <SalaryRow label="Total Deductions" value={`− ${fmt(result.totalDeductionsMonthly)}`} bold red />
            </div>
          </div>

          {/* Tax info */}
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-amber-800 mb-1">
              <Info className="w-3.5 h-3.5" />
              Tax Details (New Regime · FY 2025-26)
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Gross Annual</span>
              <span className="font-medium">{fmt(result.grossAnnual)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Standard Deduction</span>
              <span className="font-medium text-emerald-600">− {fmt(result.standardDeduction)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Taxable Income</span>
              <span className="font-medium">{fmt(result.taxableIncome)}</span>
            </div>
            <div className="flex justify-between text-slate-700 font-semibold">
              <span>Annual Tax</span>
              <span className={result.annualTax === 0 ? "text-emerald-600" : "text-red-600"}>
                {result.annualTax === 0 ? "Zero (87A Rebate)" : fmt(result.annualTax)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Applicable Slab</span>
              <span className="font-medium text-blue-600">{result.taxSlab}</span>
            </div>
          </div>

          {/* Apply button */}
          <Button
            type="button"
            onClick={handleApply}
            className={cn(
              "w-full gap-2 transition-all",
              applied
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            <Sparkles className="w-4 h-4" />
            {applied ? "✓ Applied to Salary Fields" : "Apply to Salary Fields"}
          </Button>
          {applied && (
            <p className="text-xs text-center text-emerald-600 font-medium -mt-1">
              Basic, HRA, Allowances & Deductions have been filled in below
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SalaryRow({
  label, value, bold, red, green, accent,
}: {
  label: string; value: string;
  bold?: boolean; red?: boolean; green?: boolean; accent?: boolean;
}) {
  return (
    <div className={cn("flex justify-between items-center text-xs", bold && "font-bold")}>
      <span className={cn(
        "text-slate-500",
        bold && "text-slate-800",
        accent && "font-semibold text-slate-700"
      )}>
        {label}
      </span>
      <span className={cn(
        "font-semibold",
        red && "text-red-600",
        green && "text-emerald-600",
        !red && !green && "text-slate-800"
      )}>
        {value}
      </span>
    </div>
  );
}
