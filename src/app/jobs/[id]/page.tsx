"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin, Briefcase, Clock, Users, ArrowLeft, CheckCircle2,
  ChevronRight, Upload, Loader2, FileText, X, Sparkles,
} from "lucide-react";

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract:  "Contract",
  intern:    "Internship",
};

function formatSalary(min?: number, max?: number) {
  if (!min && !max) return null;
  const fmt = (v: number) => v >= 100000 ? `${(v / 100000).toFixed(1)} LPA` : `₹${v.toLocaleString()}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob]           = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState("");
  const [candidateAccount, setCandidateAccount] = useState<any>(null);

  // Resume upload state
  const fileInputRef            = useRef<HTMLInputElement>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl]   = useState("");
  const [parsing, setParsing]   = useState(false);
  const [parseError, setParseError] = useState("");
  const [autofilled, setAutofilled] = useState(false);

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    currentCompany: "", currentDesignation: "",
    totalExperience: "", skills: "", coverNote: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/public/jobs/${id}`).then(r => r.json()),
      fetch("/api/candidate/me").then(r => r.ok ? r.json() : null),
    ]).then(([jobData, meData]) => {
      if (jobData.job) setJob(jobData.job); else setNotFound(true);
      if (meData?.account) {
        const a = meData.account;
        setCandidateAccount(a);
        setForm({
          firstName: a.firstName || "",
          lastName:  a.lastName  || "",
          email:     a.email     || "",
          phone:     a.phone     || "",
          currentCompany:      a.currentCompany      || "",
          currentDesignation:  a.currentDesignation  || "",
          totalExperience:     String(a.totalExperience ?? ""),
          skills:              (a.skills || []).join(", "),
          coverNote:           "",
        });
        if (a.resumeUrl) { setResumeUrl(a.resumeUrl); setAutofilled(true); }
      }
    }).catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // ── Resume upload + parse ─────────────────────────────
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

      if (!res.ok) {
        setParseError(data.error || "Could not parse resume");
        return;
      }

      setResumeUrl(data.fileUrl);

      // Auto-fill — only overwrite empty fields so user edits aren't lost
      const p = data.parsed;
      setForm((f) => ({
        firstName:          f.firstName          || p.firstName          || f.firstName,
        lastName:           f.lastName           || p.lastName           || f.lastName,
        email:              f.email              || p.email              || f.email,
        phone:              f.phone              || p.phone              || f.phone,
        currentCompany:     f.currentCompany     || p.currentCompany     || f.currentCompany,
        currentDesignation: f.currentDesignation || p.currentDesignation || f.currentDesignation,
        totalExperience:    f.totalExperience    || p.totalExperience    || f.totalExperience,
        skills:             f.skills             || p.skills             || f.skills,
        coverNote:          f.coverNote,
      }));
      setAutofilled(true);
    } catch {
      setParseError("Upload failed. Please try again.");
    } finally {
      setParsing(false);
    }
  };

  const removeResume = () => {
    setResumeFile(null);
    setResumeUrl("");
    setAutofilled(false);
    setParseError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Submit ────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/public/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          jobPosting: id,
          resumeUrl,
          candidateAccountId: candidateAccount?._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Something went wrong. Please try again.");
      else setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading / not found / success ────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48" />
        <div className="h-10 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="h-40 bg-slate-200 rounded-2xl mt-6" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-slate-700 font-semibold text-lg">Position not available</p>
        <p className="text-slate-400 text-sm mt-1">This job may have been filled or closed.</p>
        <button onClick={() => router.push("/jobs")} className="mt-6 inline-flex items-center gap-2 text-blue-600 text-sm font-medium hover:underline">
          <ArrowLeft className="w-4 h-4" /> View all openings
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Application Submitted!</h2>
        <p className="text-slate-500 mt-3">
          Thanks for applying for <strong>{job?.title}</strong>. Our team will review your application and reach out if there's a match.
        </p>
        <button
          onClick={() => router.push("/jobs")}
          className="mt-8 inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
        >
          View other openings <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <div className="space-y-8">
      <button onClick={() => router.push("/jobs")} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> All openings
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* ── Left: job info ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 sticky top-24">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {job.department?.name && (
                  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 font-medium">
                    {job.department.name}
                  </span>
                )}
                {job.jobType && (
                  <span className="text-xs bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-2.5 py-0.5">
                    {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-black text-slate-900">{job.title}</h1>
            </div>

            <div className="space-y-2 text-sm text-slate-600">
              {job.location && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" />{job.location}</div>}
              {(job.experienceMin != null || job.experienceMax != null) && (
                <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-slate-400" />{job.experienceMin ?? 0}–{job.experienceMax ?? "?"} years experience</div>
              )}
              {job.positions > 0 && (
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" />{job.positions} opening{job.positions !== 1 ? "s" : ""}</div>
              )}
              {salary && (
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /><span className="font-semibold text-emerald-600">{salary}</span></div>
              )}
            </div>

            {job.description && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">About this role</p>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{job.description}</p>
              </div>
            )}

            {job.requirements?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Requirements</p>
                <ul className="space-y-1.5">
                  {job.requirements.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: application form ── */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Apply for this position</h2>
            {!candidateAccount ? (
              <div className="py-10 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-slate-700 font-semibold text-lg mb-2">Login to Apply</p>
                <p className="text-slate-500 text-sm mb-6">Create a candidate account or sign in to apply and track your application status.</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a href={`/candidate-login?next=${encodeURIComponent(`/jobs/${id}`)}`}
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">
                    Sign In
                  </a>
                  <a href={`/candidate/register?next=${encodeURIComponent(`/jobs/${id}`)}`}
                    className="inline-block border border-blue-200 hover:bg-blue-50 text-blue-700 font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">
                    Create Account
                  </a>
                </div>
              </div>
            ) : (
            <>
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Signed in as <strong>{candidateAccount.firstName} {candidateAccount.lastName}</strong>{candidateAccount.resumeUrl ? " · Resume on file" : ""}</span>
            </div>
            <p className="text-sm text-slate-500 mb-6">Your profile has been pre-filled. Review and submit your application.</p>

            {/* ── Resume upload zone ── */}
            <div className="mb-6">
              {!resumeFile ? (
                <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-blue-200 rounded-2xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-all group">
                  <div className="p-3 bg-blue-100 rounded-2xl group-hover:bg-blue-200 transition-colors">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-700">Upload your resume</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, DOCX or TXT · Max 5MB · Form will auto-fill</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={handleResumeChange}
                  />
                </label>
              ) : (
                <div className={`rounded-2xl border p-4 ${autofilled ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-slate-50"}`}>
                  {parsing ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Uploading & parsing resume…</p>
                        <p className="text-xs text-slate-400 mt-0.5">Extracting your details automatically</p>
                      </div>
                    </div>
                  ) : autofilled ? (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-100 rounded-xl flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-emerald-800">Resume uploaded &amp; form auto-filled!</p>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            {resumeFile.name}
                          </p>
                          <p className="text-xs text-emerald-600 mt-1">Review the fields below and make any corrections.</p>
                        </div>
                      </div>
                      <button onClick={removeResume} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                        <p className="text-sm text-slate-700">{resumeFile.name}</p>
                      </div>
                      <button onClick={removeResume} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {parseError && (
                <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {parseError} — you can still fill the form manually.
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name *">
                  <input className={inputCls} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required placeholder="Ravi" />
                </Field>
                <Field label="Last Name *">
                  <input className={inputCls} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required placeholder="Sharma" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Email Address *">
                  <input type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} required placeholder="ravi@email.com" />
                </Field>
                <Field label="Phone Number">
                  <input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Current Company">
                  <input className={inputCls} value={form.currentCompany} onChange={(e) => set("currentCompany", e.target.value)} placeholder="Acme Corp" />
                </Field>
                <Field label="Current Designation">
                  <input className={inputCls} value={form.currentDesignation} onChange={(e) => set("currentDesignation", e.target.value)} placeholder="Software Engineer" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Total Experience (years)">
                  <input type="number" min={0} step={0.5} className={inputCls} value={form.totalExperience} onChange={(e) => set("totalExperience", e.target.value)} placeholder="3" />
                </Field>
                <Field label="Skills">
                  <input className={inputCls} value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="React, Node.js, TypeScript" />
                </Field>
              </div>

              <Field label="Cover Note">
                <textarea
                  rows={4}
                  className={`${inputCls} resize-none`}
                  value={form.coverNote}
                  onChange={(e) => set("coverNote", e.target.value)}
                  placeholder="Tell us why you're a great fit for this role…"
                />
              </Field>

              <button
                type="submit"
                disabled={submitting || parsing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit Application"}
              </button>

              <p className="text-xs text-center text-slate-400">
                By submitting, you agree that your information may be used for recruitment purposes.
              </p>
            </form>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
