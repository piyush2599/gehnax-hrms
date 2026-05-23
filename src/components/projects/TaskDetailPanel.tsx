"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import { Badge }    from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast }    from "sonner";
import { Send, Trash2, Calendar, Clock, User } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import {
  TASK_STATUS_LABEL, TASK_STATUS_COLORS,
  TASK_PRIORITY_DOT, TASK_TYPE_COLORS, TASK_TYPE_LABEL,
} from "./constants";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

interface Props {
  taskId: string | null;
  projectId: string;
  canManage: boolean;
  onClose: () => void;
  onUpdate: (task: any) => void;
  onDelete: (id: string) => void;
}

export default function TaskDetailPanel({ taskId, projectId, canManage, onClose, onUpdate, onDelete }: Props) {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;

  const { data: task, isLoading, mutate } = useSWR(
    taskId ? `/api/tasks/${taskId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: empData } = useSWR("/api/employees", fetcher);
  const empList = Array.isArray(empData) ? empData : (empData?.employees ?? []);

  const [editing,  setEditing]  = useState(false);
  const [title,    setTitle]    = useState("");
  const [desc,     setDesc]     = useState("");
  const [status,   setStatus]   = useState("");
  const [priority, setPriority] = useState("");
  const [type,     setType]     = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate,  setDueDate]  = useState("");
  const [estHours, setEstHours] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [comment,  setComment]  = useState("");
  const [posting,  setPosting]  = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title ?? "");
    setDesc(task.description ?? "");
    setStatus(task.status ?? "todo");
    setPriority(task.priority ?? "medium");
    setType(task.type ?? "task");
    setAssignee(task.assignee?._id ?? task.assignee ?? "");
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
    setEstHours(task.estimatedHours ? String(task.estimatedHours) : "");
    setEditing(false);
  }, [task]);

  async function saveField(field: string, value: any) {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error);
      mutate(updated);
      onUpdate(updated);
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    }
  }

  async function saveAll() {
    if (!task) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: desc.trim() || null,
          status, priority, type,
          assignee: assignee || null,
          dueDate: dueDate || null,
          estimatedHours: estHours ? Number(estHours) : null,
        }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error);
      toast.success("Task updated");
      mutate(updated);
      onUpdate(updated);
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function postComment() {
    if (!comment.trim() || !task) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/tasks/${task._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment.trim() }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      setComment("");
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPosting(false);
    }
  }

  async function deleteComment(commentId: string) {
    if (!task) return;
    try {
      await fetch(`/api/tasks/${task._id}/comments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      mutate();
    } catch {
      toast.error("Failed to delete comment");
    }
  }

  async function handleDelete() {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${task._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Task deleted");
      onDelete(task._id);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <Sheet open={!!taskId} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl bg-white overflow-y-auto p-0">
        {isLoading || !task ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)}
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="p-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded", TASK_TYPE_COLORS[task.type])}>
                  {TASK_TYPE_LABEL[task.type]}
                </span>
                <span className="text-xs font-mono text-slate-400">{task.taskCode}</span>
                <Badge variant="outline" className={cn("text-xs ml-auto", TASK_STATUS_COLORS[task.status])}>
                  {TASK_STATUS_LABEL[task.status]}
                </Badge>
              </div>
              {editing ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-base font-semibold"
                  autoFocus
                />
              ) : (
                <SheetTitle className="text-base font-semibold text-slate-900 text-left leading-snug">
                  {task.title}
                </SheetTitle>
              )}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Quick fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500">Status</Label>
                  <NativeSelect
                    value={editing ? status : task.status}
                    onChange={(e) => {
                      if (editing) { setStatus(e.target.value); return; }
                      saveField("status", e.target.value);
                      mutate({ ...task, status: e.target.value }, false);
                    }}
                    className="mt-1 text-sm"
                    disabled={!canManage && task.assignee?._id !== (session?.user as any)?.employeeId}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                    <option value="cancelled">Cancelled</option>
                  </NativeSelect>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Priority</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", TASK_PRIORITY_DOT[editing ? priority : task.priority])} />
                    <NativeSelect
                      value={editing ? priority : task.priority}
                      onChange={(e) => {
                        if (editing) { setPriority(e.target.value); return; }
                        if (canManage) saveField("priority", e.target.value);
                      }}
                      className="text-sm flex-1"
                      disabled={!canManage}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </NativeSelect>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Type</Label>
                  <NativeSelect
                    value={editing ? type : task.type}
                    onChange={(e) => { if (editing) setType(e.target.value); }}
                    className="mt-1 text-sm"
                    disabled={!editing || !canManage}
                  >
                    <option value="task">Task</option>
                    <option value="bug">Bug</option>
                    <option value="feature">Feature</option>
                    <option value="story">Story</option>
                  </NativeSelect>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Assignee</Label>
                  {editing ? (
                    <NativeSelect value={assignee} onChange={(e) => setAssignee(e.target.value)} className="mt-1 text-sm">
                      <option value="">Unassigned</option>
                      {empList.map((e: any) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
                    </NativeSelect>
                  ) : (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : <span className="text-slate-400">Unassigned</span>}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Due Date</Label>
                  {editing ? (
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 text-sm" />
                  ) : (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {task.dueDate ? formatDate(task.dueDate) : <span className="text-slate-400">Not set</span>}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Est. Hours</Label>
                  {editing ? (
                    <Input type="number" min="0" step="0.5" value={estHours} onChange={(e) => setEstHours(e.target.value)} className="mt-1 text-sm" placeholder="0" />
                  ) : (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {task.estimatedHours ? `${task.estimatedHours}h` : <span className="text-slate-400">Not set</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-xs text-slate-500">Description</Label>
                {editing ? (
                  <Textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={4}
                    className="mt-1 resize-none text-sm"
                    placeholder="Add a description…"
                  />
                ) : (
                  <p className={cn("mt-1 text-sm leading-relaxed", task.description ? "text-slate-700" : "text-slate-400 italic")}>
                    {task.description || "No description provided."}
                  </p>
                )}
              </div>

              {/* Reporter */}
              {task.reporter && (
                <p className="text-xs text-slate-400">
                  Reported by <span className="font-medium text-slate-600">{task.reporter.name}</span>
                  {task.createdAt && <> · {formatDate(task.createdAt)}</>}
                </p>
              )}

              {/* Comments */}
              <div>
                <Label className="text-xs text-slate-500 mb-2 block">Comments ({task.comments?.length ?? 0})</Label>
                <div className="space-y-3 mb-3 max-h-52 overflow-y-auto">
                  {(task.comments ?? []).map((c: any) => (
                    <div key={c._id} className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                        {c.author?.name?.[0] ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold text-slate-700">{c.author?.name ?? "User"}</span>
                          <span className="text-[10px] text-slate-400">{formatDate(c.createdAt)}</span>
                          {(c.author?._id === userId || canManage) && (
                            <button
                              onClick={() => deleteComment(c._id)}
                              className="ml-auto text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  {(task.comments?.length ?? 0) === 0 && (
                    <p className="text-xs text-slate-400 italic">No comments yet.</p>
                  )}
                </div>

                {/* Add comment */}
                <div className="flex gap-2">
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                    rows={2}
                    placeholder="Add a comment… (Enter to send)"
                    className="flex-1 resize-none text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={postComment}
                    disabled={!comment.trim() || posting}
                    className="self-end bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            {canManage && (
              <div className="p-4 border-t border-slate-100 flex items-center gap-2">
                {editing ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving} className="flex-1">Cancel</Button>
                    <Button size="sm" onClick={saveAll} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                      {saving ? "Saving…" : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="flex-1">Edit Task</Button>
                    {!delConfirm ? (
                      <Button size="sm" variant="outline" onClick={() => setDelConfirm(true)} className="text-red-500 hover:text-red-600 hover:border-red-300">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={handleDelete} className="text-red-600 border-red-300 hover:bg-red-50 text-xs">
                        Confirm delete?
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
