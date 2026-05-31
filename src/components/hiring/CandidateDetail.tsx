"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "sonner";
import {
  Mail, Phone, Briefcase, Building2, User, Upload,
  CheckCircle2, Circle, Printer, Send, FileText, Download, X,
  Calendar, UserPlus, Sparkles, ChevronDown, ChevronUp, Copy, ChevronLeft,
  BadgeCheck, Clock, AlertCircle,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { calculateCTC, type CTCBreakdown } from "@/lib/ctc-calculator";
import CTCCalculator from "@/components/employees/CTCCalculator";
import InterviewsTab from "./InterviewsTab";

/* ── Types ── */
interface Props {
  candidate: any;
  jobs: any[];
  canManage: boolean;
  onUpdate?: () => void;
}

/* ── Constants ── */
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

const DOC_TYPES = ["Resume","Aadhar Card","PAN Card","Degree Certificate","Experience Letter","Photo","Other"];
const REQUIRED_DOCS = ["Resume", "Aadhar Card", "PAN Card", "Degree Certificate"];

const fetcher = (url: string) => fetch(url).then(r => r.json());

/* ══════════════════════════════════════════════════════════ */
export default function CandidateDetail({ candidate: initialCandidate, jobs, canManage, onUpdate = () => {} }: Props) {
  const router = useRouter();
  const [candidate, setCandidate] = useState(initialCandidate);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(candidate.interviewNotes || "");
  const [rejectionReason, setRejectionReason] = useState(candidate.rejectionReason || "");
  const [resumeUploading, setResumeUploading] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const resumeFileRef = useRef<HTMLInputElement>(null);

  const { data: departments } = useSWR(canManage ? "/api/departments" : null, fetcher);
  const { data: empList } = useSWR(canManage ? "/api/employees?limit=200" : null, fetcher);
  const deptList: any[] = Array.isArray(departments) ? departments : [];
  const allEmployees: any[] = empList?.employees || [];

  const handleResumeUpload = async () => {
    const file = resumeFileRef.current?.files?.[0];
    if (!file) { toast.error("Select a PDF or Word file"); return; }
    setResumeUploading(true);
    try {
      const fd = new FormData();
      fd.append("resume", file);
      const res = await fetch(`/api/hiring/candidates/${candidate._id}/resume`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Upload failed"); return; }
      setCandidate((prev: any) => ({ ...prev, resumeUrl: data.resumeUrl }));
      mutate("/api/hiring/candidates");
      onUpdate();
      toast.success("Resume uploaded");
      if (resumeFileRef.current) resumeFileRef.current.value = "";
    } finally { setResumeUploading(false); }
  };

  const patchCandidate = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/hiring/candidates/${candidate._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to save"); return false; }
      setCandidate((prev: any) => ({ ...prev, ...payload, ...data }));
      mutate("/api/hiring/candidates");
      onUpdate();
      return true;
    } finally { setSaving(false); }
  };

  const handleStageChange = async (stage: Stage) => {
    if (!canManage) return;
    const ok = await patchCandidate({ stage });
    if (ok) toast.success(`Stage updated to ${stage}`);
  };

  const refreshCandidate = async () => {
    const res = await fetch(`/api/hiring/candidates/${candidate._id}`);
    if (res.ok) { const data = await res.json(); setCandidate(data); }
    mutate("/api/hiring/candidates");
    onUpdate();
  };

  const jobTitle = typeof candidate.jobPosting === "object"
    ? candidate.jobPosting?.title
    : jobs.find((j) => j._id === candidate.jobPosting)?.title;

  const jobDepartment = typeof candidate.jobPosting === "object"
    ? candidate.jobPosting?.department?.name : undefined;

  const jobDepartmentId = typeof candidate.jobPosting === "object"
    ? candidate.jobPosting?.department?._id || candidate.jobPosting?.department : undefined;

  return (
    <div className="space-y-4">
      {/* Back navigation */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors -ml-0.5 mb-1 print:hidden"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Hiring
      </button>

      {/* Header */}
      <div className="flex items-start gap-4 pb-1 print:hidden">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
          <User className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-900">{candidate.firstName} {candidate.lastName}</h2>
          {jobTitle && <p className="text-sm text-slate-500 mt-0.5">Applying for: {jobTitle}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className={cn("text-xs capitalize", STAGE_INACTIVE[candidate.stage] || "")}>
              {candidate.stage || "applied"}
            </Badge>
            {candidate.source && (
              <Badge variant="outline" className="text-xs bg-slate-50 text-slate-500 border-slate-200 capitalize">
                {candidate.source}
              </Badge>
            )}
            {candidate.convertedEmployeeId && (
              <Badge variant="outline" className="text-xs bg-teal-50 text-teal-700 border-teal-200">
                Employee Created
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Separator className="print:hidden" />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-4 w-full bg-slate-100 print:hidden">
          <TabsTrigger value="overview" className="gap-1 text-xs data-active:bg-blue-600 data-active:text-white data-active:shadow-md">
            <User className="w-3.5 h-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="interviews" className="gap-1 text-xs data-active:bg-blue-600 data-active:text-white data-active:shadow-md">
            <Calendar className="w-3.5 h-3.5" />
            Interviews
          </TabsTrigger>
          <TabsTrigger value="offer" className="gap-1 text-xs data-active:bg-blue-600 data-active:text-white data-active:shadow-md">
            <FileText className="w-3.5 h-3.5" />
            Offer
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1 text-xs data-active:bg-blue-600 data-active:text-white data-active:shadow-md">
            <Upload className="w-3.5 h-3.5" />
            Docs
          </TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="mt-4 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {candidate.email && <InfoItem icon={<Mail className="w-4 h-4" />} label="Email" value={candidate.email} />}
            {candidate.phone && <InfoItem icon={<Phone className="w-4 h-4" />} label="Phone" value={candidate.phone} />}
            {candidate.currentCompany && <InfoItem icon={<Building2 className="w-4 h-4" />} label="Current Company" value={candidate.currentCompany} />}
            {candidate.currentDesignation && <InfoItem icon={<Briefcase className="w-4 h-4" />} label="Current Role" value={candidate.currentDesignation} />}
            {candidate.totalExperience != null && (
              <InfoItem icon={<Briefcase className="w-4 h-4" />} label="Experience" value={`${candidate.totalExperience} yr${candidate.totalExperience !== 1 ? "s" : ""}`} />
            )}
          </div>

          {Array.isArray(candidate.skills) && candidate.skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((skill: string) => (
                  <Badge key={skill} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">{skill}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Resume */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resume</p>
            {candidate.resumeUrl ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-800">Resume uploaded</p>
                  <p className="text-xs text-emerald-600 truncate">{candidate.resumeUrl.split("/").pop()}</p>
                </div>
                <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors">
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <FileText className="w-4 h-4 text-slate-400" />
                <p className="text-sm text-slate-500">No resume uploaded yet</p>
              </div>
            )}
            {canManage && (
              <div className="flex items-center gap-2 pt-1">
                <input ref={resumeFileRef} type="file" accept=".pdf,.doc,.docx"
                  className="flex-1 text-xs text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:text-xs file:font-medium hover:file:bg-blue-100" />
                <Button size="sm" onClick={handleResumeUpload} disabled={resumeUploading}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 flex-shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  {resumeUploading ? "Uploading…" : candidate.resumeUrl ? "Replace" : "Upload"}
                </Button>
              </div>
            )}
          </div>

          {/* Stage */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Pipeline Stage
              {!canManage && <span className="ml-1.5 text-slate-400 normal-case font-normal">(read only)</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((stage) => {
                const isActive = candidate.stage === stage;
                return (
                  <button key={stage} type="button"
                    disabled={!canManage || saving}
                    onClick={() => handleStageChange(stage)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold transition-all capitalize",
                      isActive ? STAGE_COLORS[stage] : STAGE_INACTIVE[stage],
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
              <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                rows={2} placeholder="Reason for rejection…" disabled={!canManage} />
              {canManage && (
                <Button size="sm" variant="outline" onClick={async () => {
                  const ok = await patchCandidate({ rejectionReason });
                  if (ok) toast.success("Reason saved");
                }} disabled={saving} className="border-slate-200">
                  Save Reason
                </Button>
              )}
            </div>
          )}

          {/* Interview notes */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">General Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={3} placeholder="Add notes, observations…" disabled={!canManage} />
            {canManage && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={async () => { const ok = await patchCandidate({ interviewNotes: notes }); if (ok) toast.success("Notes saved"); }}
                disabled={saving}>
                {saving ? "Saving…" : "Save Notes"}
              </Button>
            )}
          </div>

          {/* Convert to Employee */}
          {canManage && candidate.stage === "hired" && !candidate.convertedEmployeeId && (
            <div className="border border-teal-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowConvert(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-teal-50 text-teal-700 text-sm font-semibold"
              >
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Convert to Employee
                </span>
                {showConvert ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showConvert && (
                <ConvertToEmployee
                  candidate={candidate}
                  deptList={deptList}
                  allEmployees={allEmployees}
                  jobDepartmentId={jobDepartmentId}
                  jobTitle={jobTitle}
                  onConverted={refreshCandidate}
                />
              )}
            </div>
          )}

          {candidate.convertedEmployeeId && (
            <div className="flex items-center gap-2 p-3 bg-teal-50 rounded-xl border border-teal-200 text-sm text-teal-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              This candidate has been converted to an employee.
            </div>
          )}
        </TabsContent>

        {/* ── Interviews Tab ── */}
        <TabsContent value="interviews" className="mt-4">
          <InterviewsTab
            candidateId={candidate._id}
            interviews={candidate.interviews || []}
            canManage={canManage}
            onUpdate={refreshCandidate}
          />
        </TabsContent>

        {/* ── Offer Tab ── */}
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
              await refreshCandidate();
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Convert to Employee ── */
function ConvertToEmployee({
  candidate, deptList, allEmployees, jobDepartmentId, jobTitle, onConverted,
}: {
  candidate: any;
  deptList: any[];
  allEmployees: any[];
  jobDepartmentId?: string;
  jobTitle?: string;
  onConverted: () => void;
}) {
  const offer = candidate.offer;
  const ctcBD = offer?.ctcAnnual ? calculateCTC(Number(offer.ctcAnnual), offer.isMetro ?? true) : null;

  const suggestCode = () => {
    const prefix = (candidate.firstName?.[0] || "E") + (candidate.lastName?.[0] || "X");
    return `${prefix.toUpperCase()}${String(Date.now()).slice(-4)}`;
  };

  const [form, setForm] = useState({
    employeeCode:   suggestCode(),
    designation:    offer?.designation || jobTitle || "",
    department:     jobDepartmentId || "",
    joiningDate:    offer?.joiningDate ? offer.joiningDate.slice(0, 10) : "",
    employmentType: "full_time",
    reportingManager: "",
    basic:       ctcBD ? ctcBD.basicMonthly : 0,
    hra:         ctcBD ? ctcBD.hraMonthly : 0,
    allowances:  ctcBD ? ctcBD.otherAllowancesMonthly : 0,
    deductions:  ctcBD ? Math.round(ctcBD.basicMonthly * 0.12) : 0,
  });
  const [converting, setConverting] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const handleConvert = async () => {
    if (!form.employeeCode || !form.department || !form.designation || !form.joiningDate) {
      toast.error("Fill in Employee Code, Department, Designation and Joining Date");
      return;
    }
    setConverting(true);
    try {
      const res = await fetch(`/api/hiring/candidates/${candidate._id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeCode: form.employeeCode.trim().toUpperCase(),
          department: form.department,
          designation: form.designation,
          joiningDate: form.joiningDate,
          employmentType: form.employmentType,
          reportingManager: form.reportingManager || undefined,
          salary: { basic: form.basic, hra: form.hra, allowances: form.allowances, deductions: form.deductions },
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Conversion failed"); return; }
      toast.success("Employee created successfully!");
      setCredentials(data.credentials);
      onConverted();
    } finally {
      setConverting(false);
    }
  };

  if (credentials) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-emerald-700 font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          Employee account created!
        </div>
        <div className="bg-slate-900 rounded-lg p-3 text-sm font-mono space-y-1">
          <p className="text-slate-400 text-xs mb-2">Login Credentials</p>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Email:</span>
            <span className="text-white">{credentials.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Password:</span>
            <span className="text-emerald-400 font-bold">{credentials.password}</span>
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 border-slate-200"
          onClick={() => { navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`); toast.success("Copied to clipboard"); }}>
          <Copy className="w-3.5 h-3.5" />
          Copy Credentials
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Employee Code *</Label>
          <Input value={form.employeeCode} onChange={e => set("employeeCode", e.target.value)} className="h-8 text-sm uppercase" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Designation *</Label>
          <Input value={form.designation} onChange={e => set("designation", e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Department *</Label>
          <NativeSelect value={form.department} onChange={e => set("department", e.target.value)} className="h-8 text-sm">
            <option value="">Select department</option>
            {deptList.map((d: any) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Joining Date *</Label>
          <Input type="date" value={form.joiningDate} onChange={e => set("joiningDate", e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Employment Type</Label>
          <NativeSelect value={form.employmentType} onChange={e => set("employmentType", e.target.value)} className="h-8 text-sm">
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Reporting Manager</Label>
          <NativeSelect value={form.reportingManager} onChange={e => set("reportingManager", e.target.value)} className="h-8 text-sm">
            <option value="">None</option>
            {allEmployees.map((e: any) => (
              <option key={e._id} value={e._id}>{e.firstName} {e.lastName} — {e.designation}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Monthly Salary (₹)</p>
        <div className="grid grid-cols-4 gap-2">
          {(["basic", "hra", "allowances", "deductions"] as const).map((field) => (
            <div key={field} className="space-y-1">
              <Label className="text-xs capitalize">{field === "hra" ? "HRA" : field}</Label>
              <Input type="number" min={0} value={(form as any)[field] || ""} onChange={e => set(field, parseInt(e.target.value) || 0)} className="h-8 text-sm" />
            </div>
          ))}
        </div>
        {(form.basic + form.hra + form.allowances) > 0 && (
          <p className="text-xs text-slate-400 mt-1.5">
            Net pay: ₹{(form.basic + form.hra + form.allowances - form.deductions).toLocaleString()}/mo
          </p>
        )}
      </div>

      <Button onClick={handleConvert} disabled={converting} className="bg-teal-600 hover:bg-teal-700 gap-1.5">
        {converting ? "Creating Employee…" : <><UserPlus className="w-4 h-4" />Create Employee Account</>}
      </Button>
    </div>
  );
}

/* ── Offer Letter Tab ── */
function OfferLetterTab({
  candidate, jobs, jobTitle, jobDepartment, canManage, onSaveOffer,
}: {
  candidate: any; jobs: any[]; jobTitle?: string; jobDepartment?: string;
  canManage: boolean; onSaveOffer: (offer: Record<string, unknown>) => Promise<boolean>;
}) {
  const existingOffer = candidate.offer;
  const [showForm, setShowForm]     = useState(!existingOffer);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [showCTC, setShowCTC]       = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const autoOfferNum = `GTL/HR/${new Date().getFullYear()}/${candidate._id?.slice(-6).toUpperCase()}`;

  const [form, setForm] = useState({
    designation:      existingOffer?.designation || (typeof candidate.jobPosting === "object" ? candidate.jobPosting?.title : jobTitle) || "",
    joiningDate:      existingOffer?.joiningDate ? existingOffer.joiningDate.slice(0, 10) : "",
    ctcAnnual:        existingOffer?.ctcAnnual || "",
    expiryDate:       existingOffer?.expiryDate ? existingOffer.expiryDate.slice(0, 10) : "",
    location:         existingOffer?.location || "",
    department:       existingOffer?.department || jobDepartment || "",
    reportingManager: existingOffer?.reportingManager || "",
    offerNumber:      existingOffer?.offerNumber || autoOfferNum,
    isMetro:          existingOffer?.isMetro ?? true,
  });
  const [breakdown, setBreakdown] = useState<CTCBreakdown | null>(null);

  const set = (k: string, v: string | boolean | number) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmitForApproval = async () => {
    setSubmittingApproval(true);
    try {
      const res = await fetch(`/api/hiring/candidates/${candidate._id}/offer/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to submit offer"); return; }
      toast.success("Offer submitted for Super Admin approval");
      mutate(`/api/hiring/candidates/${candidate._id}`);
    } finally { setSubmittingApproval(false); }
  };

  const getBreakdown = (): CTCBreakdown | null => {
    const ctc = Number(form.ctcAnnual);
    return ctc ? calculateCTC(ctc, form.isMetro) : null;
  };

  const handleGenerate = async () => {
    if (!form.designation || !form.joiningDate || !form.ctcAnnual) {
      toast.error("Designation, Joining Date, and CTC are required");
      return;
    }
    setSaving(true);
    const bd = getBreakdown();
    setBreakdown(bd);
    const offer = {
      designation: form.designation, joiningDate: form.joiningDate,
      ctcAnnual: Number(form.ctcAnnual), expiryDate: form.expiryDate || undefined,
      location: form.location || undefined, department: form.department || undefined,
      reportingManager: form.reportingManager || undefined, offerNumber: form.offerNumber || autoOfferNum,
      isMetro: form.isMetro, status: "draft", generatedAt: new Date().toISOString(),
    };
    const ok = await onSaveOffer(offer);
    setSaving(false);
    if (ok) setShowPreview(true);
  };

  const handleMarkSent = async () => {
    setSaving(true);
    const ok = await onSaveOffer({ ...candidate.offer, status: "sent", sentAt: new Date().toISOString() });
    setSaving(false);
    if (ok) toast.success("Offer marked as sent");
  };

  const handleMarkAccepted = async () => {
    setSaving(true);
    const ok = await onSaveOffer({ ...candidate.offer, status: "accepted", acceptedAt: new Date().toISOString() });
    setSaving(false);
    if (ok) toast.success("Offer accepted!");
  };

  const handleMarkDeclined = async () => {
    setSaving(true);
    const ok = await onSaveOffer({ ...candidate.offer, status: "declined", declinedAt: new Date().toISOString() });
    setSaving(false);
    if (ok) toast.success("Offer declined");
  };

  const displayOffer = existingOffer || null;
  const bd = breakdown || (displayOffer?.ctcAnnual ? calculateCTC(Number(displayOffer.ctcAnnual), displayOffer?.isMetro ?? true) : null);

  const offerStatusStyle: Record<string, string> = {
    draft:    "bg-slate-50 text-slate-600 border-slate-200",
    sent:     "bg-blue-50 text-blue-700 border-blue-200",
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    declined: "bg-red-50 text-red-600 border-red-200",
    expired:  "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <div className="space-y-4">
      {/* Existing offer summary */}
      {displayOffer && !showForm && (
        <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Current Offer</p>
            <Badge variant="outline" className={cn("text-xs capitalize", offerStatusStyle[displayOffer.status] || "")}>
              {displayOffer.status || "draft"}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><p className="text-xs text-slate-400">Designation</p><p className="font-medium text-slate-800">{displayOffer.designation}</p></div>
            <div>
              <p className="text-xs text-slate-400">CTC Annual</p>
              <p className="font-medium text-slate-800">
                ₹{Number(displayOffer.ctcAnnual).toLocaleString()}
                {Number(displayOffer.ctcAnnual) >= 100000 && (
                  <span className="text-xs text-slate-500 ml-1">({(Number(displayOffer.ctcAnnual)/100000).toFixed(1)} LPA)</span>
                )}
              </p>
            </div>
            <div><p className="text-xs text-slate-400">Joining Date</p><p className="font-medium text-slate-800">{displayOffer.joiningDate ? formatDate(displayOffer.joiningDate) : "—"}</p></div>
            {displayOffer.location && <div><p className="text-xs text-slate-400">Location</p><p className="font-medium text-slate-800">{displayOffer.location}</p></div>}
            {displayOffer.offerNumber && <div><p className="text-xs text-slate-400">Offer Ref</p><p className="font-medium text-slate-800 font-mono text-xs">{displayOffer.offerNumber}</p></div>}
            {displayOffer.expiryDate && <div><p className="text-xs text-slate-400">Expires</p><p className="font-medium text-slate-800">{formatDate(displayOffer.expiryDate)}</p></div>}
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                onClick={() => { setShowPreview(true); setBreakdown(bd); }}>
                <Printer className="w-3.5 h-3.5" /> View / Print
              </Button>
              <Button size="sm" variant="outline" className="border-slate-200" onClick={() => setShowForm(true)}>
                Edit Offer
              </Button>
              {displayOffer.status === "draft" && (
                <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 gap-1.5"
                  onClick={handleMarkSent} disabled={saving}>
                  <Send className="w-3.5 h-3.5" /> Mark Sent
                </Button>
              )}
              {displayOffer.status === "sent" && (
                <>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                    onClick={handleMarkAccepted} disabled={saving}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={handleMarkDeclined} disabled={saving}>
                    <X className="w-3.5 h-3.5" /> Decline
                  </Button>
                </>
              )}
              {/* Submit for Approval */}
              {canManage && displayOffer?.ctcAnnual && displayOffer?.joiningDate && displayOffer?.designation &&
               (!displayOffer.approvalStatus || displayOffer.approvalStatus === "draft" || displayOffer.approvalStatus === "rejected") && (
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                  onClick={handleSubmitForApproval}
                  disabled={submittingApproval}
                >
                  <BadgeCheck className="w-3.5 h-3.5" />
                  {submittingApproval ? "Submitting…" : "Submit for Approval"}
                </Button>
              )}
            </div>
          )}

          {/* Approval Status Banner */}
          {displayOffer?.approvalStatus && displayOffer.approvalStatus !== "draft" && (
            <div className={cn(
              "flex items-start gap-3 px-4 py-3 rounded-xl border text-sm",
              displayOffer.approvalStatus === "pending_approval" && "bg-amber-50 border-amber-200 text-amber-800",
              displayOffer.approvalStatus === "approved"         && "bg-emerald-50 border-emerald-200 text-emerald-800",
              displayOffer.approvalStatus === "rejected"         && "bg-red-50 border-red-200 text-red-800",
            )}>
              {displayOffer.approvalStatus === "pending_approval" && <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              {displayOffer.approvalStatus === "approved"         && <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              {displayOffer.approvalStatus === "rejected"         && <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="font-semibold capitalize">
                  {displayOffer.approvalStatus === "pending_approval" ? "Pending Super Admin Approval" : displayOffer.approvalStatus}
                </p>
                {displayOffer.approvalComments && (
                  <p className="text-xs mt-0.5 opacity-80">{displayOffer.approvalComments}</p>
                )}
                {displayOffer.approvalStatus === "approved" && displayOffer.offerPdfUrl && (
                  <a href={displayOffer.offerPdfUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold mt-1.5 underline">
                    <Download className="w-3 h-3" /> Download Approved Offer
                  </a>
                )}
              </div>
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
              <Input value={form.designation} onChange={e => set("designation", e.target.value)} placeholder="e.g. Software Engineer" />
            </div>
            <div className="space-y-1.5">
              <Label>Offer Reference No.</Label>
              <Input value={form.offerNumber} onChange={e => set("offerNumber", e.target.value)} className="font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>CTC Annual (₹) *</Label>
              <Input type="number" min={0} value={form.ctcAnnual} onChange={e => set("ctcAnnual", e.target.value)} placeholder="e.g. 800000" />
              {form.ctcAnnual && Number(form.ctcAnnual) > 0 && (
                <p className="text-xs text-slate-400">{(Number(form.ctcAnnual)/100000).toFixed(2)} LPA</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Joining Date *</Label>
              <Input type="date" value={form.joiningDate} onChange={e => set("joiningDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Work Location</Label>
              <Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Mumbai / Bangalore HQ" />
            </div>
            <div className="space-y-1.5">
              <Label>Offer Expiry Date</Label>
              <Input type="date" value={form.expiryDate} onChange={e => set("expiryDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input value={form.department} onChange={e => set("department", e.target.value)} placeholder="e.g. Engineering" />
            </div>
            <div className="space-y-1.5">
              <Label>Reporting Manager</Label>
              <Input value={form.reportingManager} onChange={e => set("reportingManager", e.target.value)} placeholder="e.g. Rahul Sharma" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>City Type (for HRA calculation)</Label>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm w-fit">
              <button type="button" onClick={() => set("isMetro", true)}
                className={cn("px-4 py-2 font-semibold transition-colors", form.isMetro ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}>
                Metro
              </button>
              <button type="button" onClick={() => set("isMetro", false)}
                className={cn("px-4 py-2 font-semibold transition-colors", !form.isMetro ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}>
                Non-Metro
              </button>
            </div>
          </div>

          <button type="button" onClick={() => setShowCTC(v => !v)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
            <Sparkles className="w-3.5 h-3.5" />
            {showCTC ? "Hide CTC Calculator" : "Use CTC Calculator to auto-fill"}
          </button>
          {showCTC && (
            <CTCCalculator
              initialCTC={Number(form.ctcAnnual) || 0}
              onApply={(s) => {
                const annual = Math.round((s.basic + s.hra + s.allowances) * 12 / (1 - 0.0672));
                set("ctcAnnual", String(annual));
                setShowCTC(false);
              }}
            />
          )}

          <div className="flex gap-3 pt-1">
            <Button onClick={handleGenerate} loading={saving} className="flex-1">
              {saving ? "Saving…" : "Generate Offer Letter"}
            </Button>
            {displayOffer && (
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-slate-200">Cancel</Button>
            )}
          </div>
        </div>
      )}

      {/* Offer Letter Preview */}
      {showPreview && bd && (
        <OfferLetterPreview
          candidate={candidate}
          offer={displayOffer || { designation: form.designation, joiningDate: form.joiningDate, expiryDate: form.expiryDate, location: form.location, department: form.department, reportingManager: form.reportingManager, offerNumber: form.offerNumber }}
          jobTitle={jobTitle}
          breakdown={bd}
          printRef={printRef}
          onPrint={() => window.print()}
          onMarkSent={handleMarkSent}
          onClose={() => setShowPreview(false)}
          saving={saving}
          alreadySent={displayOffer?.status !== "draft" && displayOffer?.status !== undefined}
        />
      )}
    </div>
  );
}

/* ── Offer Letter Preview ── */
function OfferLetterPreview({
  candidate, offer, jobTitle, breakdown, printRef,
  onPrint, onMarkSent, onClose, saving, alreadySent,
}: {
  candidate: any; offer: any; jobTitle?: string; breakdown: CTCBreakdown;
  printRef: React.RefObject<HTMLDivElement>; onPrint: () => void;
  onMarkSent: () => void; onClose: () => void; saving: boolean; alreadySent: boolean;
}) {
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 justify-end print:hidden">
        <Button size="sm" variant="outline" onClick={onClose} className="border-slate-200">Back to Form</Button>
        <Button size="sm" variant="outline" onClick={onPrint} className="border-slate-200 gap-1.5">
          <Printer className="w-3.5 h-3.5" /> Print
        </Button>
        {!alreadySent && (
          <Button size="sm" variant="success" className="gap-1.5" onClick={onMarkSent} loading={saving}>
            <Send className="w-3.5 h-3.5" /> Mark as Sent
          </Button>
        )}
      </div>

      <div ref={printRef} className="border border-slate-200 rounded-xl p-6 bg-white space-y-4 text-sm print:border-0" id="offer-letter-print">
        {/* Letterhead */}
        <div className="text-center border-b border-slate-200 pb-4">
          <div className="flex justify-center mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://www.gehnax.com/Gehnax-logo.png" alt="Gehnax" className="h-10 w-auto" />
          </div>
          <p className="text-slate-500 text-xs mt-1">Human Resources Department</p>
          {offer.location && <p className="text-slate-400 text-xs">{offer.location}</p>}
        </div>

        <div className="flex justify-between text-xs text-slate-500">
          <span>Date: {today}</span>
          <span>Ref: {offer.offerNumber || `GTL/HR/${new Date().getFullYear()}/${candidate._id?.slice(-6).toUpperCase()}`}</span>
        </div>

        <div className="text-sm">
          <p className="font-semibold text-slate-900">{candidate.firstName} {candidate.lastName}</p>
          <p className="text-slate-500">{candidate.email}</p>
          {candidate.phone && <p className="text-slate-500">{candidate.phone}</p>}
        </div>

        <div>
          <p className="font-semibold text-slate-800 underline underline-offset-2">Subject: Offer of Employment</p>
        </div>

        <div className="space-y-3 text-slate-700 leading-relaxed">
          <p>Dear {candidate.firstName},</p>
          <p>
            We are pleased to offer you the position of <strong>{offer.designation || jobTitle}</strong>
            {offer.department && <> in the <strong>{offer.department}</strong> department</>}{" "}
            at <strong>Gehnax Technologies LLP</strong>.
            {offer.location && <> This position is based at <strong>{offer.location}</strong>.</>}
          </p>
          {offer.reportingManager && (
            <p>You will report to <strong>{offer.reportingManager}</strong>.</p>
          )}
          <p>This offer is based on your experience, qualifications, and the interviews conducted. We look forward to you joining our team.</p>
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
                { label: "Basic Salary", a: breakdown.basicMonthly * 12, m: breakdown.basicMonthly },
                { label: `HRA (${offer.isMetro !== false ? "Metro 50%" : "Non-Metro 40%"})`, a: breakdown.hraMonthly * 12, m: breakdown.hraMonthly },
                { label: "Other Allowances", a: breakdown.otherAllowancesMonthly * 12, m: breakdown.otherAllowancesMonthly },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.label}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right">{fmt(row.a)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right">{fmt(row.m)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="border border-slate-200 px-3 py-2">Gross Salary</td>
                <td className="border border-slate-200 px-3 py-2 text-right">{fmt(breakdown.grossAnnual)}</td>
                <td className="border border-slate-200 px-3 py-2 text-right">{fmt(breakdown.grossMonthly)}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2 text-slate-600">Employer PF (12%)</td>
                <td className="border border-slate-200 px-3 py-2 text-right text-slate-600">{fmt(breakdown.employerPFAnnual)}</td>
                <td className="border border-slate-200 px-3 py-2 text-right text-slate-600">{fmt(breakdown.employerPFMonthly)}</td>
              </tr>
              <tr className="bg-blue-50 font-bold">
                <td className="border border-slate-200 px-3 py-2 text-blue-800">Total CRM</td>
                <td className="border border-slate-200 px-3 py-2 text-right text-blue-800">{fmt(breakdown.crmAnnual)}</td>
                <td className="border border-slate-200 px-3 py-2 text-right text-blue-800">{fmt(Math.round(breakdown.crmAnnual / 12))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-1 text-sm text-slate-700">
          {offer.joiningDate && <p><strong>Date of Joining:</strong> {formatDate(offer.joiningDate)}</p>}
          {offer.expiryDate && <p><strong>Offer Valid Until:</strong> {formatDate(offer.expiryDate)}</p>}
        </div>

        <p className="text-slate-600 text-sm">
          Please sign and return a copy of this letter as your acceptance of the offer. We look forward to welcoming you to our team.
        </p>

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

/* ── Documents Tab ── */
function DocumentsTab({ candidate, canManage, onUpdate }: { candidate: any; canManage: boolean; onUpdate: () => void }) {
  const docs: any[] = Array.isArray(candidate.documents) ? candidate.documents : [];
  const [docType, setDocType] = useState("Resume");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadedDocTypes = docs.map((d: any) => d.docType);
  const missingDocs = REQUIRED_DOCS.filter(d => !uploadedDocTypes.includes(d));

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
      else { toast.success("Document uploaded"); if (fileRef.current) fileRef.current.value = ""; onUpdate(); }
    } finally { setUploading(false); }
  };

  const handleDelete = async (docId: string) => {
    const res = await fetch(`/api/hiring/candidates/${candidate._id}/documents/${docId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Document removed"); onUpdate(); }
    else toast.error("Failed to delete");
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Required Documents</p>
        <div className="grid grid-cols-2 gap-2">
          {REQUIRED_DOCS.map(doc => {
            const uploaded = uploadedDocTypes.includes(doc);
            return (
              <div key={doc} className={cn("flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium",
                uploaded ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500")}>
                {uploaded ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" /> : <Circle className="w-4 h-4 flex-shrink-0 text-slate-300" />}
                {doc}
              </div>
            );
          })}
        </div>
        {missingDocs.length > 0 && <p className="text-xs text-amber-600 mt-2">{missingDocs.length} required document{missingDocs.length !== 1 ? "s" : ""} missing</p>}
      </div>

      {docs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Uploaded Documents</p>
          <div className="space-y-2">
            {docs.map((doc: any) => (
              <div key={doc._id || doc.filename} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{doc.docType}</p>
                  <p className="text-xs text-slate-400 truncate">{doc.originalName || doc.filename}</p>
                  {doc.createdAt && <p className="text-xs text-slate-400">{formatDate(doc.createdAt)}</p>}
                </div>
                {doc.fileUrl && (
                  <a href={`/api/hiring/candidates/${candidate._id}/documents/${doc._id}`} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <Download className="w-4 h-4" />
                  </a>
                )}
                {doc.verified && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-label="Verified" />}
                {canManage && (
                  <button onClick={() => handleDelete(doc._id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {canManage && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Upload Document</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Document Type</Label>
              <NativeSelect value={docType} onChange={e => setDocType(e.target.value)}>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label>File</Label>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs file:border-0 file:bg-transparent file:text-xs file:font-medium text-slate-700" />
            </div>
          </div>
          <Button onClick={handleUpload} disabled={uploading} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5" size="sm">
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "Uploading…" : "Upload Document"}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── InfoItem ── */
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
