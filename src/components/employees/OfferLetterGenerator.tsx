"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ScrollText, Download, Copy, Loader2, Plus, CheckCircle2,
  AlertTriangle, ExternalLink, RotateCcw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  employeeId: string;
  employeeName: string;
  designation: string;
  department?: string;
  salary?: { basic: number; hra: number; allowances: number; deductions: number };
  canGenerate: boolean;
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function OfferLetterGenerator({
  employeeId, employeeName, designation, department, salary, canGenerate,
}: Props) {
  const { data, isLoading, mutate } = useSWR(
    `/api/employees/${employeeId}/offer-letter`,
    fetcher
  );

  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const offerLetters: any[] = data?.offerLetters || [];
  const grossMonthly = (salary?.basic || 0) + (salary?.hra || 0) + (salary?.allowances || 0);
  const netMonthly   = grossMonthly - (salary?.deductions || 0);
  const grossAnnual  = grossMonthly * 12;
  const empPF        = Math.round((salary?.basic || 0) * 0.12);
  const empPFAnnual  = empPF * 12;
  const gratuity     = Math.round((salary?.basic || 0) * 0.0481);
  const gratuityAnnual = gratuity * 12;
  const annualCTC    = Math.round(grossAnnual + empPFAnnual + gratuityAnnual);

  const handleGenerate = async () => {
    setGenerating(true);
    setShowConfirm(false);
    try {
      const res = await fetch(`/api/employees/${employeeId}/offer-letter`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Generation failed"); return; }
      toast.success("Offer letter generated successfully");
      mutate();
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (olId: string) => {
    if (!confirm("Revoke this offer letter? It will be marked as invalid for verification.")) return;
    setRevoking(olId);
    try {
      const res = await fetch(`/api/employees/${employeeId}/offer-letter`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ olId, action: "revoke" }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Revoke failed"); return; }
      toast.success("Offer letter revoked");
      mutate();
    } finally {
      setRevoking(null);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success("Verification link copied"));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://myapp.gehnax.com";

  return (
    <div className="space-y-4">
      {/* Header row */}
      {canGenerate && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {offerLetters.length === 0
              ? "No offer letters generated yet"
              : `${offerLetters.length} offer letter${offerLetters.length > 1 ? "s" : ""} generated`}
          </p>
          <Button
            size="sm"
            onClick={() => setShowConfirm(true)}
            disabled={generating}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {generating ? "Generating…" : "Generate Offer Letter"}
          </Button>
        </div>
      )}

      {/* Empty state */}
      {offerLetters.length === 0 && (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <ScrollText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">No offer letters generated yet</p>
          {canGenerate && (
            <p className="text-xs text-slate-400 mt-1">
              Click "Generate Offer Letter" to create one
            </p>
          )}
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {offerLetters.map((ol: any) => {
          const verifyUrl = `${baseUrl}/verify-offer/${ol.verificationToken}`;
          return (
            <div
              key={ol._id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              {/* Top bar */}
              <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-100">
                <ScrollText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {ol.refNumber || "Offer Letter"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generated {fmtDate(ol.generatedAt)}
                  </p>
                </div>
                {ol.isActive ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-xs" variant="outline">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </Badge>
                ) : (
                  <Badge className="bg-red-50 text-red-600 border-red-200 gap-1 text-xs" variant="outline">
                    <AlertTriangle className="w-3 h-3" /> Revoked
                  </Badge>
                )}
              </div>

              {/* Salary summary */}
              <div className="px-4 py-3 grid grid-cols-3 gap-2 bg-slate-50/50 border-b border-slate-100">
                <div>
                  <p className="text-xs text-slate-400">Gross Monthly</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {formatCurrency(ol.salary?.grossMonthly || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Net Monthly</p>
                  <p className="text-sm font-semibold text-emerald-700">
                    {formatCurrency(ol.salary?.netMonthly || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Annual CTC</p>
                  <p className="text-sm font-semibold text-blue-700">
                    {formatCurrency(ol.salary?.annualCTC || 0)}
                  </p>
                </div>
              </div>

              {/* Verification link */}
              <div className="px-4 py-2.5 flex items-center gap-2 border-b border-slate-100 bg-blue-50/40">
                <ExternalLink className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <p className="text-xs text-blue-700 truncate flex-1 font-mono">{verifyUrl}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyLink(verifyUrl)}
                  className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 flex-shrink-0"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>

              {/* Actions */}
              <div className="px-4 py-2.5 flex items-center gap-2">
                <a href={ol.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5 border-slate-200 h-8 text-xs"
                  >
                    <Download className="w-3 h-3" />
                    Download PDF
                  </Button>
                </a>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyLink(verifyUrl)}
                  className="flex-1 gap-1.5 h-8 text-xs text-blue-600 hover:bg-blue-50"
                >
                  <Copy className="w-3 h-3" />
                  Copy Verify Link
                </Button>
                {canGenerate && ol.isActive && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevoke(ol._id)}
                    disabled={revoking === ol._id}
                    className="h-8 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    {revoking === ol._id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-blue-600" />
              Generate Offer Letter
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              A PDF offer letter will be generated for <strong>{employeeName}</strong> with the following details:
            </p>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <Row label="Employee" value={employeeName} />
              <Row label="Designation" value={designation} />
              <Row label="Department" value={department || "—"} />
              <Row label="Gross Monthly" value={formatCurrency(grossMonthly)} />
              <Row label="Net Monthly" value={formatCurrency(netMonthly)} />
              <Row label="Annual CTC" value={formatCurrency(annualCTC)} />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 space-y-1">
              <p className="font-semibold">Terms included in the offer letter:</p>
              <ul className="space-y-0.5 text-blue-700">
                <li>• 24 annual paid leaves (non-carry-forward)</li>
                <li>• PF reflected quarterly</li>
                <li>• Medical insurance ₹3,00,000 / Accidental ₹20,00,000</li>
                <li>• Working days: Monday to Saturday</li>
                <li>• Notice period: 30 days</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScrollText className="w-4 h-4" />}
                {generating ? "Generating…" : "Generate & Upload"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                className="flex-1 border-slate-200"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}
