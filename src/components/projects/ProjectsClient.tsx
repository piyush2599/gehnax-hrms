"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useActiveRole } from "@/components/layout/active-role-context";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Badge }    from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast }    from "sonner";
import {
  FolderKanban, Plus, Search, Users, Calendar, Layers,
  CheckCircle2, AlertCircle, Clock, TrendingUp, ShoppingCart, Pencil, Trash2,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import {
  PROJECT_STATUS_LABEL, PROJECT_STATUS_COLORS,
  PROJECT_PRIORITY_COLORS,
} from "./constants";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

const STATUS_FILTERS = ["all","planning","active","on_hold","completed","cancelled"] as const;

function AvatarStack({ members, max = 4 }: { members: any[]; max?: number }) {
  const show = members.slice(0, max);
  const extra = members.length - max;
  return (
    <div className="flex -space-x-2">
      {show.map((m, i) => (
        <div
          key={m._id ?? i}
          title={`${m.firstName} ${m.lastName}`}
          className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-white flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
        >
          {(m.firstName?.[0] ?? "?")}{(m.lastName?.[0] ?? "")}
        </div>
      ))}
      {extra > 0 && (
        <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[9px] font-semibold text-slate-600 flex-shrink-0">
          +{extra}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-slate-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function ProjectsClient() {
  const { data: session } = useSession();
  const { activeRole } = useActiveRole();
  const router = useRouter();
  const roles: string[] = (session?.user as any)?.roles || ["employee"];
  const canManage = roles.some(r => ["super_admin","hr_admin","manager"].includes(r));
  const canDelete = roles.some(r => ["super_admin","hr_admin"].includes(r));

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch]             = useState("");
  const [deleting, setDeleting]         = useState<string | null>(null);

  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (search) params.set("search", search);
  params.set("activeRole", activeRole);

  const { data, isLoading, mutate } = useSWR(
    `/api/projects?${params.toString()}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  const projects: any[] = data?.projects ?? [];
  const stats: any      = data?.stats    ?? {};

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete project "${name}" and all its tasks? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
      toast.success("Project deleted");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-blue-600" />
            Projects
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and track all your projects</p>
        </div>
        {canManage && (
          <Button
            onClick={() => router.push("/projects/new")}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-1.5 flex-shrink-0"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Projects" value={stats.total ?? 0} icon={FolderKanban} color="text-blue-600" bg="bg-blue-100" />
          <StatCard label="Active"         value={stats.active ?? 0} icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-100" />
          <StatCard label="On Hold"        value={stats.on_hold ?? 0} icon={Clock}     color="text-amber-600" bg="bg-amber-100" />
          <StatCard label="Completed"      value={stats.completed ?? 0} icon={CheckCircle2} color="text-violet-600" bg="bg-violet-100" />
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all capitalize whitespace-nowrap",
                statusFilter === f
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              )}
            >
              {f === "all" ? "All" : PROJECT_STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <FolderKanban className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">No projects found</p>
          <p className="text-xs text-slate-400 mt-1">
            {search || statusFilter !== "all" ? "Try adjusting your filters" : canManage ? "Create your first project to get started" : "No projects assigned to you yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => {
            const tc = project.taskCounts ?? {};
            const done  = tc.done ?? 0;
            const total = tc.total ?? 0;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;
            const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && !["completed","cancelled"].includes(project.status);

            return (
              <div
                key={project._id}
                className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer group"
                onClick={() => router.push(`/projects/${project._id}`)}
              >
                {/* Top strip */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {project.projectCode}
                      </span>
                      <Badge variant="outline" className={cn("text-xs", PROJECT_STATUS_COLORS[project.status])}>
                        {PROJECT_STATUS_LABEL[project.status]}
                      </Badge>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      {canManage && (
                        <button
                          onClick={() => router.push(`/projects/${project._id}?tab=edit`)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(project._id, project.name)}
                          disabled={deleting === project._id}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-blue-600 transition-colors">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{project.description}</p>
                  )}
                </div>

                {/* Progress */}
                <div className="px-4 pb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-500">{done}/{total} tasks done</span>
                    <span className="text-xs font-semibold text-slate-600">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>

                {/* Meta */}
                <div className="px-4 pb-4 pt-2 border-t border-slate-50 space-y-2">
                  {project.purchaseOrder && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <ShoppingCart className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-medium text-blue-600">{project.purchaseOrder.poNumber}</span>
                      <span>· {project.purchaseOrder.clientName}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {project.team?.length > 0 ? (
                        <AvatarStack members={project.team} />
                      ) : (
                        <span className="text-xs text-slate-400 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> No team</span>
                      )}
                      {project.team?.length > 0 && (
                        <span className="text-xs text-slate-400">{project.team.length} member{project.team.length !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                    {project.dueDate && (
                      <span className={cn(
                        "flex items-center gap-1 text-xs",
                        isOverdue ? "text-red-600 font-semibold" : "text-slate-400"
                      )}>
                        {isOverdue && <AlertCircle className="w-3 h-3" />}
                        <Calendar className="w-3 h-3" />
                        {formatDate(project.dueDate)}
                      </span>
                    )}
                  </div>
                  {project.manager && (
                    <p className="text-xs text-slate-400">
                      Manager: <span className="text-slate-600 font-medium">{project.manager.firstName} {project.manager.lastName}</span>
                    </p>
                  )}
                </div>

                {/* Priority + type footer */}
                <div className="px-4 pb-3 flex items-center gap-2">
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md capitalize", PROJECT_PRIORITY_COLORS[project.priority])}>
                    {project.priority}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">{project.type}</span>
                  <span className="ml-auto text-xs font-mono text-slate-300">{project.key}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
