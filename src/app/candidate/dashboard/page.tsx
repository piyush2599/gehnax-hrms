"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, FileText, LogOut, Download, Clock, CheckCircle2, XCircle, ChevronRight } from "lucide-react";

function offerDownloadUrl(url: string, firstName: string, lastName: string): string {
  if (!url) return "";
  const safeName = `Offer-Letter-${firstName}-${lastName}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "_");
  return url.replace(/\/upload\/(?:v\d+\/)?/, (m) =>
    m.replace("/upload/", `/upload/fl_attachment:${safeName}/`)
  );
}

const STAGE_LABEL: Record<string, string> = {
  applied:   "Applied",
  screening: "Screening",
  interview: "Interview",
  offer:     "Offer",
  hired:     "Hired",
  rejected:  "Rejected",
};

const STAGE_COLOR: Record<string, string> = {
  applied:   "bg-slate-100 text-slate-600",
  screening: "bg-blue-100 text-blue-700",
  interview: "bg-violet-100 text-violet-700",
  offer:     "bg-amber-100 text-amber-700",
  hired:     "bg-emerald-100 text-emerald-700",
  rejected:  "bg-red-100 text-red-600",
};

const APPROVAL_BADGE: Record<string, { label: string; cls: string }> = {
  pending_approval: { label: "Offer Pending Approval", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  approved:         { label: "Offer Approved",          cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  rejected:         { label: "Offer Under Review",      cls: "bg-red-50 text-red-600 border border-red-200" },
};

export default function CandidateDashboard() {
  const router = useRouter();
  const [account, setAccount]   = useState<any>(null);
  const [apps, setApps]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      const [meRes, appsRes] = await Promise.all([
        fetch("/api/candidate/me"),
        fetch("/api/candidate/applications"),
      ]);
      if (!meRes.ok) { router.replace("/candidate-login"); return; }
      setAccount((await meRes.json()).account);
      if (appsRes.ok) setApps((await appsRes.json()).applications || []);
      setLoading(false);
    }
    load();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/candidate/logout", { method: "POST" });
    toast.success("Signed out");
    router.push("/candidate-login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://www.gehnax.com/Gehnax-logo.png" alt="Gehnax" className="h-8" />
            <span className="text-sm font-semibold text-slate-700">Candidate Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 hidden sm:block">
              {account?.firstName} {account?.lastName}
            </span>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
          <h1 className="text-xl font-bold mb-1">Welcome, {account?.firstName}!</h1>
          <p className="text-blue-100 text-sm">Track your applications and offers at Gehnax Technologies.</p>
          <a href="/jobs" className="inline-flex items-center gap-1.5 mt-4 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <Briefcase className="w-4 h-4" />
            Browse Open Positions
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Applications */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4">My Applications</h2>

          {apps.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No applications yet</p>
              <p className="text-slate-400 text-sm mt-1">Browse open positions and apply to get started.</p>
              <a href="/jobs" className="inline-block mt-4 bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                View Jobs
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {apps.map((app: any) => {
                const approval = app.offer?.approvalStatus;
                const badge = approval && approval !== "draft" ? APPROVAL_BADGE[approval] : null;
                return (
                  <div key={app._id} className="bg-white rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">
                          {app.jobPosting?.title || "Position"}
                        </p>
                        <p className="text-sm text-slate-500 mt-0.5">
                          Applied {new Date(app.appliedOn || app.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${STAGE_COLOR[app.stage] || "bg-slate-100 text-slate-600"}`}>
                        {STAGE_LABEL[app.stage] || app.stage}
                      </span>
                    </div>

                    {/* Pipeline */}
                    <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1">
                      {["applied","screening","interview","offer","hired"].map((s, i, arr) => {
                        const stages = ["applied","screening","interview","offer","hired"];
                        const currentIdx = stages.indexOf(app.stage);
                        const stepIdx = stages.indexOf(s);
                        const done = stepIdx < currentIdx || app.stage === s;
                        const active = app.stage === s;
                        return (
                          <div key={s} className="flex items-center gap-1 flex-shrink-0">
                            <div className={`w-2 h-2 rounded-full ${active ? "bg-blue-600 ring-2 ring-blue-200" : done ? "bg-emerald-500" : "bg-slate-200"}`} />
                            <span className={`text-[10px] font-medium ${active ? "text-blue-600" : done ? "text-emerald-600" : "text-slate-400"}`}>
                              {STAGE_LABEL[s]}
                            </span>
                            {i < arr.length - 1 && <div className={`w-6 h-px mx-0.5 ${stepIdx < currentIdx ? "bg-emerald-300" : "bg-slate-200"}`} />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Offer badge + download */}
                    {badge && (
                      <div className={`flex items-center justify-between mt-3 px-3 py-2 rounded-xl text-xs font-semibold ${badge.cls}`}>
                        <div className="flex items-center gap-1.5">
                          {approval === "approved"
                            ? <CheckCircle2 className="w-3.5 h-3.5" />
                            : approval === "rejected"
                            ? <XCircle className="w-3.5 h-3.5" />
                            : <Clock className="w-3.5 h-3.5" />}
                          {badge.label}
                        </div>
                        {approval === "approved" && app.offer?.offerPdfUrl && (
                          <a href={offerDownloadUrl(app.offer.offerPdfUrl, account?.firstName || "", account?.lastName || "")} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-emerald-700 hover:underline font-semibold">
                            <Download className="w-3.5 h-3.5" />
                            Download Offer
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
