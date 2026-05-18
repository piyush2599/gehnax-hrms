import { Metadata } from "next";
import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import JobPosting from "@/models/JobPosting";
import "@/models/Department";
import { MapPin, Briefcase, Clock, Users, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Careers — Gehnax Technologies LLP" };

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

export default async function JobsPage() {
  await connectDB();
  const jobs = await JobPosting.find({ status: "open" })
    .populate("department", "name")
    .sort({ createdAt: -1 })
    .lean();

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
          We're building something great at Gehnax Technologies. Explore open roles and apply directly — we'd love to hear from you.
        </p>
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-emerald-700">{jobs.length} open position{jobs.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Job list */}
      {jobs.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">No open positions right now</p>
          <p className="text-slate-400 text-sm mt-1">Check back soon — we're always growing.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job: any) => {
            const salary = formatSalary(job.salaryMin, job.salaryMax);
            return (
              <Link
                key={job._id.toString()}
                href={`/jobs/${job._id}`}
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
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {job.location}
                        </span>
                      )}
                      {job.jobType && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                        </span>
                      )}
                      {(job.experienceMin != null || job.experienceMax != null) && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5" />
                          {job.experienceMin ?? 0}–{job.experienceMax ?? "?"} yrs
                        </span>
                      )}
                      {job.positions > 1 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {job.positions} openings
                        </span>
                      )}
                      {salary && (
                        <span className="font-semibold text-emerald-600">{salary}</span>
                      )}
                    </div>

                    {job.description && (
                      <p className="text-sm text-slate-500 line-clamp-2">{job.description}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-2">
                    <span className="hidden sm:inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-xl group-hover:bg-blue-700 transition-colors">
                      Apply <ArrowRight className="w-3.5 h-3.5" />
                    </span>
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
