"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { toast }    from "sonner";
import {
  ArrowLeft, FolderKanban, Pencil, Trash2, Plus, Users,
  Calendar, ShoppingCart, Layers, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import {
  PROJECT_STATUS_LABEL, PROJECT_STATUS_COLORS,
  PROJECT_PRIORITY_COLORS, TASK_STATUS_LABEL,
} from "./constants";
import KanbanBoard     from "./KanbanBoard";
import TasksTable      from "./TasksTable";
import TaskDetailPanel from "./TaskDetailPanel";
import CreateProjectForm from "./CreateProjectForm";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type Tab = "overview" | "board" | "tasks";

/* ── Quick-add task dialog ── */
function AddTaskDialog({ open, onOpenChange, projectId, defaultStatus, employees, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  projectId: string; defaultStatus: string; employees: any[];
  onCreated: (task: any) => void;
}) {
  const [title,    setTitle]    = useState("");
  const [type,     setType]     = useState("task");
  const [priority, setPriority] = useState("medium");
  const [assignee, setAssignee] = useState("");
  const [dueDate,  setDueDate]  = useState("");
  const [saving,   setSaving]   = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title required");
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectId, title: title.trim(), type, priority, status: defaultStatus, assignee: assignee || null, dueDate: dueDate || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Task created");
      onCreated(data);
      onOpenChange(false);
      setTitle(""); setAssignee(""); setDueDate("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Add Task — {TASK_STATUS_LABEL[defaultStatus]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div>
            <Label>Title <span className="text-red-500">*</span></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="mt-1" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <NativeSelect value={type} onChange={(e) => setType(e.target.value)} className="mt-1">
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="story">Story</option>
              </NativeSelect>
            </div>
            <div>
              <Label>Priority</Label>
              <NativeSelect value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </NativeSelect>
            </div>
          </div>
          <div>
            <Label>Assignee</Label>
            <NativeSelect value={assignee} onChange={(e) => setAssignee(e.target.value)} className="mt-1">
              <option value="">Unassigned</option>
              {employees.map((e: any) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
            </NativeSelect>
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? "Creating…" : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main component ── */
export default function ProjectDetailClient({ projectId }: { projectId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const role     = (session?.user as any)?.role ?? "employee";
  const canManage = ["super_admin","hr_admin","manager"].includes(role);
  const canDelete = ["super_admin","hr_admin"].includes(role);

  const [tab, setTab] = useState<Tab>("overview");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [addTaskStatus, setAddTaskStatus]   = useState("todo");
  const [addTaskOpen, setAddTaskOpen]       = useState(false);
  const [editOpen, setEditOpen]             = useState(false);
  const [delConfirm, setDelConfirm]         = useState(false);

  const { data: projectData, isLoading: projLoading, mutate: mutateProject } = useSWR(
    `/api/projects/${projectId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: tasksData, isLoading: tasksLoading, mutate: mutateTasks } = useSWR(
    tab !== "overview" ? `/api/tasks?project=${projectId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: empData } = useSWR("/api/employees", fetcher);
  const empList = Array.isArray(empData) ? empData : (empData?.employees ?? []);

  const project: any = projectData;
  const tasks: any[] = tasksData?.tasks ?? [];

  const handleTasksChange = useCallback((newTasks: any[]) => {
    mutateTasks({ tasks: newTasks }, false);
  }, [mutateTasks]);

  async function handleDeleteProject() {
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Project deleted");
      router.push("/projects");
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  }

  if (projLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!project || project.error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-500">{project?.error ?? "Project not found"}</p>
        <Link href="/projects" className="text-sm text-blue-600 mt-2 block">← Back to Projects</Link>
      </div>
    );
  }

  const tc = project.taskCounts ?? {};
  const done  = tc.done ?? 0;
  const total = tc.total ?? 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && !["completed","cancelled"].includes(project.status);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Breadcrumb + Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/projects"
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors mt-0.5 flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{project.projectCode}</span>
            <span className="text-xs font-bold font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{project.key}</span>
            <Badge variant="outline" className={cn("text-xs", PROJECT_STATUS_COLORS[project.status])}>
              {PROJECT_STATUS_LABEL[project.status]}
            </Badge>
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md capitalize", PROJECT_PRIORITY_COLORS[project.priority])}>
              {project.priority}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">{project.name}</h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="gap-1.5 text-xs">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
          {canDelete && (
            !delConfirm ? (
              <Button size="sm" variant="outline" onClick={() => setDelConfirm(true)} className="text-red-500 hover:border-red-300 text-xs gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleDeleteProject} className="text-red-600 border-red-300 text-xs">
                Confirm delete?
              </Button>
            )
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-4 text-sm text-slate-600 bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-3">
        {project.manager && (
          <span className="flex items-center gap-1.5">
            <FolderKanban className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">PM:</span>
            <span className="font-medium">{project.manager.firstName} {project.manager.lastName}</span>
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400">Team:</span>
          <span className="font-medium">{project.team?.length ?? 0} members</span>
        </span>
        {project.startDate && (
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">Start:</span>
            <span className="font-medium">{formatDate(project.startDate)}</span>
          </span>
        )}
        {project.dueDate && (
          <span className={cn("flex items-center gap-1.5", isOverdue && "text-red-600")}>
            {isOverdue ? <AlertCircle className="w-4 h-4" /> : <Calendar className="w-4 h-4 text-slate-400" />}
            <span className="text-slate-400">Due:</span>
            <span className={cn("font-medium", isOverdue && "text-red-600")}>{formatDate(project.dueDate)}</span>
          </span>
        )}
        {project.purchaseOrder && (
          <span className="flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-blue-500" />
            <span className="text-slate-400">PO:</span>
            <span className="font-medium text-blue-600">{project.purchaseOrder.poNumber}</span>
            <span className="text-slate-500">· {project.purchaseOrder.clientName}</span>
          </span>
        )}
        <span className="flex items-center gap-1.5 ml-auto">
          <span className="text-slate-400">Progress:</span>
          <span className="font-semibold">{progress}%</span>
          <div className="w-24">
            <Progress value={progress} className="h-1.5" />
          </div>
          <span className="text-xs text-slate-400">{done}/{total}</span>
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-slate-100 rounded-xl p-1 w-fit">
        {(["overview","board","tasks"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
              tab === t
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t === "board" ? "Board" : t === "tasks" ? "All Tasks" : "Overview"}
          </button>
        ))}
        {canManage && tab !== "overview" && (
          <button
            onClick={() => { setAddTaskStatus("todo"); setAddTaskOpen(true); }}
            className="ml-2 flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Task
          </button>
        )}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: description + task summary */}
          <div className="lg:col-span-2 space-y-5">
            {project.description && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{project.description}</p>
              </div>
            )}

            {/* Task status breakdown */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Task Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: "todo",        label: "To Do",       color: "text-slate-600 bg-slate-100", icon: Layers },
                  { key: "in_progress", label: "In Progress", color: "text-blue-600 bg-blue-50",    icon: Clock },
                  { key: "in_review",   label: "In Review",   color: "text-violet-600 bg-violet-50", icon: AlertCircle },
                  { key: "done",        label: "Done",        color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
                ].map(({ key, label, color, icon: Icon }) => (
                  <div key={key} className={cn("rounded-lg p-3 flex flex-col gap-1", color.split(" ")[1])}>
                    <Icon className={cn("w-4 h-4", color.split(" ")[0])} />
                    <p className="text-xl font-bold text-slate-800">{tc[key] ?? 0}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-400">{done} done</span>
                  <span className="text-xs text-slate-400">{total} total</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {project.tags?.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: team + PO */}
          <div className="space-y-5">
            {/* Team */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Team ({project.team?.length ?? 0})
              </h3>
              {project.team?.length > 0 ? (
                <div className="space-y-2">
                  {project.manager && (
                    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-blue-50 border border-blue-100">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                        {project.manager.firstName?.[0]}{project.manager.lastName?.[0]}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{project.manager.firstName} {project.manager.lastName}</p>
                        <p className="text-[10px] text-blue-600">Project Manager</p>
                      </div>
                    </div>
                  )}
                  {project.team.map((m: any) => (
                    <div key={m._id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-[10px] font-bold text-white">
                        {m.firstName?.[0]}{m.lastName?.[0]}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{m.firstName} {m.lastName}</p>
                        <p className="text-[10px] text-slate-400">{m.designation || "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No team members assigned.</p>
              )}
            </div>

            {/* Linked PO */}
            {project.purchaseOrder && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" /> Linked Purchase Order
                </h3>
                <div className="space-y-1.5 text-sm">
                  <p className="font-mono font-bold text-blue-600">{project.purchaseOrder.poNumber}</p>
                  <p className="text-slate-700 font-medium">{project.purchaseOrder.clientName}</p>
                  <p className="text-slate-500">₹{(project.purchaseOrder.totalAmount ?? 0).toLocaleString("en-IN")}</p>
                  <Badge variant="outline" className="text-xs capitalize mt-1">{project.purchaseOrder.status?.replace("_"," ")}</Badge>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "board" && (
        tasksLoading ? (
          <div className="flex gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80 flex-1 rounded-xl" />)}
          </div>
        ) : (
          <KanbanBoard
            tasks={tasks}
            projectId={projectId}
            canManage={canManage}
            onTaskClick={(task) => setSelectedTaskId(task._id)}
            onAddTask={(status) => { setAddTaskStatus(status); setAddTaskOpen(true); }}
            onTasksChange={handleTasksChange}
          />
        )
      )}

      {tab === "tasks" && (
        tasksLoading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : (
          <TasksTable tasks={tasks} onTaskClick={(task) => setSelectedTaskId(task._id)} />
        )
      )}

      {/* Task detail panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        projectId={projectId}
        canManage={canManage}
        onClose={() => setSelectedTaskId(null)}
        onUpdate={(updated) => {
          mutateTasks({
            tasks: tasks.map((t) => t._id === updated._id ? updated : t),
          }, false);
        }}
        onDelete={(id) => {
          mutateTasks({ tasks: tasks.filter((t) => t._id !== id) }, false);
          mutateProject();
        }}
      />

      {/* Add task dialog */}
      <AddTaskDialog
        open={addTaskOpen}
        onOpenChange={setAddTaskOpen}
        projectId={projectId}
        defaultStatus={addTaskStatus}
        employees={empList}
        onCreated={(task) => {
          mutateTasks({ tasks: [...tasks, task] }, false);
          mutateProject();
        }}
      />

      {/* Edit project dialog */}
      {editOpen && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle>Edit Project — {project.name}</DialogTitle>
            </DialogHeader>
            <div className="mt-2">
              <CreateProjectForm
                editData={project}
                onSuccess={(updated) => {
                  mutateProject(updated);
                  setEditOpen(false);
                  toast.success("Project updated");
                }}
                onCancel={() => setEditOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
