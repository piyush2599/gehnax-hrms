"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Briefcase, Clock, Users, ArrowRight, CheckCircle2, Clock3 } from "lucide-react";

export const dynamic = "force-dynamic";

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract:  "Contract",
  intern:    "Internship",
};

const STAGE_BADGE: Record<string, { label: string; cls: string }> = {
  applied:   { label: "Applied",    cls: "bg-blue-50 text-blue-700 border-blue-200" },
  screening: { label: "Screening",  cls: "bg-violet-50 text-violet-700 border-violet-200" },
  interview: { label: "Interview",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
  offer:     { label: "Offer",      cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  hired:     { label: "Hired",      cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected:  { label: "Not Moved Forward", cls: "bg-red-50 text-red-600 border-red-200" },
};

function formatSalary(min?: number, max?: number) {
  if (!min && !max) return null;
  const fmt = (v: number) => v >= 100000 ? `${(v / 100000).toFixed(1)} LPA` : `₹${v.toLocaleString()}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

export default function JobsPage() {
  const [jobs, setJobs]             = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [candidateAccount, setCandidateAccount] = useState<any>(null);
  // map jobPostingId → stage
  const [appliedMap, setAppliedMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAll = async () => {
      const [jobsRes, meRes] = await Promise.all([
        fetch("/api/public/jobs"),
        fetch("/api/candidate/me"),
      ]);
      const jobsData = await jobsRes.json();
      setJobs(jobsData.jobs || []);

      if (meRes.ok) {
        const meData = await meRes.json();
        setCandidateAccount(meData.account);

        const appsRes = await fetch("/api/candidate/applications");
        if (appsRes.ok) {
          const appsData = await appsRes.json();
          const map: Record<string, string> = {};
          for (const app of appsData.applications || []) {
            const jpId = app.jobPosting?._id || app.jobPosting;
            if (jpId) map[jpId.toString()] = app.stage;
          }
          setAppliedMap(map);
        }
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-6 space-y-3">
          <div className="h-10 w-32 bg-slate-200 rounded-lg mx-auto animate-pulse" />
          <div className="h-8 w-64 bg-slate-200 rounded-lg mx-auto animate-pulse" />
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3 py-6">
        <div className="flex justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.gehnax.com/Gehnax-logo.png" alt="Gehnax" className="h-10 w-auto" />
        </div>
        <h1 className="text-3xl font-black text-slate-900">Join Our Team</h1>
        <p className="text-slate-500 max-w-xl mx-auto">
          We&apos;re building something great at Gehnax Technologies. Explore open roles and apply directly.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-emerald-700">{jobs.length} open position{jobs.length !== 1 ? "s" : ""}</span>
          </div>
          {candidateAccount ? (
            <Link href="/candidate/dashboard" className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:underline">
              <CheckCircle2 className="w-4 h-4" />
              My Applications
            </Link>
          ) : (
            <Link href="/candidate-login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 font-medium">
              Sign in to track applications →
            </Link>
          )}
        </div>
      </div>

      {/* Job list */}
      {jobs.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">No open positions right now</p>
          <p className="text-slate-400 text-sm mt-1">Check back soon — we&apos;re always growing.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job: any) => {
            const salary      = formatSalary(job.salaryMin, job.salaryMax);
            const jobId       = job._id?.toString();
            const appStage    = appliedMap[jobId];
            const stageBadge  = appStage ? STAGE_BADGE[appStage] : null;

            return (
              <Link
                key={jobId}
                href={`/jobs/${jobId}`}
                className="group block bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {job.title}
                      </h2>
                      {job.department?.name && (
                        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 font-medium">
                          {job.department.name}
                        </span>
                      )}
                      {/* Application status badge */}
                      {stageBadge && (
                        <span className={`flex items-center gap-1 text-xs border rounded-full px-2.5 py-0.5 font-semibold ${stageBadge.cls}`}>
                          {appStage === "hired" ? <CheckCircle2 className="w-3 h-3" /> : <Clock3 className="w-3 h-3" />}
                          {stageBadge.label}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />{job.location}
                        </span>
                      )}
                      {job.jobType && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />{JOB_TYPE_LABELS[job.jobType] || job.jobType}
                        </span>
                      )}
                      {(job.experienceMin != null || job.experienceMax != null) && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5" />{job.experienceMin ?? 0}–{job.experienceMax ?? "?"} yrs
                        </span>
                      )}
                      {job.positions > 1 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />{job.positions} openings
                        </span>
                      )}
                      {salary && <span className="font-semibold text-emerald-600">{salary}</span>}
                    </div>

                    {job.description && (
                      <p className="text-sm text-slate-500 line-clamp-2">{job.description}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-2">
                    {appStage ? (
                      <span className="hidden sm:block text-xs text-slate-400 font-medium">View Details</span>
                    ) : (
                      <span className="hidden sm:inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-xl group-hover:bg-blue-700 transition-colors">
                        Apply <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <ArrowRight className="sm:hidden w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
