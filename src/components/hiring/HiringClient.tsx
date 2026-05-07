"use client";

import { useState, useMemo, useRef } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Pencil, Briefcase, MapPin, Users, Search, Eye, Link2, Check,
  Upload, Loader2, FileText, X, Sparkles,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { formatDate, cn } from "@/lib/utils";
import CandidateDetail from "./CandidateDetail";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/* ── Helpers ──────────────────────────────────────────── */
const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  intern: "Intern",
};

const STATUS_COLORS: Record<string, string> = {
  open:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft:   "bg-slate-50 text-slate-600 border-slate-200",
  closed:  "bg-red-50 text-red-600 border-red-200",
  on_hold: "bg-amber-50 text-amber-700 border-amber-200",
};

const STAGE_COLORS: Record<string, string> = {
  applied:   "bg-blue-50 text-blue-700 border-blue-200",
  screening: "bg-amber-50 text-amber-700 border-amber-200",
  interview: "bg-violet-50 text-violet-700 border-violet-200",
  offer:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  hired:     "bg-teal-50 text-teal-700 border-teal-200",
  rejected:  "bg-red-50 text-red-600 border-red-200",
};

const STAGES = ["applied", "screening", "interview", "offer", "hired", "rejected"];

function formatSalary(val: number) {
  if (!val) return "";
  if (val >= 100000) return `${(val / 100000).toFixed(1)} LPA`;
  return `₹${val.toLocaleString()}`;
}

