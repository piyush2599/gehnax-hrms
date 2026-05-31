"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { FileText, Check, X, Eye, Clock, RefreshCw, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { format } from "date-fns";

const fetcher = (u: string) => fetch(u).then(r => r.json());

const TABS = ["offers", "leaves", "regularization"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  offers: "Offer Approvals",
  leaves: "Leave Requests",
  regularization: "Attendance Regularization",
};

export default function ApprovalsClient() {
  const [activeTab, setActiveTab] = useState<Tab>("offers");

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {activeTab === "offers"         && <OfferApprovals />}
      {activeTab === "leaves"         && <LeaveApprovals />}
      {activeTab === "regularization" && <RegularizationApprovals />}
    </div>
  );
}

/* ── Offer Approvals ── */
function OfferApprovals() {
  const { data, isLoading } = useSWR("/api/approvals?type=offers", fetcher);
  const offers: any[] = data?.offers ?? [];
  const [reviewing, setReviewing] = useState<{ candidate: any; action: "approve" | "reject" } | null>(null);
  const [comments, setComments]   = useState("");
  const [loading, setLoading]     = useState(false);

  const handleReview = async () => {
    if (!reviewing) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hiring/candidates/${reviewing.candidate._id}/offer/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: reviewing.action, comments }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); return; }
      toast.success(reviewing.action === "approve" ? "Offer approved — email sent to candidate" : "Offer returned to HR for revision");
      setReviewing(null); setComments("");
      mutate("/api/approvals?type=offers");
    } finally { setLoading(false); }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (offers.length === 0) return <EmptyState icon={<FileText />} text="No offers pending approval" />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{offers.length} offer{offers.length !== 1 ? "s" : ""} awaiting review</p>
      {offers.map((c: any) => (
        <div key={c._id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-800">{c.firstName} {c.lastName}</p>
              <p className="text-sm text-slate-500">{c.email} · {c.jobPosting?.title || "—"}</p>
              <p className="text-sm text-slate-600 mt-1">Designation: <strong>{c.offer?.designation || "—"}</strong> · CTC: <strong>{c.offer?.ctcAnnual ? `₹${(c.offer.ctcAnnual/100000).toFixed(2)} LPA` : "—"}</strong></p>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex-shrink-0">Pending Approval</Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {c.offer?.offerPdfUrl && (
              <a href={c.offer.offerPdfUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5 border-slate-200"><Eye className="w-3.5 h-3.5" />Preview</Button>
              </a>
            )}
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={() => { setReviewing({ candidate: c, action: "approve" }); setComments(""); }}>
              <Check className="w-3.5 h-3.5" />Approve
            </Button>
            <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5" onClick={() => { setReviewing({ candidate: c, action: "reject" }); setComments(""); }}>
              <X className="w-3.5 h-3.5" />Reject
            </Button>
          </div>
        </div>
      ))}
      {reviewing && (
        <AlertDialog open onOpenChange={() => setReviewing(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{reviewing.action === "approve" ? "Approve Offer" : "Reject Offer"}</AlertDialogTitle>
              <AlertDialogDescription>
                {reviewing.action === "approve"
                  ? `Approving will email the offer to ${reviewing.candidate.firstName} ${reviewing.candidate.lastName}.`
                  : "Rejecting will return the offer to HR Admin for revision."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="px-6 -mt-2 space-y-1.5">
              <label className="text-sm font-medium text-slate-700">{reviewing.action === "approve" ? "Comments (optional)" : "Reason for rejection *"}</label>
              <Textarea value={comments} onChange={e => setComments(e.target.value)} placeholder={reviewing.action === "approve" ? "Any notes…" : "What needs to change?"} rows={3} />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReview} disabled={loading || (reviewing.action === "reject" && !comments.trim())}
                className={reviewing.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}>
                {loading ? "Processing…" : reviewing.action === "approve" ? "Approve & Send Email" : "Reject & Return to HR"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

/* ── Leave Approvals ── */
function LeaveApprovals() {
  const { data, isLoading } = useSWR("/api/leaves?status=pending", fetcher);
  const leaves: any[] = Array.isArray(data) ? data : [];
  const [reviewing, setReviewing] = useState<{ leave: any; action: "approved" | "rejected" } | null>(null);
  const [comments, setComments]   = useState("");
  const [loading, setLoading]     = useState(false);

  const handleReview = async () => {
    if (!reviewing) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leaves/${reviewing.leave._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: reviewing.action, reviewComments: comments }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); return; }
      toast.success(`Leave ${reviewing.action}`);
      setReviewing(null); setComments("");
      mutate("/api/leaves?status=pending");
    } finally { setLoading(false); }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (leaves.length === 0) return <EmptyState icon={<Calendar />} text="No pending leave requests" />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{leaves.length} leave request{leaves.length !== 1 ? "s" : ""} pending</p>
      {leaves.map((leave: any) => (
        <div key={leave._id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-800">{leave.employeeId?.firstName} {leave.employeeId?.lastName}
                <span className="text-slate-400 font-normal text-sm ml-2">({leave.employeeId?.employeeCode})</span>
              </p>
              <p className="text-sm text-slate-500 mt-0.5">{formatDate(leave.startDate)} → {formatDate(leave.endDate)} · <strong>{leave.totalDays} day{leave.totalDays !== 1 ? "s" : ""}</strong></p>
              <p className="text-sm text-slate-500 italic mt-0.5">&ldquo;{leave.reason}&rdquo;</p>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex-shrink-0">Pending</Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={() => { setReviewing({ leave, action: "approved" }); setComments(""); }}>
              <Check className="w-3.5 h-3.5" />Approve
            </Button>
            <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5" onClick={() => { setReviewing({ leave, action: "rejected" }); setComments(""); }}>
              <X className="w-3.5 h-3.5" />Reject
            </Button>
          </div>
        </div>
      ))}
      {reviewing && (
        <AlertDialog open onOpenChange={() => setReviewing(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{reviewing.action === "approved" ? "Approve Leave" : "Reject Leave"}</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="px-6 space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Comments (optional)</label>
              <Textarea value={comments} onChange={e => setComments(e.target.value)} rows={2} placeholder="Any notes for the employee…" />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReview} disabled={loading}
                className={reviewing.action === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}>
                {loading ? "Processing…" : reviewing.action === "approved" ? "Approve" : "Reject"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

/* ── Regularization Approvals ── */
function RegularizationApprovals() {
  const { data, isLoading } = useSWR("/api/attendance/regularize?status=pending", fetcher);
  const requests: any[] = data?.requests ?? [];
  const [reviewing, setReviewing] = useState<{ req: any; action: "approve" | "reject" } | null>(null);
  const [comments, setComments]   = useState("");
  const [loading, setLoading]     = useState(false);

  const handleReview = async () => {
    if (!reviewing) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/regularize/${reviewing.req._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: reviewing.action, reviewComments: comments }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); return; }
      toast.success(reviewing.action === "approve" ? "Regularization approved — attendance updated" : "Request rejected");
      setReviewing(null); setComments("");
      mutate("/api/attendance/regularize?status=pending");
    } finally { setLoading(false); }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (requests.length === 0) return <EmptyState icon={<RefreshCw />} text="No pending regularization requests" />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{requests.length} request{requests.length !== 1 ? "s" : ""} pending</p>
      {requests.map((req: any) => (
        <div key={req._id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-800">{req.employeeId?.firstName} {req.employeeId?.lastName}
                <span className="text-slate-400 font-normal text-sm ml-2">({req.employeeId?.employeeCode})</span>
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                Date: <strong>{format(new Date(req.date), "EEE, MMM d yyyy")}</strong>
              </p>
              <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                <span>Check-in: <strong className="font-mono">{req.requestedCheckIn}</strong></span>
                <span>Check-out: <strong className="font-mono">{req.requestedCheckOut}</strong></span>
              </div>
              <p className="text-sm text-slate-500 italic mt-1">&ldquo;{req.reason}&rdquo;</p>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex-shrink-0">Pending</Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={() => { setReviewing({ req, action: "approve" }); setComments(""); }}>
              <Check className="w-3.5 h-3.5" />Approve
            </Button>
            <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5" onClick={() => { setReviewing({ req, action: "reject" }); setComments(""); }}>
              <X className="w-3.5 h-3.5" />Reject
            </Button>
          </div>
        </div>
      ))}
      {reviewing && (
        <AlertDialog open onOpenChange={() => setReviewing(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{reviewing.action === "approve" ? "Approve Regularization" : "Reject Regularization"}</AlertDialogTitle>
              <AlertDialogDescription>
                {reviewing.action === "approve"
                  ? "Approving will update the employee's attendance record for this day."
                  : "The employee will be notified that their request was rejected."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="px-6 -mt-2 space-y-1.5">
              <label className="text-sm font-medium text-slate-700">{reviewing.action === "approve" ? "Comments (optional)" : "Reason for rejection *"}</label>
              <Textarea value={comments} onChange={e => setComments(e.target.value)} rows={2} placeholder={reviewing.action === "approve" ? "Any notes…" : "Reason for rejection…"} />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReview} disabled={loading || (reviewing.action === "reject" && !comments.trim())}
                className={reviewing.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}>
                {loading ? "Processing…" : reviewing.action === "approve" ? "Approve & Update Attendance" : "Reject"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>;
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
      <div className="w-12 h-12 text-slate-300 mx-auto mb-3">{icon}</div>
      <p className="text-slate-500 font-medium">{text}</p>
    </div>
  );
}
