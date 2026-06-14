"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "sonner";
import {
  Target, Briefcase, Building2, Package, User, Tag, Mail, Phone,
  TrendingUp, ListChecks, Plus, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES, STAGE_COLORS, STAGE_PROBABILITY, PRIORITY_STYLES, fmtCompact } from "./constants";

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface Props {
  open: boolean;
  editData?: any;
  initialStage?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const BLANK = {
  title: "", accountName: "", contactName: "", contactEmail: "",
  contactPhone: "", contactDesignation: "", value: "0",
  stage: "new", probability: 10, source: "other", priority: "medium",
  product: "", description: "", assignedTo: "",
  expectedCloseDate: "", lossReason: "", notes: "",
};

// ─── Small building blocks ─────────────────────────────────────────────────

function SectionCard({
  icon: Icon, iconBg, iconColor, title, children,
}: {
  icon: any; iconBg: string; iconColor: string; title: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-center gap-2 mb-3.5">
        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
          <Icon className={cn("w-3.5 h-3.5", iconColor)} />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function IconInput({ icon: Icon, className, ...props }: { icon: any } & React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <Input className={cn("pl-9", className)} {...props} />
    </div>
  );
}

function FieldError({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return <p className="text-[11px] text-red-500 font-medium mt-1">{message}</p>;
}

function StagePills({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STAGES.map(s => {
        const sc = STAGE_COLORS[s.id];
        const active = value === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all",
              active
                ? cn(sc.bg, sc.text, "border-current shadow-sm")
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", active ? sc.dot : "bg-slate-300")} />
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

const PRIORITY_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "urgent", label: "Urgent" },
];

function PriorityPills({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {PRIORITY_OPTIONS.map(o => {
        const ps = PRIORITY_STYLES[o.id];
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "text-[10px] font-bold uppercase tracking-wide px-2 py-1.5 rounded-lg border transition-all",
              active
                ? cn(ps.bg, ps.text, "border-current shadow-sm")
                : "bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function LeadFormDialog({ open, editData, initialStage = "new", onSuccess, onCancel }: Props) {
  const isEdit = !!editData;

  const { data: employees } = useSWR("/api/employees", fetcher);
  const empList: any[] = Array.isArray(employees) ? employees : (employees?.employees ?? []);

  const [f, setF] = useState({ ...BLANK, stage: initialStage, probability: STAGE_PROBABILITY[initialStage] ?? 10 });
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const set = (key: string, val: any) => setF(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    setAttempted(false);
    if (editData) {
      setF({
        title:              editData.title              ?? "",
        accountName:        editData.accountName        ?? "",
        contactName:        editData.contactName        ?? "",
        contactEmail:       editData.contactEmail       ?? "",
        contactPhone:       editData.contactPhone       ?? "",
        contactDesignation: editData.contactDesignation ?? "",
        value:              String(editData.value       ?? 0),
        stage:              editData.stage              ?? "new",
        probability:        editData.probability        ?? STAGE_PROBABILITY[editData.stage] ?? 10,
        source:             editData.source             ?? "other",
        priority:           editData.priority           ?? "medium",
        product:            editData.product            ?? "",
        description:        editData.description        ?? "",
        assignedTo:         editData.assignedTo?._id    ?? editData.assignedTo ?? "",
        expectedCloseDate:  editData.expectedCloseDate
          ? new Date(editData.expectedCloseDate).toISOString().slice(0, 10)
          : "",
        lossReason: editData.lossReason ?? "",
        notes:      editData.notes      ?? "",
      });
    } else {
      setF({ ...BLANK, stage: initialStage, probability: STAGE_PROBABILITY[initialStage] ?? 10 });
    }
  }, [editData, initialStage]);

  const handleStageChange = (s: string) => {
    setF(prev => ({ ...prev, stage: s, probability: STAGE_PROBABILITY[s] ?? prev.probability }));
  };

  const handleSubmit = async () => {
    setAttempted(true);
    if (!f.title.trim() || !f.accountName.trim() || !f.contactName.trim()) {
      toast.error("Please fill in the required fields");
      return;
    }
    setLoading(true);
    try {
      const body = {
        title:              f.title.trim(),
        accountName:        f.accountName.trim(),
        contactName:        f.contactName.trim(),
        contactEmail:       f.contactEmail.trim(),
        contactPhone:       f.contactPhone.trim(),
        contactDesignation: f.contactDesignation.trim(),
        value:              parseFloat(f.value) || 0,
        stage:              f.stage,
        probability:        Number(f.probability),
        source:             f.source,
        priority:           f.priority,
        product:            f.product.trim() || undefined,
        description:        f.description.trim() || undefined,
        assignedTo:         f.assignedTo || undefined,
        expectedCloseDate:  f.expectedCloseDate || undefined,
        lossReason:         f.lossReason.trim() || undefined,
        notes:              f.notes.trim() || undefined,
      };

      const url    = isEdit ? `/api/crm/leads/${editData._id}` : "/api/crm/leads";
      const method = isEdit ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to save lead");
        return;
      }

      toast.success(isEdit ? "Lead updated" : "Lead created");
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  const dealValue = parseFloat(f.value) || 0;
  const stageMeta = STAGES.find(s => s.id === f.stage);
  const sc        = STAGE_COLORS[f.stage] ?? STAGE_COLORS.new;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg">{isEdit ? "Edit Lead" : "New Lead"}</DialogTitle>
              <DialogDescription>
                {isEdit ? "Update the details of this opportunity" : "Add a new opportunity to your sales pipeline"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Deal Info */}
          <SectionCard icon={Briefcase} iconBg="bg-blue-100" iconColor="text-blue-600" title="Deal Information">
            <div>
              <Label>Deal Title <span className="text-red-500">*</span></Label>
              <IconInput
                icon={Briefcase}
                value={f.title} onChange={e => set("title", e.target.value)}
                placeholder="e.g. ERP Implementation for Acme Corp"
                aria-invalid={attempted && !f.title.trim()}
              />
              <FieldError show={attempted && !f.title.trim()} message="Deal title is required" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Account / Company <span className="text-red-500">*</span></Label>
                <IconInput
                  icon={Building2}
                  value={f.accountName} onChange={e => set("accountName", e.target.value)}
                  placeholder="Company name"
                  aria-invalid={attempted && !f.accountName.trim()}
                />
                <FieldError show={attempted && !f.accountName.trim()} message="Account name is required" />
              </div>
              <div>
                <Label>Product / Service</Label>
                <IconInput icon={Package} value={f.product} onChange={e => set("product", e.target.value)} placeholder="e.g. ERP System" />
              </div>
            </div>
          </SectionCard>

          {/* Contact */}
          <SectionCard icon={User} iconBg="bg-indigo-100" iconColor="text-indigo-600" title="Contact Person">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Full Name <span className="text-red-500">*</span></Label>
                <IconInput
                  icon={User}
                  value={f.contactName} onChange={e => set("contactName", e.target.value)}
                  placeholder="Contact name"
                  aria-invalid={attempted && !f.contactName.trim()}
                />
                <FieldError show={attempted && !f.contactName.trim()} message="Contact name is required" />
              </div>
              <div>
                <Label>Designation</Label>
                <IconInput icon={Tag} value={f.contactDesignation} onChange={e => set("contactDesignation", e.target.value)} placeholder="e.g. CTO" />
              </div>
              <div>
                <Label>Email</Label>
                <IconInput icon={Mail} type="email" value={f.contactEmail} onChange={e => set("contactEmail", e.target.value)} placeholder="contact@company.com" />
              </div>
              <div>
                <Label>Phone</Label>
                <IconInput icon={Phone} value={f.contactPhone} onChange={e => set("contactPhone", e.target.value)} placeholder="+91 98765 43210" />
              </div>
            </div>
          </SectionCard>

          {/* Pipeline */}
          <SectionCard icon={TrendingUp} iconBg="bg-violet-100" iconColor="text-violet-600" title="Pipeline">
            <div>
              <Label className="mb-1.5">Stage</Label>
              <StagePills value={f.stage} onChange={handleStageChange} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Win Probability</Label>
                <div className="relative">
                  <Input
                    type="number" min="0" max="100" className="pr-8"
                    value={f.probability}
                    onChange={e => set("probability", parseInt(e.target.value) || 0)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Auto-set from stage — adjust if needed</p>
              </div>
              <div>
                <Label>Deal Value</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 pointer-events-none">₹</span>
                  <Input type="number" min="0" className="pl-7" value={f.value} onChange={e => set("value", e.target.value)} placeholder="0" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                  {dealValue > 0 ? `= ${fmtCompact(dealValue)}` : " "}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Expected Close Date</Label>
                <Input type="date" value={f.expectedCloseDate} onChange={e => set("expectedCloseDate", e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5">Priority</Label>
                <PriorityPills value={f.priority} onChange={v => set("priority", v)} />
              </div>
            </div>
            {f.stage === "lost" && (
              <div>
                <Label>Loss Reason</Label>
                <Input value={f.lossReason} onChange={e => set("lossReason", e.target.value)} placeholder="Why was this deal lost?" />
              </div>
            )}
          </SectionCard>

          {/* Details */}
          <SectionCard icon={ListChecks} iconBg="bg-slate-200" iconColor="text-slate-600" title="Additional Details">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Source</Label>
                <NativeSelect value={f.source} onChange={e => set("source", e.target.value)}>
                  <option value="cold_call">Cold Call</option>
                  <option value="referral">Referral</option>
                  <option value="website">Website</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="email_campaign">Email Campaign</option>
                  <option value="event">Event</option>
                  <option value="partner">Partner</option>
                  <option value="inbound">Inbound</option>
                  <option value="other">Other</option>
                </NativeSelect>
              </div>
              <div>
                <Label>Assigned To</Label>
                <NativeSelect value={f.assignedTo} onChange={e => set("assignedTo", e.target.value)}>
                  <option value="">Unassigned</option>
                  {empList.map((e: any) => (
                    <option key={e._id} value={e._id}>
                      {e.firstName} {e.lastName} ({e.employeeCode})
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={f.description} onChange={e => set("description", e.target.value)} placeholder="Deal description, scope, key requirements..." rows={2} />
            </div>
            <div>
              <Label>Internal Notes</Label>
              <Textarea
                value={f.notes} onChange={e => set("notes", e.target.value)}
                placeholder="Internal notes (not visible to client)..." rows={2}
                className="bg-amber-50/50 border-amber-100 focus-visible:border-amber-300 focus-visible:ring-amber-500/15"
              />
            </div>
          </SectionCard>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            {f.title.trim() ? (
              <>
                <span className={cn("inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full border", sc.bg, sc.text, sc.border)}>
                  <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", sc.dot)} />
                  {stageMeta?.label}
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-bold text-slate-700">{fmtCompact(dealValue)}</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-500">{f.probability}% win</span>
              </>
            ) : (
              <span className="text-slate-400">Fill in the deal details to continue</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="gap-1.5">
              {isEdit ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {loading ? "Saving..." : isEdit ? "Update Lead" : "Create Lead"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