/* ══════════════════════════════════════════════════════════
   MAIN CLIENT
══════════════════════════════════════════════════════════ */
export default function HiringClient() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const canManage = ["super_admin", "hr_admin"].includes(role);

  const [activeTab, setActiveTab] = useState<string>("jobs");
  const [addJobOpen, setAddJobOpen] = useState(false);
  const [editJob, setEditJob] = useState<any>(null);

  const [addCandidateOpen, setAddCandidateOpen] = useState(false);
  const [viewCandidate, setViewCandidate] = useState<any>(null);

  // Filters
  const [jobFilter, setJobFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [search, setSearch] = useState("");

  // Pre-filter: open job card clicked
  const [filterByJob, setFilterByJob] = useState<string>("");

  const { data: jobsData, isLoading: jobsLoading } = useSWR("/api/hiring/jobs", fetcher);
  const { data: candidatesData, isLoading: candidatesLoading } = useSWR("/api/hiring/candidates", fetcher);

  const jobs: any[] = jobsData?.jobs || [];
  const candidates: any[] = candidatesData?.candidates || [];

  const openJobs = jobs.filter((j) => j.status === "open");

  const getCandidateCount = (jobId: string) =>
    candidates.filter((c) => {
      const id = typeof c.jobPosting === "object" ? c.jobPosting?._id : c.jobPosting;
      return id === jobId;
    }).length;

  // Handle card click → switch to candidates tab filtered by job
  const handleJobCardClick = (job: any) => {
    setFilterByJob(job._id);
    setJobFilter(job._id);
    setActiveTab("candidates");
  };

  // Filtered candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const jobId = typeof c.jobPosting === "object" ? c.jobPosting?._id : c.jobPosting;
      const matchJob = !jobFilter || jobId === jobFilter;
      const matchStage = !stageFilter || c.stage === stageFilter;
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const matchSearch = !search || fullName.includes(search.toLowerCase()) || (c.email || "").toLowerCase().includes(search.toLowerCase());
      return matchJob && matchStage && matchSearch;
    });
  }, [candidates, jobFilter, stageFilter, search]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-64 bg-slate-100">
          <TabsTrigger value="jobs" className="gap-1.5 data-active:bg-blue-600 data-active:text-white data-active:shadow-md">
            <Briefcase className="w-3.5 h-3.5" />
            Jobs
          </TabsTrigger>
          <TabsTrigger value="candidates" className="gap-1.5 data-active:bg-blue-600 data-active:text-white data-active:shadow-md">
            <Users className="w-3.5 h-3.5" />
            Candidates
          </TabsTrigger>
        </TabsList>

        {/* ── JOBS TAB ── */}
        <TabsContent value="jobs" className="mt-4">
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-800">{openJobs.length}</span> open{" "}
                {openJobs.length === 1 ? "job" : "jobs"}
                {jobs.length !== openJobs.length && (
                  <span className="text-slate-400"> · {jobs.length} total</span>
                )}
              </p>
              {canManage && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                  size="sm"
                  onClick={() => setAddJobOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Job
                </Button>
              )}
            </div>

            {/* Grid */}
            {jobsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">No job postings yet</p>
                {canManage && (
                  <p className="text-xs text-slate-400 mt-1">Click "Add Job" to create your first posting</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map((job) => (
                  <JobCard
                    key={job._id}
                    job={job}
                    candidateCount={getCandidateCount(job._id)}
                    canManage={canManage}
                    onEdit={(e) => { e.stopPropagation(); setEditJob(job); }}
                    onClick={() => handleJobCardClick(job)}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── CANDIDATES TAB ── */}
        <TabsContent value="candidates" className="mt-4">
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name or email…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <NativeSelect
                value={jobFilter}
                onChange={(e) => { setJobFilter(e.target.value); setFilterByJob(e.target.value); }}
                className="w-full sm:w-52"
              >
                <option value="">All Jobs</option>
                {jobs.map((j) => (
                  <option key={j._id} value={j._id}>{j.title}</option>
                ))}
              </NativeSelect>
              <NativeSelect
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="w-full sm:w-44"
              >
                <option value="">All Stages</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </NativeSelect>
              {canManage && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700 shadow-sm flex-shrink-0"
                  size="sm"
                  onClick={() => setAddCandidateOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Candidate
                </Button>
              )}
            </div>

            {/* Table */}
            {candidatesLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">No candidates found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {search || jobFilter || stageFilter ? "Try adjusting your filters" : "Add your first candidate"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">Job</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">Stage</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide hidden sm:table-cell">Source</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">Exp</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Applied</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCandidates.map((c) => {
                      const jobTitle = typeof c.jobPosting === "object" ? c.jobPosting?.title : jobs.find((j) => j._id === c.jobPosting)?.title;
                      return (
                        <tr key={c._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-semibold text-slate-900">{c.firstName} {c.lastName}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{c.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-slate-700 text-xs">{jobTitle || "—"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={`text-xs capitalize ${STAGE_COLORS[c.stage] || ""}`}
                            >
                              {c.stage || "applied"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-xs text-slate-500 capitalize">{c.source || "—"}</span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-xs text-slate-500">
                              {c.totalExperience != null ? `${c.totalExperience} yr${c.totalExperience !== 1 ? "s" : ""}` : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-xs text-slate-500">
                              {c.createdAt ? formatDate(c.createdAt) : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-200 gap-1.5 h-7 text-xs"
                              onClick={() => setViewCandidate(c)}
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      {canManage && (
        <Dialog open={addJobOpen} onOpenChange={setAddJobOpen} disablePointerDismissal>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Job Posting</DialogTitle></DialogHeader>
            <JobForm
              onSuccess={() => { setAddJobOpen(false); mutate("/api/hiring/jobs"); }}
              onCancel={() => setAddJobOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {canManage && editJob && (
        <Dialog open={!!editJob} onOpenChange={() => setEditJob(null)} disablePointerDismissal>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Job Posting</DialogTitle></DialogHeader>
            <JobForm
              job={editJob}
              onSuccess={() => { setEditJob(null); mutate("/api/hiring/jobs"); }}
              onCancel={() => setEditJob(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {canManage && (
        <Dialog open={addCandidateOpen} onOpenChange={setAddCandidateOpen} disablePointerDismissal>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Candidate</DialogTitle></DialogHeader>
            <CandidateForm
              jobs={jobs}
              defaultJobId={filterByJob}
              onSuccess={() => {
                setAddCandidateOpen(false);
                mutate("/api/hiring/candidates");
              }}
              onCancel={() => setAddCandidateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {viewCandidate && (
        <Dialog open={!!viewCandidate} onOpenChange={() => setViewCandidate(null)} disablePointerDismissal>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <CandidateDetail
              candidate={viewCandidate}
              jobs={jobs}
              canManage={canManage}
              onUpdate={() => {
                mutate("/api/hiring/candidates");
                // refresh the candidate data
                mutate(`/api/hiring/candidates/${viewCandidate._id}`, undefined, { revalidate: true });
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* ── Job Card ──────────────────────────────────────────── */
function JobCard({
  job, candidateCount, canManage, onEdit, onClick,
}: {
  job: any;
  candidateCount: number;
  canManage: boolean;
  onEdit: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/jobs/${job._id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card
      className="border-slate-200 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-5 space-y-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-slate-900 leading-tight flex-1">{job.title}</h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge
              variant="outline"
              className={`text-xs capitalize ${STATUS_COLORS[job.status] || ""}`}
            >
              {job.status?.replace("_", " ")}
            </Badge>
            {job.status === "open" && (
              <button
                onClick={copyLink}
                className={cn(
                  "p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100",
                  copied
                    ? "text-emerald-600 bg-emerald-50"
                    : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                )}
                title="Copy apply link"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
              </button>
            )}
            {canManage && (
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                title="Edit job"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5">
          {job.department?.name && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              {job.department.name}
            </Badge>
          )}
          {job.jobType && (
            <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">
              {JOB_TYPE_LABELS[job.jobType] || job.jobType}
            </Badge>
          )}
        </div>

        {/* Meta */}
        <div className="space-y-1.5">
          {job.location && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>{job.location}</span>
            </div>
          )}
          {(job.experienceMin != null || job.experienceMax != null) && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>
                {job.experienceMin ?? 0}–{job.experienceMax ?? "?"} yrs exp
              </span>
            </div>
          )}
          {(job.salaryMin || job.salaryMax) && (
            <div className="text-xs text-slate-500">
              {formatSalary(job.salaryMin)}
              {job.salaryMin && job.salaryMax ? " – " : ""}
              {formatSalary(job.salaryMax)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">{candidateCount}</span>
          <span className="text-xs text-slate-400">
            candidate{candidateCount !== 1 ? "s" : ""}
          </span>
          {job.positions > 1 && (
            <span className="text-xs text-slate-400 ml-auto">
              {job.positions} positions
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Job Form (Add/Edit) ───────────────────────────────── */
function JobForm({
  job, onSuccess, onCancel,
}: {
  job?: any;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { data: depts } = useSWR("/api/departments", fetcher);
  const deptList = Array.isArray(depts) ? depts : [];

  const [form, setForm] = useState({
    title:         job?.title || "",
    department:    job?.department?._id || job?.department || "",
    description:   job?.description || "",
    requirements:  Array.isArray(job?.requirements) ? (job.requirements as string[]).join("\n") : "",
    positions:     job?.positions ?? 1,
    experienceMin: job?.experienceMin ?? "",
    experienceMax: job?.experienceMax ?? "",
    salaryMin:     job?.salaryMin ?? "",
    salaryMax:     job?.salaryMax ?? "",
    location:      job?.location || "India",
    jobType:       job?.jobType || "full_time",
    status:        job?.status || "open",
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        requirements: form.requirements
          ? form.requirements.split("\n").map((r) => r.trim()).filter(Boolean)
          : [],
        positions:     Number(form.positions) || 1,
        experienceMin: form.experienceMin !== "" ? Number(form.experienceMin) : undefined,
        experienceMax: form.experienceMax !== "" ? Number(form.experienceMax) : undefined,
        salaryMin:     form.salaryMin !== "" ? Number(form.salaryMin) : undefined,
        salaryMax:     form.salaryMax !== "" ? Number(form.salaryMax) : undefined,
        department:    form.department || undefined,
      };

      const url = job ? `/api/hiring/jobs/${job._id}` : "/api/hiring/jobs";
      const method = job ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed to save");
      else {
        toast.success(job ? "Job updated" : "Job created");
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label>Job Title *</Label>
        <Input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          required
          placeholder="e.g. Senior React Developer"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Department *</Label>
          <NativeSelect
            value={form.department}
            onChange={(e) => set("department", e.target.value)}
            required
          >
            <option value="">Select department</option>
            {deptList.map((d: any) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label>Job Type</Label>
          <NativeSelect value={form.jobType} onChange={(e) => set("jobType", e.target.value)}>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          placeholder="Role overview, responsibilities…"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Requirements <span className="text-xs text-slate-400">(one per line)</span></Label>
        <Textarea
          value={form.requirements}
          onChange={(e) => set("requirements", e.target.value)}
          rows={3}
          placeholder={"3+ years React experience\nTypeScript proficiency\nTeam player"}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Positions</Label>
          <Input
            type="number"
            min={1}
            value={form.positions}
            onChange={(e) => set("positions", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Exp Min (yrs)</Label>
          <Input
            type="number"
            min={0}
            value={form.experienceMin}
            onChange={(e) => set("experienceMin", e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Exp Max (yrs)</Label>
          <Input
            type="number"
            min={0}
            value={form.experienceMax}
            onChange={(e) => set("experienceMax", e.target.value)}
            placeholder="5"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Salary Min (₹)</Label>
          <Input
            type="number"
            min={0}
            value={form.salaryMin}
            onChange={(e) => set("salaryMin", e.target.value)}
            placeholder="e.g. 600000"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Salary Max (₹)</Label>
          <Input
            type="number"
            min={0}
            value={form.salaryMax}
            onChange={(e) => set("salaryMax", e.target.value)}
            placeholder="e.g. 1200000"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Location</Label>
          <Input
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="India"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <NativeSelect value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="open">Open</option>
            <option value="draft">Draft</option>
            <option value="on_hold">On Hold</option>
          </NativeSelect>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700">
          {loading ? "Saving…" : job ? "Save Changes" : "Create Job"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}

/* ── Add Candidate Form ────────────────────────────────── */
function CandidateForm({
  jobs, defaultJobId, onSuccess, onCancel,
}: {
  jobs: any[];
  defaultJobId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resumeFile, setResumeFile]   = useState<File | null>(null);
  const [resumeUrl, setResumeUrl]     = useState("");
  const [parsing, setParsing]         = useState(false);
  const [parseError, setParseError]   = useState("");
  const [autofilled, setAutofilled]   = useState(false);

  const [form, setForm] = useState({
    firstName:          "",
    lastName:           "",
    email:              "",
    phone:              "",
    jobPosting:         defaultJobId || "",
    currentCompany:     "",
    currentDesignation: "",
    totalExperience:    "",
    skills:             "",
    source:             "direct",
    notes:              "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  /* ── Resume upload ── */
  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFile(file);
    setParsing(true);
    setParseError("");
    setAutofilled(false);
    try {
      const fd = new FormData();
      fd.append("resume", file);
      const res  = await fetch("/api/public/parse-resume", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setParseError(data.error || "Could not parse resume"); return; }
      setResumeUrl(data.fileUrl || "");
      const p = data.parsed;
      setForm((f) => ({
        ...f,
        firstName:          f.firstName          || p.firstName          || "",
        lastName:           f.lastName           || p.lastName           || "",
        email:              f.email              || p.email              || "",
        phone:              f.phone              || p.phone              || "",
        currentCompany:     f.currentCompany     || p.currentCompany     || "",
        currentDesignation: f.currentDesignation || p.currentDesignation || "",
        totalExperience:    f.totalExperience    || p.totalExperience    || "",
        skills:             f.skills             || p.skills             || "",
      }));
      setAutofilled(true);
      if (!data.fileUrl) {
        setParseError("Resume parsed (form auto-filled) but FTP upload failed — file not saved. Check FTP settings in .env.local.");
      }
    } catch {
      setParseError("Upload failed. Please try again.");
    } finally {
      setParsing(false);
    }
  };

  const removeResume = () => {
    setResumeFile(null); setResumeUrl(""); setAutofilled(false); setParseError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        resumeUrl:       resumeUrl || undefined,
        skills:          form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
        totalExperience: form.totalExperience !== "" ? Number(form.totalExperience) : undefined,
        jobPosting:      form.jobPosting || undefined,
      };
      const res = await fetch("/api/hiring/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed to add candidate");
      else { toast.success("Candidate added"); onSuccess(); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">

      {/* Resume upload zone */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-slate-700">
          <FileText className="w-3.5 h-3.5" />
          Attach Resume
        </Label>
        {!resumeFile ? (
          <label className="flex items-center gap-3 border-2 border-dashed border-blue-300 bg-blue-50/50 rounded-xl p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group">
            <div className="p-2 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors flex-shrink-0">
              <Upload className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-700">Click to upload resume</p>
              <p className="text-xs text-slate-500 mt-0.5">PDF, DOCX or TXT · Max 5MB · Auto-fills the form</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleResumeChange} />
          </label>
        ) : (
          <div className={cn(
            "rounded-xl border p-3 flex items-center justify-between gap-3",
            autofilled ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-slate-50"
          )}>
            {parsing ? (
              <div className="flex items-center gap-2.5">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                <p className="text-sm font-medium text-slate-600">Uploading &amp; parsing resume…</p>
              </div>
            ) : autofilled ? (
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-800">
                    {resumeUrl ? "Resume uploaded to FTP & form auto-filled" : "Form auto-filled (file not saved)"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{resumeFile.name}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <p className="text-sm text-slate-700 truncate">{resumeFile.name}</p>
              </div>
            )}
            {!parsing && (
              <button type="button" onClick={removeResume} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        {parseError && (
          <p className="mt-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">{parseError}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>First Name *</Label>
          <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Last Name *</Label>
          <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Email *</Label>
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91…" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Job Posting *</Label>
        <NativeSelect value={form.jobPosting} onChange={(e) => set("jobPosting", e.target.value)} required>
          <option value="">Select job</option>
          {jobs.map((j) => (
            <option key={j._id} value={j._id}>{j.title}</option>
          ))}
        </NativeSelect>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Current Company</Label>
          <Input value={form.currentCompany} onChange={(e) => set("currentCompany", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Current Designation</Label>
          <Input value={form.currentDesignation} onChange={(e) => set("currentDesignation", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Total Experience (yrs)</Label>
          <Input type="number" min={0} step={0.5} value={form.totalExperience} onChange={(e) => set("totalExperience", e.target.value)} placeholder="e.g. 3" />
        </div>
        <div className="space-y-1.5">
          <Label>Source</Label>
          <NativeSelect value={form.source} onChange={(e) => set("source", e.target.value)}>
            <option value="direct">Direct</option>
            <option value="linkedin">LinkedIn</option>
            <option value="naukri">Naukri</option>
            <option value="indeed">Indeed</option>
            <option value="referral">Referral</option>
            <option value="agency">Agency</option>
            <option value="campus">Campus</option>
            <option value="other">Other</option>
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Skills <span className="text-xs text-slate-400">(comma-separated)</span></Label>
        <Input value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="React, TypeScript, Node.js" />
      </div>

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Initial notes about the candidate…" />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading || parsing} className="flex-1 bg-blue-600 hover:bg-blue-700">
          {loading ? "Adding…" : "Add Candidate"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
      </div>
    </form>
  );
}
