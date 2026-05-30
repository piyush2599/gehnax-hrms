"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "sonner";
import {
  Calendar, Clock, User, Video, Phone, MapPin, Link2,
  Plus, Star, CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ── */
interface Interview {
  _id: string;
  round: number;
  type: string;
  scheduledAt: string;
  interviewer: string;
  location?: string;
  meetingLink?: string;
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
  feedback?: string;
  rating?: number;
  recommendation?: string;
  completedAt?: string;
}

interface Props {
  candidateId: string;
  interviews: Interview[];
  canManage: boolean;
  onUpdate: () => void;
}

/* ── Constants ── */
const TYPE_LABELS: Record<string, string> = {
  phone:      "Phone Screen",
  video:      "Video Interview",
  onsite:     "Onsite Interview",
  technical:  "Technical Round",
  hr_round:   "HR Round",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  phone:     <Phone className="w-3.5 h-3.5" />,
  video:     <Video className="w-3.5 h-3.5" />,
  onsite:    <MapPin className="w-3.5 h-3.5" />,
  technical: <Clock className="w-3.5 h-3.5" />,
  hr_round:  <User className="w-3.5 h-3.5" />,
};

const STATUS_STYLE: Record<string, string> = {
  scheduled:   "bg-blue-50 text-blue-700 border-blue-200",
  completed:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled:   "bg-red-50 text-red-600 border-red-200",
  rescheduled: "bg-amber-50 text-amber-700 border-amber-200",
};

const RECOMMENDATION_STYLE: Record<string, string> = {
  strong_hire: "bg-emerald-600 text-white",
  hire:        "bg-teal-500 text-white",
  hold:        "bg-amber-500 text-white",
  no_hire:     "bg-red-500 text-white",
};

const RECOMMENDATION_LABELS: Record<string, string> = {
  strong_hire: "Strong Hire",
  hire:        "Hire",
  hold:        "Hold",
  no_hire:     "No Hire",
};

function formatDateTime(dt: string) {
  const d = new Date(dt);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    + " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

/* ══════════════════════════════════════════════════════ */
export default function InterviewsTab({ candidateId, interviews: initialInterviews, canManage, onUpdate }: Props) {
  const [interviews, setInterviews] = useState<Interview[]>(initialInterviews);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    type: "phone",
    scheduledAt: "",
    interviewer: "",
    location: "",
    meetingLink: "",
    meetingInvite: "",
  });

  const nextRound = (interviews.filter(i => i.status !== "cancelled").length || 0) + 1;

  const refreshFromServer = async () => {
    const res = await fetch(`/api/hiring/candidates/${candidateId}/interviews`);
    if (res.ok) {
      const data = await res.json();
      setInterviews(data.interviews || []);
    }
    onUpdate();
  };

  const handleSchedule = async () => {
    if (!form.scheduledAt || !form.interviewer) {
      toast.error("Date/time and interviewer are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/hiring/candidates/${candidateId}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round: nextRound,
          type: form.type,
          scheduledAt: form.scheduledAt,
          interviewer: form.interviewer,
          location: form.location || undefined,
          meetingLink: form.meetingLink || undefined,
            meetingInvite: form.meetingInvite || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to schedule"); return; }
      toast.success("Interview scheduled");
      setForm({ type: "phone", scheduledAt: "", interviewer: "", location: "", meetingLink: "", meetingInvite: "" });
      setShowScheduleForm(false);
      await refreshFromServer();
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (interviewId: string, status: string) => {
    const res = await fetch(`/api/hiring/candidates/${candidateId}/interviews/${interviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Interview marked as ${status}`);
      await refreshFromServer();
    }
  };

  const handleDelete = async (interviewId: string) => {
    const res = await fetch(`/api/hiring/candidates/${candidateId}/interviews/${interviewId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Interview removed");
      await refreshFromServer();
    }
  };

  return (
    <div className="space-y-4">
      {/* Schedule button */}
      {canManage && !showScheduleForm && (
        <Button
          size="sm"
          onClick={() => setShowScheduleForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Schedule Interview
        </Button>
      )}

      {/* Schedule form */}
      {showScheduleForm && canManage && (
        <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/40 space-y-3">
          <p className="text-sm font-semibold text-slate-700">
            Schedule — Round {nextRound}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Interview Type</Label>
              <NativeSelect
                value={form.type}
                onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                className="h-8 text-sm"
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date & Time *</Label>
              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Interviewer Name *</Label>
              <Input
                value={form.interviewer}
                onChange={(e) => setForm(f => ({ ...f, interviewer: e.target.value }))}
                placeholder="e.g. Rahul Sharma"
                className="h-8 text-sm"
              />
            </div>
            {form.type === "onsite" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Location / Room</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Conference Room A"
                  className="h-8 text-sm"
                />
              </div>
            ) : form.type === "video" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Meeting Link</Label>
                <Input
                  value={form.meetingLink}
                  onChange={(e) => setForm(f => ({ ...f, meetingLink: e.target.value }))}
                  placeholder="https://meet.google.com/..."
                  className="h-8 text-sm"
                />
              </div>
            ) : null}
          </div>
          <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Meeting Invite Details <span className="text-slate-400">(optional — paste from Google Calendar / Outlook)</span></Label>
              <Textarea
                value={form.meetingInvite}
                onChange={(e) => setForm(f => ({ ...f, meetingInvite: e.target.value }))}
                rows={4}
                placeholder="Paste meeting invite details here — this will be included in the email sent to the candidate…"
                className="text-sm resize-none"
              />
            </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSchedule} loading={saving} className="gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
              {saving ? "Scheduling…" : "Confirm Schedule"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowScheduleForm(false)} className="border-slate-200">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Interview list */}
      {interviews.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">No interviews scheduled yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...interviews].sort((a, b) => a.round - b.round).map((interview) => (
            <InterviewCard
              key={interview._id}
              interview={interview}
              candidateId={candidateId}
              canManage={canManage}
              isEvaluating={evaluatingId === interview._id}
              onToggleEvaluate={() => setEvaluatingId(evaluatingId === interview._id ? null : interview._id)}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onUpdate={refreshFromServer}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Interview Card ── */
function InterviewCard({
  interview, candidateId, canManage, isEvaluating,
  onToggleEvaluate, onStatusChange, onDelete, onUpdate,
}: {
  interview: Interview;
  candidateId: string;
  canManage: boolean;
  isEvaluating: boolean;
  onToggleEvaluate: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onUpdate: () => void;
}) {
  const [evalForm, setEvalForm] = useState({
    rating: interview.rating || 0,
    recommendation: interview.recommendation || "",
    feedback: interview.feedback || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSaveEvaluation = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/hiring/candidates/${candidateId}/interviews/${interview._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          rating: evalForm.rating || undefined,
          recommendation: evalForm.recommendation || undefined,
          feedback: evalForm.feedback || undefined,
          completedAt: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        toast.success("Evaluation saved");
        onToggleEvaluate();
        onUpdate();
      } else {
        toast.error("Failed to save evaluation");
      }
    } finally {
      setSaving(false);
    }
  };

  const isCancelled = interview.status === "cancelled";

  return (
    <div className={cn(
      "border rounded-xl p-4 space-y-3 bg-white",
      isCancelled ? "border-slate-100 opacity-60" : "border-slate-200"
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
            {TYPE_ICONS[interview.type] || <Calendar className="w-3.5 h-3.5" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              Round {interview.round} · {TYPE_LABELS[interview.type] || interview.type}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(interview.scheduledAt)}</p>
          </div>
        </div>
        <Badge variant="outline" className={cn("text-xs flex-shrink-0 capitalize", STATUS_STYLE[interview.status])}>
          {interview.status}
        </Badge>
      </div>

      {/* Details */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {interview.interviewer}
        </span>
        {interview.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {interview.location}
          </span>
        )}
        {interview.meetingLink && (
          <a
            href={interview.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:underline"
          >
            <Link2 className="w-3 h-3" />
            Join Meeting
          </a>
        )}
      </div>

      {/* Evaluation summary (if completed) */}
      {interview.status === "completed" && (interview.rating || interview.recommendation || interview.feedback) && (
        <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {interview.rating && (
              <span className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("w-3 h-3", i < interview.rating! ? "fill-current" : "text-slate-200")} />
                ))}
                <span className="text-slate-600 ml-0.5">{interview.rating}/5</span>
              </span>
            )}
            {interview.recommendation && (
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", RECOMMENDATION_STYLE[interview.recommendation])}>
                {RECOMMENDATION_LABELS[interview.recommendation]}
              </span>
            )}
          </div>
          {interview.feedback && (
            <p className="text-slate-600 italic">&ldquo;{interview.feedback}&rdquo;</p>
          )}
        </div>
      )}

      {/* Evaluation form (inline expansion) */}
      {isEvaluating && interview.status !== "cancelled" && (
        <div className="border-t border-slate-100 pt-3 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Evaluation</p>

          {/* Star rating */}
          <div className="space-y-1.5">
            <Label className="text-xs">Overall Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setEvalForm(f => ({ ...f, rating: star }))}
                  className="text-amber-400 hover:scale-110 transition-transform"
                >
                  <Star className={cn("w-5 h-5", star <= evalForm.rating ? "fill-current" : "text-slate-200")} />
                </button>
              ))}
            </div>
          </div>

          {/* Recommendation */}
          <div className="space-y-1.5">
            <Label className="text-xs">Recommendation</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(RECOMMENDATION_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEvalForm(f => ({ ...f, recommendation: value }))}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                    evalForm.recommendation === value
                      ? RECOMMENDATION_STYLE[value]
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-1.5">
            <Label className="text-xs">Feedback / Notes</Label>
            <Textarea
              value={evalForm.feedback}
              onChange={(e) => setEvalForm(f => ({ ...f, feedback: e.target.value }))}
              rows={3}
              placeholder="Detailed feedback about the candidate…"
              className="text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEvaluation} loading={saving} variant="success" className="gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {saving ? "Saving…" : "Save Evaluation"}
            </Button>
            <Button size="sm" variant="outline" onClick={onToggleEvaluate} className="border-slate-200">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      {canManage && !isCancelled && (
        <div className="flex flex-wrap gap-2 border-t border-slate-50 pt-2">
          {interview.status === "scheduled" && (
            <>
              <button
                onClick={onToggleEvaluate}
                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {isEvaluating
                  ? <><ChevronUp className="w-3 h-3" /> Hide Evaluation</>
                  : <><CheckCircle2 className="w-3 h-3" /> Mark Complete</>
                }
              </button>
              <button
                onClick={() => onStatusChange(interview._id, "rescheduled")}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
              >
                <RefreshCw className="w-3 h-3" /> Reschedule
              </button>
              <button
                onClick={() => onStatusChange(interview._id, "cancelled")}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium"
              >
                <XCircle className="w-3 h-3" /> Cancel
              </button>
            </>
          )}
          {interview.status === "rescheduled" && (
            <button
              onClick={onToggleEvaluate}
              className="flex items-center gap-1 text-xs text-emerald-600 font-medium"
            >
              <CheckCircle2 className="w-3 h-3" /> Mark Complete
            </button>
          )}
          {interview.status === "completed" && (
            <button
              onClick={onToggleEvaluate}
              className="flex items-center gap-1 text-xs text-blue-600 font-medium"
            >
              {isEvaluating ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {isEvaluating ? "Hide" : "Edit Evaluation"}
            </button>
          )}
          <button
            onClick={() => onDelete(interview._id)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 font-medium ml-auto"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
