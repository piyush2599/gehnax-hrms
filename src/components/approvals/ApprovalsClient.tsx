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
import { FileText, Check, X, Eye, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";

const fetcher = (u: string) => fetch(u).then(r => r.json());

export default function ApprovalsClient() {
  const { data, isLoading } = useSWR("/api/approvals", fetcher);
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
      toast.success(reviewing.action === "approve" ? "Offer approved and emailed to candidate" : "Offer sent back to HR for revision");
      setReviewing(null);
      setComments("");
      mutate("/api/approvals");
    } finally { setLoading(false); }
  };

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
    </div>
  );

  if (offers.length === 0) return (
    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500 font-medium">No offers pending approval</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{offers.length} offer{offers.length !== 1 ? "s" : ""} awaiting your review</p>

      {offers.map((c: any) => (
        <div key={c._id} className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="font-semibold text-slate-800 text-lg">{c.firstName} {c.lastName}</p>
              <p className="text-sm text-slate-500">{c.email}</p>
              <p className="text-sm text-slate-600 mt-1">
                {c.jobPosting?.title || "—"} · <span className="font-medium">{c.offer?.designation || "—"}</span>
              </p>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex-shrink-0">
              Pending Approval
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
            <Stat label="CTC" value={c.offer?.ctcAnnual ? `₹${(c.offer.ctcAnnual / 100000).toFixed(2)} LPA` : "—"} />
            <Stat label="Joining Date" value={c.offer?.joiningDate ? formatDate(c.offer.joiningDate) : "—"} />
            <Stat label="Ref #" value={c.offer?.offerRefNumber || "—"} />
            <Stat label="Submitted" value={c.offer?.generatedAt ? formatDate(c.offer.generatedAt) : "—"} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {c.offer?.offerPdfUrl && (
              <a href={c.offer.offerPdfUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5 border-slate-200">
                  <Eye className="w-3.5 h-3.5" />
                  Preview Offer
                </Button>
              </a>
            )}
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              onClick={() => { setReviewing({ candidate: c, action: "approve" }); setComments(""); }}
            >
              <Check className="w-3.5 h-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
              onClick={() => { setReviewing({ candidate: c, action: "reject" }); setComments(""); }}
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </Button>
          </div>
        </div>
      ))}

      {reviewing && (
        <AlertDialog open onOpenChange={() => setReviewing(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {reviewing.action === "approve" ? "Approve Offer" : "Reject Offer"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {reviewing.action === "approve"
                  ? `Approving will email the offer letter to ${reviewing.candidate.firstName} ${reviewing.candidate.lastName} (${reviewing.candidate.email}).`
                  : "Rejecting will send the offer back to HR Admin for revision."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="px-6 -mt-2 space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                {reviewing.action === "approve" ? "Comments (optional)" : "Reason for rejection *"}
              </label>
              <Textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder={reviewing.action === "approve" ? "Any notes for the candidate…" : "What needs to be changed?"}
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReview}
                disabled={loading || (reviewing.action === "reject" && !comments.trim())}
                className={reviewing.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
              >
                {loading ? "Processing…" : reviewing.action === "approve" ? "Approve & Send Email" : "Reject & Return to HR"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-700 truncate">{value}</p>
    </div>
  );
}
