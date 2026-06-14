"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "sonner";
import {
  Pencil, Trash2, Phone, Mail, TrendingUp, Plus,
  Clock, PhoneCall, MailOpen, CalendarDays, StickyNote, CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STAGES, STAGE_COLORS, STAGE_PROBABILITY, PRIORITY_STYLES,
  SOURCE_LABELS, fmt, fmtCompact, fmtDate, fmtShortDate,
} from "./constants";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const ACTIVITY_ICONS: Record<string, any> = {
  call: PhoneCall, email: MailOpen, meeting: CalendarDays,
  note: StickyNote, task: CheckSquare,
};

function InfoItem({ label, value }: { label: string; value?: any }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <div className="text-sm text-slate-800 font-medium">{value}</div>
    </div>
  );
}

interface Props {
  leadId: string | null;
  onClose: () => void;
  onUpdate: () => void;
  canWrite: boolean;
  onEdit: (lead: any) => void;
  onDelete?: (id: string) => void;
}

export default function LeadDetailPanel({ leadId, onClose, onUpdate, canWrite, onEdit, onDelete }: Props) {
  const { data, isLoading, mutate } = useSWR(
    leadId ? `/api/crm/leads/${leadId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  const lead = data?.lead;

  const [tab, setTab] = useState<"overview" | "activities" | "history">("overview");
  const [stageSaving, setStageSaving] = useState(false);

  const [showActivityForm, setShowActivityForm] = useState(false);
  const [actType, setActType]       = useState("call");
  const [actTitle, setActTitle]     = useState("");
  const [actDesc, setActDesc]       = useState("");
  const [actOutcome, setActOutcome] = useState("");
  const [actLoading, setActLoading] = useState(false);

  const handleStageChange = async (newStage: string) => {
    setStageSaving(true);
    try {
      const prob = STAGE_PROBABILITY[newStage] ?? lead?.probability ?? 10;
      const res = await fetch(`/api/crm/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage, probability: prob }),
      });
      if (res.ok) { mutate(); onUpdate(); toast.success("Stage updated"); }
      else toast.error("Failed to update stage");
    } finally {
      setStageSaving(false);
    }
  };

  const handleLogActivity = async () => {
    if (!actTitle.trim()) { toast.error("Activity title is required"); return; }
    setActLoading(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: actType, title: actTitle.trim(), description: actDesc.trim(), outcome: actOutcome.trim() }),
      });
      if (res.ok) {
        mutate();
        setShowActivityForm(false);
        setActTitle(""); setActDesc(""); setActOutcome("");
        toast.success("Activity logged");
      } else toast.error("Failed to log activity");
    } finally {
      setActLoading(false);
    }
  };

  return (
    <Sheet open={!!leadId} onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        showCloseButton={true}
        className="data-[side=right]:sm:max-w-[560px] p-0 flex flex-col bg-white overflow-hidden"
      >
        {isLoading || !lead ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            {isLoading ? "Loading..." : "Lead not found"}
          </div>
        ) : (
          <>
            {/* ─── Header ─── */}
            <div className="flex-shrink-0 border-b border-slate-200 px-5 pt-5 pb-4 pr-12">
              {/* Stage badge + lead# + action buttons */}
              <div className="flex items-center gap-2 mb-2.5">
                {(() => {
                  const sc = STAGE_COLORS[lead.stage] ?? STAGE_COLORS.new;
                  return (
                    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border", sc.bg, sc.text, sc.border)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", sc.dot)} />
                      {STAGES.find(s => s.id === lead.stage)?.label}
                    </span>
                  );
                })()}
                <span className="text-xs text-slate-400 font-mono">{lead.leadNumber}</span>
                <div className="ml-auto flex gap-1">
                  {canWrite && (
                    <button onClick={() => onEdit(lead)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(lead._id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Title + account */}
              <h2 className="text-[17px] font-bold text-slate-900 leading-snug">{lead.title}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{lead.accountName}</p>

              {/* Value + probability */}
              <div className="flex items-end gap-5 mt-3">
                <div>
                  <p className="text-[11px] text-slate-400 mb-0.5">Deal value</p>
                  <p className="text-2xl font-bold text-slate-900" title={fmt(lead.value)}>{fmtCompact(lead.value)}</p>
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] text-slate-400">Win probability</p>
                    <p className={cn("text-sm font-bold",
                      lead.probability >= 70 ? "text-emerald-600" :
                      lead.probability >= 40 ? "text-blue-600" : "text-amber-600"
                    )}>
                      {lead.probability}%
                    </p>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all",
                        lead.probability >= 70 ? "bg-emerald-500" :
                        lead.probability >= 40 ? "bg-blue-500" : "bg-amber-500"
                      )}
                      style={{ width: `${lead.probability}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Stage mover */}
              <div className="mt-3.5">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Move to stage</p>
                <div className="flex flex-wrap gap-1">
                  {STAGES.map(s => {
                    const sc = STAGE_COLORS[s.id];
                    const isCurrent = lead.stage === s.id;
                    const isWon  = s.id === "won";
                    const isLost = s.id === "lost";
                    return (
                      <button
                        key={s.id}
                        onClick={() => !isCurrent && handleStageChange(s.id)}
                        disabled={stageSaving || isCurrent}
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-lg border font-medium transition-all",
                          isCurrent
                            ? cn(sc.bg, sc.text, sc.border)
                            : isWon
                              ? "bg-white text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                              : isLost
                                ? "bg-white text-slate-500 border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                        )}
                      >
                        {s.label}{isWon ? " ✓" : isLost ? " ✗" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── Tabs ─── */}
            <div className="flex-shrink-0 border-b border-slate-200 bg-white">
              <div className="flex px-5">
                {(["overview","activities","history"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "px-4 py-2.5 text-sm font-medium border-b-2 capitalize transition-colors",
                      tab === t
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {t}
                    {t === "activities" && lead.activities?.length > 0 && (
                      <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-600 font-bold px-1.5 py-0.5 rounded-full">
                        {lead.activities.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── Tab Content ─── */}
            <div className="flex-1 overflow-y-auto">

              {/* Overview */}
              {tab === "overview" && (
                <div className="p-5 space-y-5">
                  {/* Contact */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Contact Person</p>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {lead.contactName.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{lead.contactName}</p>
                        {lead.contactDesignation && (
                          <p className="text-xs text-slate-500">{lead.contactDesignation}</p>
                        )}
                        <div className="flex flex-col gap-1 mt-1.5">
                          {lead.contactEmail && (
                            <a href={`mailto:${lead.contactEmail}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 transition-colors">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />{lead.contactEmail}
                            </a>
                          )}
                          {lead.contactPhone && (
                            <a href={`tel:${lead.contactPhone}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 transition-colors">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />{lead.contactPhone}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Deal Details */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Deal Details</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <InfoItem label="Priority"
                        value={
                          <span className={cn("text-xs font-bold uppercase px-2 py-0.5 rounded", PRIORITY_STYLES[lead.priority]?.bg, PRIORITY_STYLES[lead.priority]?.text)}>
                            {lead.priority}
                          </span>
                        }
                      />
                      <InfoItem label="Source" value={SOURCE_LABELS[lead.source] ?? lead.source} />
                      <InfoItem label="Expected Close" value={lead.expectedCloseDate ? fmtDate(lead.expectedCloseDate) : undefined} />
                      <InfoItem label="Actual Close" value={lead.actualCloseDate ? fmtDate(lead.actualCloseDate) : undefined} />
                      <InfoItem label="Product / Service" value={lead.product} />
                      <InfoItem label="Assigned To" value={lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : undefined} />
                      <InfoItem label="Created By" value={lead.createdBy?.name} />
                      <InfoItem label="Created"
                        value={lead.createdAt ? fmtDate(lead.createdAt) : undefined}
                      />
                    </div>
                    {lead.lossReason && (
                      <div className="mt-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-red-500 uppercase tracking-wide font-bold mb-0.5">Loss Reason</p>
                        <p className="text-sm text-red-800">{lead.lossReason}</p>
                      </div>
                    )}
                  </div>

                  {lead.description && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Description</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{lead.description}</p>
                    </div>
                  )}

                  {lead.notes && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Internal Notes</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap bg-amber-50 border border-amber-100 rounded-xl p-3 leading-relaxed">{lead.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Activities */}
              {tab === "activities" && (
                <div className="p-5">
                  {canWrite && (
                    <div className="mb-4">
                      {!showActivityForm ? (
                        <button
                          onClick={() => setShowActivityForm(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" /> Log Activity
                        </button>
                      ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Type</Label>
                              <NativeSelect value={actType} onChange={e => setActType(e.target.value)}>
                                <option value="call">Phone Call</option>
                                <option value="email">Email</option>
                                <option value="meeting">Meeting</option>
                                <option value="note">Note</option>
                                <option value="task">Task</option>
                              </NativeSelect>
                            </div>
                            <div>
                              <Label className="text-xs">Title *</Label>
                              <Input value={actTitle} onChange={e => setActTitle(e.target.value)} placeholder="e.g. Discovery call" />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Description</Label>
                            <Textarea value={actDesc} onChange={e => setActDesc(e.target.value)} placeholder="What was discussed?" rows={2} />
                          </div>
                          <div>
                            <Label className="text-xs">Outcome</Label>
                            <Input value={actOutcome} onChange={e => setActOutcome(e.target.value)} placeholder="What was the result?" />
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            <Button variant="outline" size="sm" onClick={() => { setShowActivityForm(false); setActTitle(""); setActDesc(""); setActOutcome(""); }}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleLogActivity} disabled={actLoading}>
                              {actLoading ? "Saving..." : "Log Activity"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!lead.activities?.length ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                      <Clock className="w-9 h-9 text-slate-200 mb-2" />
                      <p className="text-slate-400 text-sm">No activities logged yet</p>
                      <p className="text-slate-300 text-xs mt-0.5">Log a call, email, or meeting to track progress</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {[...lead.activities].reverse().map((act: any) => {
                        const Icon = ACTIVITY_ICONS[act.type] ?? StickyNote;
                        return (
                          <div key={act._id} className="flex gap-3 pb-4 last:pb-0">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-4 h-4 text-blue-500" />
                              </div>
                              <div className="w-px flex-1 bg-slate-100 mt-1" />
                            </div>
                            <div className="flex-1 pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900">{act.title}</p>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap mt-0.5">
                                  {fmtShortDate(act.createdAt)}
                                </span>
                              </div>
                              <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{act.type}</span>
                              {act.description && (
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{act.description}</p>
                              )}
                              {act.outcome && (
                                <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5">
                                  <span className="font-medium">Outcome:</span> {act.outcome}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Stage History */}
              {tab === "history" && (
                <div className="p-5">
                  {!lead.stageHistory?.length ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                      <TrendingUp className="w-9 h-9 text-slate-200 mb-2" />
                      <p className="text-slate-400 text-sm">No stage history yet</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {[...lead.stageHistory].reverse().map((h: any, i: number) => {
                        const sc = STAGE_COLORS[h.stage] ?? STAGE_COLORS.new;
                        const stageMeta = STAGES.find(s => s.id === h.stage);
                        return (
                          <div key={h._id ?? i} className="flex gap-3 pb-4 last:pb-0">
                            <div className="flex flex-col items-center">
                              <span className={cn("w-3 h-3 rounded-full flex-shrink-0 mt-1 border-2 border-white ring-2", sc.dot.replace("bg-", "ring-"))} />
                              <div className="w-px flex-1 bg-slate-100 mt-1" />
                            </div>
                            <div className="flex-1 pb-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border", sc.bg, sc.text, sc.border)}>
                                  {stageMeta?.label ?? h.stage}
                                </span>
                                <span className="text-[10px] text-slate-400">{fmtDate(h.changedAt)}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">Win probability: <span className="font-semibold text-slate-700">{h.probability}%</span></p>
                              {h.changedBy?.name && (
                                <p className="text-[10px] text-slate-400 mt-0.5">by {h.changedBy.name}</p>
                              )}
                              {h.note && (
                                <p className="text-xs text-slate-600 italic mt-1 bg-slate-50 rounded px-2 py-1">"{h.note}"</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
