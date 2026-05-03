"use client";

import { useState, useRef } from "react";
import { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "sonner";
import {
  Mail, Phone, Briefcase, Building2, User, Upload,
  CheckCircle2, Circle, Printer, Send, FileText,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { calculateCTC, type CTCBreakdown } from "@/lib/ctc-calculator";
import CTCCalculator from "@/components/employees/CTCCalculator";

/* ── Types ────────────────────────────────────────────── */
interface Props {
  candidate: any;
  jobs: any[];
  canManage: boolean;
  onUpdate: () => void;
}

/* ── Constants ────────────────────────────────────────── */
const STAGES = ["applied", "screening", "interview", "offer", "hired", "rejected"] as const;
type Stage = typeof STAGES[number];

const STAGE_COLORS: Record<string, string> = {
  applied:   "bg-blue-600 text-white",
  screening: "bg-amber-500 text-white",
  interview: "bg-violet-600 text-white",
  offer:     "bg-emerald-600 text-white",
  hired:     "bg-teal-600 text-white",
  rejected:  "bg-red-600 text-white",
};

const STAGE_INACTIVE: Record<string, string> = {
  applied:   "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100",
  screening: "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100",
  interview: "bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100",
  offer:     "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100",
  hired:     "bg-teal-50 text-teal-600 border border-teal-200 hover:bg-teal-100",
  rejected:  "bg-red-50 text-red-500 border border-red-200 hover:bg-red-100",
};

const DOC_TYPES = [
  "Resume",
  "Aadhar Card",
  "PAN Card",
  "Degree Certificate",
  "Experience Letter",
  "Photo",
  "Other",
];

const REQUIRED_DOCS = ["Resume", "Aadhar Card", "PAN Card", "Degree Certificate"];

/* ══════════════════════════════════════════════════════════
   CANDIDATE DETAIL
══════════════════════════════════════════════════════════ */
export default function CandidateDetail({ candidate: initialCandidate, jobs, canManage, onUpdate }: Props) {
  const [candidate, setCandidate] = useState(initialCandidate);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(candidate.interviewNotes || "");
  const [rejectionReason, setRejectionReason] = useState(candidate.rejectionReason || "");

  const patchCandidate = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/hiring/candidates/${candidate._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
        return false;
      }
      setCandidate((prev: any) => ({ ...prev, ...payload, ...data }));
      mutate("/api/hiring/candidates");
      onUpdate();
      return true;
    } finally {
      setSaving(false);
    }
  };

  const handleStageChange = async (stage: Stage) => {
    if (!canManage) return;
    const ok = await patchCandidate({ stage });
    if (ok) toast.success(`Stage updated to ${stage}`);
  };

  const handleSaveNotes = async () => {
    const ok = await patchCandidate({ interviewNotes: notes });
    if (ok) toast.success("Notes saved");
  };

  const handleSaveRejection = async () => {
    const ok = await patchCandidate({ rejectionReason });
    if (ok) toast.success("Rejection reason saved");
  };

  const jobTitle = typeof candidate.jobPosting === "object"
    ? candidate.jobPosting?.title
    : jobs.find((j) => j._id === candidate.jobPosting)?.title;

  const jobDepartment = typeof candidate.jobPosting === "object"
    ? candidate.jobPosting?.department?.name
    : undefined;

  return (
    <div className="space-y-4">
      <DialogTitle className="sr-only">Candidate Details</DialogTitle>

      {/* Header */}
      <div className="flex items-start gap-4 pb-1">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
          <User className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-900 leading-tight">
            {candidate.firstName} {candidate.lastName}
          </h2>
          {jobTitle && (
            <p className="text-sm text-slate-500 mt-0.5">Applying for: {jobTitle}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs capitalize",
                STAGE_INACTIVE[candidate.stage] || "bg-slate-50 text-slate-600 border-slate-200"
              )}
            >
              {candidate.stage || "applied"}
            </Badge>
            {candidate.source && (
              <Badge variant="outline" className="text-xs bg-slate-50 text-slate-500 border-slate-200 capitalize">
                {candidate.source}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-3 w-full bg-slate-100">
          <TabsTrigger value="overview" className="gap-1.5 data-active:bg-blue-600 data-active:text-white data-active:shadow-md">
            <User className="w-3.5 h-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="offer" className="gap-1.5 data-active:bg-blue-600 data-active:text-white data-active:shadow-md">
            <FileText className="w-3.5 h-3.5" />
            Offer Letter
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5 data-active:bg-blue-600 data-active:text-white data-active:shadow-md">
            <Upload className="w-3.5 h-3.5" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="mt-4 space-y-5">
          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {candidate.email && (
              <InfoItem icon={<Mail className="w-4 h-4" />} label="Email" value={candidate.email} />
            )}
            {candidate.phone && (
              <InfoItem icon={<Phone className="w-4 h-4" />} label="Phone" value={candidate.phone} />
            )}
            {candidate.currentCompany && (
              <InfoItem icon={<Building2 className="w-4 h-4" />} label="Current Company" value={candidate.currentCompany} />
            )}
            {candidate.currentDesignation && (
              <InfoItem icon={<Briefcase className="w-4 h-4" />} label="Current Role" value={candidate.currentDesignation} />
            )}
            {candidate.totalExperience != null && (
              <InfoItem
                icon={<Briefcase className="w-4 h-4" />}
                label="Experience"
                value={`${candidate.totalExperience} year${candidate.totalExperience !== 1 ? "s" : ""}`}
              />
            )}
          </div>

          {/* Skills */}
          {Array.isArray(candidate.skills) && candidate.skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((skill: string) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Stage selector */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Stage
              {!canManage && <span className="ml-1.5 text-slate-400 normal-case font-normal">(read only)</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((stage) => {
                const isActive = candidate.stage === stage;
                return (
                  <button
                    key={stage}
                    type="button"
                    disabled={!canManage || saving}
                    onClick={() => handleStageChange(stage)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold transition-all capitalize",
                      isActive
                        ? STAGE_COLORS[stage]
                        : STAGE_INACTIVE[stage],
                      !canManage && "cursor-not-allowed opacity-70"
                    )}
                  >
                    {stage}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rejection reason */}
          {candidate.stage === "rejected" && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
                placeholder="Reason for rejection…"
                disabled={!canManage}
              />
              {canManage && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveRejection}
                  disabled={saving}
                  className="border-slate-200"
                >
                  Save Reason
                </Button>
              )}
            </div>
          )}

          {/* Interview notes */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Interview Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add interview notes, observations…"
              disabled={!canManage}
            />
            {canManage && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleSaveNotes}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Notes"}
              </Button>
            )}
          </div>
        </TabsContent>

        {/* ── Offer Letter Tab ── */}
        <TabsContent value="offer" className="mt-4">
          <OfferLetterTab
            candidate={candidate}
            jobs={jobs}
            jobTitle={jobTitle}
            jobDepartment={jobDepartment}
            canManage={canManage}
            onSaveOffer={async (offer) => {
              const ok = await patchCandidate({ offer });
              if (ok) toast.success("Offer saved");
              return ok;
            }}
          />
        </TabsContent>

        {/* ── Documents Tab ── */}
        <TabsContent value="documents" className="mt-4">
          <DocumentsTab
            candidate={candidate}
            canManage={canManage}
            onUpdate={async () => {
              const res = await fetch(`/api/hiring/candidates/${candidate._id}`);
              if (res.ok) {
                const data = await res.json();
                setCandidate(data);
              }
              mutate("/api/hiring/candidates");
              onUpdate();
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Offer Letter Tab ──────────────────────────────────── */
function OfferLetterTab({
  candidate, jobs, jobTitle, jobDepartment, canManage, onSaveOffer,
}: {
  candidate: any;
  jobs: any[];
  jobTitle?: string;
  jobDepartment?: string;
  canManage: boolean;
  onSaveOffer: (offer: Record<string, unknown>) => Promise<boolean>;
}) {
  const existingOffer = candidate.offer;
  const [showForm, setShowForm] = useState(!existingOffer);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCTC, setShowCTC] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    designation:  existingOffer?.designation || (typeof candidate.jobPosting === "object" ? candidate.jobPosting?.title : jobTitle) || "",
    joiningDate:  existingOffer?.joiningDate ? existingOffer.joiningDate.slice(0, 10) : "",
    ctcAnnual:    existingOffer?.ctcAnnual || "",
    isMetro:      existingOffer?.isMetro ?? true,
    expiryDate:   existingOffer?.expiryDate ? existingOffer.expiryDate.slice(0, 10) : "",
  });
  const [breakdown, setBreakdown] = useState<CTCBreakdown | null>(null);

  const set = (k: string, v: string | boolean | number) => setForm((f) => ({ ...f, [k]: v }));

  // Compute CTC breakdown for preview
  const getBreakdown = (): CTCBreakdown | null => {
    const ctc = Number(form.ctcAnnual);
    if (!ctc) return null;
    return calculateCTC(ctc, form.isMetro);
  };

  const handleGenerate = async () => {
    if (!form.designation || !form.joiningDate || !form.ctcAnnual) {
      toast.error("Fill in Designation, Joining Date, and CTC");
      return;
    }
    setSaving(true);
    const bd = getBreakdown();
    setBreakdown(bd);
    const offer = {
      designation:  form.designation,
      joiningDate:  form.joiningDate,
      ctcAnnual:    Number(form.ctcAnnual),
      isMetro:      form.isMetro,
      expiryDate:   form.expiryDate || undefined,
      status:       "generated",
      generatedAt:  new Date().toISOString(),
    };
    const ok = await onSaveOffer(offer);
    setSaving(false);
    if (ok) setShowPreview(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleMarkSent = async () => {
    setSaving(true);
    const ok = await onSaveOffer({ ...candidate.offer, status: "sent" });
    setSaving(false);
    if (ok) toast.success("Offer marked as sent");
  };

  const bd = breakdown || (existingOffer?.ctcAnnual ? calculateCTC(Number(existingOffer.ctcAnnual), existingOffer?.isMetro ?? true) : null);
  const displayOffer = existingOffer || null;

  return (
    <div className="space-y-4">
      {/* Existing offer summary */}
      {displayOffer && !showForm && (
        <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Current Offer</p>
            <Badge
              variant="outline"
              className={cn(
                "text-xs capitalize",
                displayOffer.status === "sent"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : displayOffer.status === "generated"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              )}
            >
              {displayOffer.status || "generated"}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-slate-400">Designation</p>
              <p className="font-medium text-slate-800">{displayOffer.designation}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">CTC Annual</p>
              <p className="font-medium text-slate-800">
                ₹{Number(displayOffer.ctcAnnual).toLocaleString()}
                {Number(displayOffer.ctcAnnual) >= 100000 && (
                  <span className="text-xs text-slate-500 ml-1">
                    ({(Number(displayOffer.ctcAnnual) / 100000).toFixed(1)} LPA)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Joining Date</p>
              <p className="font-medium text-slate-800">
                {displayOffer.joiningDate ? formatDate(displayOffer.joiningDate) : "—"}
              </p>
            </div>
            {displayOffer.expiryDate && (
              <div>
                <p className="text-xs text-slate-400">Offer Expiry</p>
                <p className="font-medium text-slate-800">{formatDate(displayOffer.expiryDate)}</p>
              </div>
            )}
          </div>
          {canManage && (
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 gap-1.5"
                onClick={() => { setShowPreview(true); setBreakdown(bd); }}
              >
                <Printer className="w-3.5 h-3.5" />
                View / Print
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-200 gap-1.5"
                onClick={() => setShowForm(true)}
              >
                Edit Offer
              </Button>
              {displayOffer.status !== "sent" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1.5"
                  onClick={handleMarkSent}
                  disabled={saving}
                >
                  <Send className="w-3.5 h-3.5" />
                  Mark Sent
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Offer form */}
      {(showForm || !displayOffer) && canManage && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-700">
            {displayOffer ? "Update Offer Details" : "Generate Offer Letter"}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Designation *</Label>
              <Input
                value={form.designation}
                onChange={(e) => set("designation", e.target.value)}
                required
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Joining Date *</Label>
              <Input
                type="date"
                value={form.joiningDate}
                onChange={(e) => set("joiningDate", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CTC Annual (₹) *</Label>
              <Input
                type="number"
                min={0}
                value={form.ctcAnnual}
                onChange={(e) => set("ctcAnnual", e.target.value)}
                placeholder="e.g. 800000"
              />
              {form.ctcAnnual && Number(form.ctcAnnual) > 0 && (
                <p className="text-xs text-slate-400">
                  {(Number(form.ctcAnnual) / 100000).toFixed(2)} LPA
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Offer Expiry Date</Label>
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) => set("expiryDate", e.target.value)}
              />
            </div>
          </div>

          {/* Metro toggle */}
          <div className="space-y-1.5">
            <Label>City Type (for HRA calculation)</Label>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm w-fit">
              <button
                type="button"
                onClick={() => set("isMetro", true)}
                className={cn(
                  "px-4 py-2 font-semibold transition-colors",
                  form.isMetro ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                )}
              >
                Metro
              </button>
              <button
                type="button"
                onClick={() => set("isMetro", false)}
                className={cn(
                  "px-4 py-2 font-semibold transition-colors",
                  !form.isMetro ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                )}
              >
                Non-Metro
              </button>
            </div>
          </div>

          {/* CTC Calculator */}
          <button
            type="button"
            onClick={() => setShowCTC((v) => !v)}
            className="text-xs text-blue-600 hover:underline"
          >
            {showCTC ? "Hide CTC Calculator" : "Use CTC Calculator to auto-fill"}
          </button>
          {showCTC && (
            <CTCCalculator
              initialCTC={Number(form.ctcAnnual) || 0}
              onApply={(s) => {
                const annualCTC = Math.round((s.basic + s.hra + s.allowances) * 12 / (1 - 0.0672));
                set("ctcAnnual", String(annualCTC));
                setShowCTC(false);
              }}
            />
          )}

          <div className="flex gap-3 pt-1">
            <Button
              onClick={handleGenerate}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? "Saving…" : "Generate Offer Letter"}
            </Button>
            {displayOffer && (
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="border-slate-200"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Offer Letter Preview */}
      {showPreview && bd && (
        <OfferLetterPreview
          candidate={candidate}
          offer={displayOffer || { designation: form.designation, joiningDate: form.joiningDate, expiryDate: form.expiryDate }}
          jobTitle={jobTitle}
          jobDepartment={jobDepartment}
          breakdown={bd}
          printRef={printRef}
          onPrint={handlePrint}
          onMarkSent={handleMarkSent}
          onClose={() => setShowPreview(false)}
          saving={saving}
          alreadySent={displayOffer?.status === "sent"}
        />
      )}
    </div>
  );
}

/* ── Offer Letter Preview ──────────────────────────────── */
function OfferLetterPreview({
  candidate, offer, jobTitle, jobDepartment, breakdown, printRef,
  onPrint, onMarkSent, onClose, saving, alreadySent,
}: {
  candidate: any;
  offer: any;
  jobTitle?: string;
  jobDepartment?: string;
  breakdown: CTCBreakdown;
  printRef: React.RefObject<HTMLDivElement>;
  onPrint: () => void;
  onMarkSent: () => void;
  onClose: () => void;
  saving: boolean;
  alreadySent: boolean;
}) {
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={onClose} className="border-slate-200">
          Back to Form
        </Button>
        <Button size="sm" variant="outline" onClick={onPrint} className="border-slate-200 gap-1.5">
          <Printer className="w-3.5 h-3.5" />
          Print
        </Button>
        {!alreadySent && (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            onClick={onMarkSent}
            disabled={saving}
          >
            <Send className="w-3.5 h-3.5" />
            Mark as Sent
          </Button>
        )}
      </div>

      {/* Letter */}
      <div
        ref={printRef}
        className="border border-slate-200 rounded-xl p-6 bg-white space-y-4 text-sm print:border-0 print:rounded-none print:shadow-none"
        id="offer-letter-print"
      >
        {/* Letterhead */}
        <div className="text-center border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold text-blue-700">Gehnax Technologies LLP</h1>
          <p className="text-slate-500 text-xs mt-1">Human Resources Department</p>
        </div>

        {/* Meta */}
        <div className="flex justify-between text-xs text-slate-500">
          <span>Date: {today}</span>
          <span>Ref: GTL/HR/{new Date().getFullYear()}/{candidate._id?.slice(-6).toUpperCase()}</span>
        </div>

        {/* Candidate address */}
        <div className="text-sm">
          <p className="font-semibold text-slate-900">{candidate.firstName} {candidate.lastName}</p>
          <p className="text-slate-500">{candidate.email}</p>
          {candidate.phone && <p className="text-slate-500">{candidate.phone}</p>}
        </div>

        {/* Subject */}
        <div>
          <p className="font-semibold text-slate-800 underline underline-offset-2">
            Subject: Offer of Employment
          </p>
        </div>

        {/* Body */}
        <div className="space-y-3 text-slate-700 leading-relaxed">
          <p>Dear {candidate.firstName},</p>
          <p>
            We are pleased to offer you the position of{" "}
            <strong>{offer.designation || jobTitle}</strong>
            {jobDepartment && (
              <> in the <strong>{jobDepartment}</strong> department</>
            )}{" "}
            at <strong>Gehnax Technologies LLP</strong>.
          </p>
          <p>
            This offer is based on your experience, qualifications, and the interviews conducted.
            We look forward to you joining our team.
          </p>
        </div>

        {/* CTC Table */}
        <div>
          <p className="font-semibold text-slate-800 mb-2">Compensation Structure (Annual)</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-600">Component</th>
                <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-600">Annual (₹)</th>
                <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-600">Monthly (₹)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Basic Salary", annual: breakdown.basicMonthly * 12, monthly: breakdown.basicMonthly },
                { label: `HRA (${offer.isMetro !== false ? "Metro 50%" : "Non-Metro 40%"})`, annual: breakdown.hraMonthly * 12, monthly: breakdown.hraMonthly },
                { label: "Special Allowance", annual: breakdown.specialAllowanceMonthly * 12, monthly: breakdown.specialAllowanceMonthly },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.label}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{fmt(row.annual)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{fmt(row.monthly)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="border border-slate-200 px-3 py-2 text-slate-800">Gross Salary</td>
                <td className="border border-slate-200 px-3 py-2 text-right text-slate-800">{fmt(breakdown.grossAnnual)}</td>
                <td className="border border-slate-200 px-3 py-2 text-right text-slate-800">{fmt(breakdown.grossMonthly)}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2 text-slate-600">Employer PF (12%)</td>
                <td className="border border-slate-200 px-3 py-2 text-right text-slate-600">{fmt(breakdown.employerPFAnnual)}</td>
                <td className="border border-slate-200 px-3 py-2 text-right text-slate-600">{fmt(breakdown.employerPFMonthly)}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2 text-slate-600">Gratuity (4.81%)</td>
                <td className="border border-slate-200 px-3 py-2 text-right text-slate-600">{fmt(breakdown.gratuityAnnual)}</td>
                <td className="border border-slate-200 px-3 py-2 text-right text-slate-600">{fmt(breakdown.gratuityMonthly)}</td>
              </tr>
              <tr className="bg-blue-50 font-bold">
                <td className="border border-slate-200 px-3 py-2 text-blue-800">Total CTC</td>
                <td className="border border-slate-200 px-3 py-2 text-right text-blue-800">{fmt(breakdown.ctcAnnual)}</td>
                <td className="border border-slate-200 px-3 py-2 text-right text-blue-800">{fmt(Math.round(breakdown.ctcAnnual / 12))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Joining / Expiry */}
        <div className="space-y-1 text-sm text-slate-700">
          {offer.joiningDate && (
            <p>
              <strong>Date of Joining:</strong>{" "}
              {formatDate(offer.joiningDate)}
            </p>
          )}
          {offer.expiryDate && (
            <p>
              <strong>Offer Valid Until:</strong>{" "}
              {formatDate(offer.expiryDate)}
            </p>
          )}
        </div>

        <p className="text-slate-600 text-sm">
          Please sign and return a copy of this letter as your acceptance of the offer.
          We look forward to welcoming you to our team.
        </p>

        {/* Signature */}
        <div className="pt-6 space-y-1">
          <p className="text-slate-700 font-semibold">Sincerely,</p>
          <div className="mt-8 border-t border-slate-300 pt-2 w-48">
            <p className="text-xs text-slate-600 font-semibold">HR Manager</p>
            <p className="text-xs text-slate-500">Gehnax Technologies LLP</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Documents Tab ─────────────────────────────────────── */
function DocumentsTab({
  candidate, canManage, onUpdate,
}: {
  candidate: any;
  canManage: boolean;
  onUpdate: () => void;
}) {
  const docs: any[] = Array.isArray(candidate.documents) ? candidate.documents : [];
  const [docType, setDocType] = useState("Resume");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadedDocTypes = docs.map((d: any) => d.docType);
  const missingDocs = REQUIRED_DOCS.filter((d) => !uploadedDocTypes.includes(d));

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error("Select a file"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("candidateId", candidate._id);
      fd.append("docType", docType);
      const res = await fetch("/api/hiring/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Upload failed");
      else {
        toast.success("Document uploaded");
        if (fileRef.current) fileRef.current.value = "";
        onUpdate();
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    const res = await fetch(`/api/hiring/candidates/${candidate._id}/documents/${docId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Document removed");
      onUpdate();
    } else {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-5">
      {/* Required docs checklist */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Required Documents</p>
        <div className="grid grid-cols-2 gap-2">
          {REQUIRED_DOCS.map((doc) => {
            const uploaded = uploadedDocTypes.includes(doc);
            return (
              <div
                key={doc}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium",
                  uploaded
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-slate-50 border-slate-200 text-slate-500"
                )}
              >
                {uploaded
                  ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  : <Circle className="w-4 h-4 flex-shrink-0 text-slate-300" />
                }
                {doc}
              </div>
            );
          })}
        </div>
        {missingDocs.length > 0 && (
          <p className="text-xs text-amber-600 mt-2">
            {missingDocs.length} required document{missingDocs.length !== 1 ? "s" : ""} missing
          </p>
        )}
      </div>

      {/* Existing documents */}
      {docs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Uploaded Documents</p>
          <div className="space-y-2">
            {docs.map((doc: any) => (
              <div
                key={doc._id || doc.filename}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{doc.docType}</p>
                  <p className="text-xs text-slate-400 truncate">{doc.filename}</p>
                  {doc.uploadedAt && (
                    <p className="text-xs text-slate-400">{formatDate(doc.uploadedAt)}</p>
                  )}
                </div>
                {doc.verified && (
                  <span title="Verified">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  </span>
                )}
                {canManage && (
                  <button
                    onClick={() => handleDelete(doc._id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete document"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload section */}
      {canManage && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Upload Document</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Document Type</Label>
              <NativeSelect value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label>File</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs file:border-0 file:bg-transparent file:text-xs file:font-medium text-slate-700"
              />
            </div>
          </div>
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700 gap-1.5"
            size="sm"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "Uploading…" : "Upload Document"}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── InfoItem ──────────────────────────────────────────── */
function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
      <div className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}
