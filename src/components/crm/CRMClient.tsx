"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useActiveRole } from "@/components/layout/active-role-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Plus, Search, LayoutGrid, List, Pencil, Trash2, Target, GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext, DragOverlay, closestCorners, useDroppable,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  STAGES, STAGE_COLORS, STAGE_PROBABILITY, PRIORITY_STYLES, fmt, fmtCompact, fmtDate,
} from "./constants";
import LeadFormDialog  from "./LeadFormDialog";
import LeadDetailPanel from "./LeadDetailPanel";

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ title, value, valueTitle, sub, accent }: { title: string; value: string | number; valueTitle?: string; sub: string; accent: string }) {
  const accents: Record<string, string> = {
    blue:    "border-l-blue-500   from-blue-50",
    emerald: "border-l-emerald-500 from-emerald-50",
    violet:  "border-l-violet-500  from-violet-50",
    slate:   "border-l-slate-400   from-slate-50",
  };
  return (
    <div className={cn("rounded-xl border border-slate-200 border-l-4 bg-gradient-to-r to-white p-4 shadow-sm", accents[accent] ?? accents.slate)}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-slate-900" title={valueTitle}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}

function LeadCard({ lead, onClick, overlay }: { lead: any; onClick: (id: string) => void; overlay?: boolean }) {
  const sc       = STAGE_COLORS[lead.stage] ?? STAGE_COLORS.new;
  const prStyles = PRIORITY_STYLES[lead.priority] ?? PRIORITY_STYLES.medium;
  const assignee = lead.assignedTo;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead._id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onClick(lead._id)}
      className={cn(
        "bg-white rounded-xl border border-slate-200 p-3.5 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all duration-150 group",
        overlay && "rotate-1 shadow-xl border-blue-300",
        isDragging && "ring-2 ring-blue-300"
      )}
    >
      {/* Priority + value */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", prStyles.bg, prStyles.text)}>
          {lead.priority}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-slate-800" title={fmt(lead.value)}>{fmtCompact(lead.value)}</span>
          <button
            {...attributes}
            {...listeners}
            onClick={e => e.stopPropagation()}
            className="p-0.5 -mr-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug mb-1">
        {lead.title}
      </p>

      {/* Account */}
      <p className="text-xs text-slate-500 truncate mb-3">{lead.accountName}</p>

      {/* Probability bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-400">Win probability</span>
          <span className={cn("text-[10px] font-bold",
            lead.probability >= 70 ? "text-emerald-600" :
            lead.probability >= 40 ? "text-blue-600" : "text-amber-600"
          )}>
            {lead.probability}%
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full",
              lead.probability >= 70 ? "bg-emerald-500" :
              lead.probability >= 40 ? "bg-blue-500" : "bg-amber-500"
            )}
            style={{ width: `${lead.probability}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
              {(assignee.firstName?.[0] ?? "") + (assignee.lastName?.[0] ?? "")}
            </div>
            <span className="text-[10px] text-slate-500 truncate max-w-[90px]">
              {assignee.firstName} {assignee.lastName}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-400">Unassigned</span>
        )}
        {lead.expectedCloseDate && (
          <span className="text-[10px] text-slate-400">
            {new Date(lead.expectedCloseDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  stage, leads, stageStats, onLeadClick, onAddLead,
}: {
  stage: typeof STAGES[number];
  leads: any[];
  stageStats?: { count: number; value: number };
  onLeadClick: (id: string) => void;
  onAddLead?: () => void;
}) {
  const sc = STAGE_COLORS[stage.id];
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className="flex flex-col flex-shrink-0 w-[250px] min-h-0">
      {/* Column header */}
      <div className={cn("rounded-t-xl border border-b-0 px-3 py-2.5 flex-shrink-0", sc.bg, sc.border)}>
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", sc.dot)} />
          <span className={cn("text-xs font-bold flex-1 truncate", sc.text)}>{stage.label}</span>
          <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/70", sc.text)}>
            {leads.length}
          </span>
        </div>
        {(stageStats?.value ?? 0) > 0 && (
          <p className="text-[10px] text-slate-500 font-medium mt-0.5 pl-4" title={fmt(stageStats!.value)}>{fmtCompact(stageStats!.value)}</p>
        )}
      </div>

      {/* Cards area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[120px] overflow-y-auto space-y-2 p-2 border border-t-0 rounded-b-xl transition-colors",
          sc.colBg,
          sc.border,
          isOver && "ring-2 ring-inset ring-blue-400"
        )}
      >
        <SortableContext items={leads.map(l => l._id)} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-xs text-slate-400">No leads</div>
          ) : (
            leads.map(lead => <LeadCard key={lead._id} lead={lead} onClick={onLeadClick} />)
          )}
        </SortableContext>

        {onAddLead && (
          <button
            onClick={onAddLead}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all border border-dashed border-slate-200 hover:border-blue-200 mt-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Lead
          </button>
        )}
      </div>
    </div>
  );
}

function LeadsTable({
  leads, canWrite, canDelete, onView, onEdit, onDelete,
}: {
  leads: any[];
  canWrite: boolean;
  canDelete: boolean;
  onView: (id: string) => void;
  onEdit: (lead: any) => void;
  onDelete: (id: string) => void;
}) {
  if (!leads.length) {
    return (
      <div className="flex flex-col items-center justify-center h-60 bg-white rounded-xl border border-slate-200">
        <Target className="w-10 h-10 text-slate-200 mb-3" />
        <p className="text-slate-500 font-medium">No leads found</p>
        <p className="text-slate-400 text-sm mt-1">Adjust your filters or add a new lead</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {["Deal", "Stage", "Win %", "Value", "Assigned To", "Close Date", ""].map(h => (
                <th key={h} className={cn("px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap", h === "" ? "text-right" : "text-left")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map(lead => {
              const sc       = STAGE_COLORS[lead.stage] ?? STAGE_COLORS.new;
              const assignee = lead.assignedTo;
              const stageMeta = STAGES.find(s => s.id === lead.stage);
              return (
                <tr key={lead._id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onView(lead._id)}>
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="text-sm font-semibold text-slate-900 truncate">{lead.title}</p>
                    <p className="text-xs text-slate-500 truncate">{lead.accountName} · <span className="text-slate-400 font-mono text-[10px]">{lead.leadNumber}</span></p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap", sc.bg, sc.text, sc.border)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", sc.dot)} />
                      {stageMeta?.label ?? lead.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
                        <div
                          className={cn("h-full rounded-full",
                            lead.probability >= 70 ? "bg-emerald-500" :
                            lead.probability >= 40 ? "bg-blue-500" : "bg-amber-500"
                          )}
                          style={{ width: `${lead.probability}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{lead.probability}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-slate-800 whitespace-nowrap">{fmt(lead.value)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600">
                      {assignee ? `${assignee.firstName} ${assignee.lastName}` : <span className="text-slate-400">—</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-slate-600">
                      {lead.expectedCloseDate ? fmtDate(lead.expectedCloseDate) : <span className="text-slate-400">—</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {canWrite && (
                        <button onClick={() => onEdit(lead)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => onDelete(lead._id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CRMClient() {
  const { data: session }         = useSession();
  const { activeRole }            = useActiveRole();
  const roles: string[]           = (session?.user as any)?.roles ?? [];
  const canWrite                  = roles.some(r => ["super_admin","manager","employee","sales"].includes(r));
  const canDelete                 = roles.some(r => ["super_admin","manager"].includes(r));

  const [view,          setView]          = useState<"kanban" | "list">("kanban");
  const [search,        setSearch]        = useState("");
  const [priorityFlt,   setPriorityFlt]   = useState("");
  const [stageFlt,      setStageFlt]      = useState("");
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [editLead,      setEditLead]      = useState<any>(null);
  const [initialStage,  setInitialStage]  = useState("new");
  const [activeLead,    setActiveLead]    = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Kanban's fixed-width columns need horizontal scroll that's awkward as a default
  // on phones/tablets — start those screens in List view instead.
  useEffect(() => {
    if (window.innerWidth < 768) setView("list");
  }, []);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (priorityFlt) p.set("priority",   priorityFlt);
    if (stageFlt)    p.set("stage",      stageFlt);
    if (search)      p.set("search",     search);
    if (activeRole)  p.set("activeRole", activeRole);
    return p.toString();
  }, [priorityFlt, stageFlt, search, activeRole]);

  const { data, isLoading, mutate } = useSWR(`/api/crm/leads?${params}`, fetcher, { refreshInterval: 60000 });
  const leads: any[] = data?.leads ?? [];
  const stats        = data?.stats ?? {};

  const leadsByStage = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const l of leads) {
      if (!map[l.stage]) map[l.stage] = [];
      map[l.stage].push(l);
    }
    return map;
  }, [leads]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveLead(leads.find(l => l._id === event.active.id) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);
    if (!over) return;

    const leadId = String(active.id);
    const lead   = leads.find(l => l._id === leadId);
    if (!lead) return;

    const overId   = String(over.id);
    const newStage = STAGES.some(s => s.id === overId)
      ? overId
      : leads.find(l => l._id === overId)?.stage;

    if (!newStage || newStage === lead.stage) return;

    const newProb = STAGE_PROBABILITY[newStage] ?? lead.probability;

    mutate(
      (current: any) => current
        ? { ...current, leads: current.leads.map((l: any) => l._id === leadId ? { ...l, stage: newStage, probability: newProb } : l) }
        : current,
      false
    );

    try {
      const res = await fetch(`/api/crm/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage, probability: newProb }),
      });
      if (!res.ok) throw new Error();
      toast.success("Stage updated");
      mutate();
    } catch {
      toast.error("Failed to move lead");
      mutate();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead? This action cannot be undone.")) return;
    const res = await fetch(`/api/crm/leads/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Lead deleted"); mutate(); }
    else toast.error("Failed to delete lead");
  };

  const openCreate = (stage = "new") => { setInitialStage(stage); setEditLead(null); setShowCreate(true); };
  const openEdit   = (lead: any)     => { setSelectedId(null); setEditLead(lead); setShowCreate(true); };
  const closeForm  = ()              => { setShowCreate(false); setEditLead(null); };
  const onSuccess  = ()              => { closeForm(); mutate(); };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-0">

      {/* ── Stats ── */}
      <div className="px-6 pt-6 pb-4 grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
        <StatCard
          title="Active Pipeline"
          value={fmtCompact(stats.pipelineValue ?? 0)}
          valueTitle={fmt(stats.pipelineValue ?? 0)}
          sub={`${stats.pipelineCount ?? 0} open leads`}
          accent="blue"
        />
        <StatCard
          title="Won This Month"
          value={fmtCompact(stats.wonThisMonthValue ?? 0)}
          valueTitle={fmt(stats.wonThisMonthValue ?? 0)}
          sub={`${stats.wonThisMonthCount ?? 0} deals closed`}
          accent="emerald"
        />
        <StatCard
          title="Win Rate"
          value={`${stats.conversionRate ?? 0}%`}
          sub="of all closed deals"
          accent="violet"
        />
        <StatCard
          title="Total Leads"
          value={stats.total ?? 0}
          sub="all time"
          accent="slate"
        />
      </div>

      {/* ── Controls ── */}
      <div className="px-6 pb-4 flex flex-wrap items-center gap-2.5 flex-shrink-0">
        {/* View toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
          <button
            onClick={() => setView("kanban")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
              view === "kanban" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Kanban
          </button>
          <button
            onClick={() => setView("list")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border-l border-slate-200 transition-colors",
              view === "list" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>

        {/* Priority filter */}
        <select
          value={priorityFlt}
          onChange={e => setPriorityFlt(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg bg-white px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-slate-600"
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Stage filter (list view only) */}
        {view === "list" && (
          <select
            value={stageFlt}
            onChange={e => setStageFlt(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg bg-white px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-slate-600"
          >
            <option value="">All Stages</option>
            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        )}

        <div className="ml-auto">
          {canWrite && (
            <Button onClick={() => openCreate("new")} className="gap-1.5 text-sm">
              <Plus className="w-4 h-4" /> New Lead
            </Button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 px-6 pb-6 overflow-hidden min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-sm text-slate-500">Loading leads...</p>
            </div>
          </div>
        ) : view === "kanban" ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-3 overflow-x-auto pb-4 h-full min-h-0">
              {/* Active pipeline stages */}
              <div className="flex gap-3 flex-shrink-0 min-h-0">
                {STAGES.filter(s => !["won","lost"].includes(s.id)).map(stage => (
                  <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    leads={leadsByStage[stage.id] ?? []}
                    stageStats={stats.byStage?.[stage.id]}
                    onLeadClick={setSelectedId}
                    onAddLead={canWrite ? () => openCreate(stage.id) : undefined}
                  />
                ))}
              </div>

              {/* Divider */}
              <div className="w-px bg-slate-200 flex-shrink-0" />

              {/* Closed stages */}
              <div className="flex flex-col gap-2 flex-shrink-0 min-h-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1 flex-shrink-0">
                  Closed Deals
                </p>
                <div className="flex gap-3 flex-1 min-h-0">
                  {STAGES.filter(s => ["won","lost"].includes(s.id)).map(stage => (
                    <KanbanColumn
                      key={stage.id}
                      stage={stage}
                      leads={leadsByStage[stage.id] ?? []}
                      stageStats={stats.byStage?.[stage.id]}
                      onLeadClick={setSelectedId}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DragOverlay>
              {activeLead && <LeadCard lead={activeLead} onClick={() => {}} overlay />}
            </DragOverlay>
          </DndContext>
        ) : (
          <LeadsTable
            leads={leads}
            canWrite={canWrite}
            canDelete={canDelete}
            onView={setSelectedId}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* ── Dialogs ── */}
      {(showCreate || !!editLead) && (
        <LeadFormDialog
          open={showCreate || !!editLead}
          editData={editLead}
          initialStage={initialStage}
          onSuccess={onSuccess}
          onCancel={closeForm}
        />
      )}

      <LeadDetailPanel
        leadId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdate={mutate}
        canWrite={canWrite}
        onEdit={openEdit}
        onDelete={canDelete ? (id) => { handleDelete(id); setSelectedId(null); } : undefined}
      />
    </div>
  );
}
