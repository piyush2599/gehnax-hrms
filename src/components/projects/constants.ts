export const PROJECT_STATUS_LABEL: Record<string, string> = {
  planning:  "Planning",
  active:    "Active",
  on_hold:   "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  planning:  "bg-slate-100 text-slate-600 border-slate-200",
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  on_hold:   "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

export const PROJECT_PRIORITY_COLORS: Record<string, string> = {
  low:      "bg-slate-100 text-slate-500",
  medium:   "bg-blue-100 text-blue-700",
  high:     "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

export const TASK_STATUS_LABEL: Record<string, string> = {
  todo:        "To Do",
  in_progress: "In Progress",
  in_review:   "In Review",
  done:        "Done",
  cancelled:   "Cancelled",
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  todo:        "bg-slate-100 text-slate-600 border-slate-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  in_review:   "bg-violet-50 text-violet-700 border-violet-200",
  done:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled:   "bg-red-50 text-red-500 border-red-200",
};

export const TASK_PRIORITY_DOT: Record<string, string> = {
  low:    "bg-slate-400",
  medium: "bg-blue-500",
  high:   "bg-amber-500",
  urgent: "bg-red-500",
};

export const TASK_TYPE_COLORS: Record<string, string> = {
  task:    "text-slate-500 bg-slate-100",
  bug:     "text-red-600 bg-red-50",
  feature: "text-violet-600 bg-violet-50",
  story:   "text-emerald-600 bg-emerald-50",
};

export const TASK_TYPE_LABEL: Record<string, string> = {
  task:    "Task",
  bug:     "Bug",
  feature: "Feature",
  story:   "Story",
};

export const KANBAN_COLUMNS = [
  { id: "todo",        label: "To Do",       color: "border-t-slate-400",   bg: "bg-slate-50",   headerBg: "bg-slate-100",  count: "bg-slate-200 text-slate-600" },
  { id: "in_progress", label: "In Progress", color: "border-t-blue-500",    bg: "bg-blue-50/30", headerBg: "bg-blue-50",    count: "bg-blue-100 text-blue-700" },
  { id: "in_review",   label: "In Review",   color: "border-t-violet-500",  bg: "bg-violet-50/30", headerBg: "bg-violet-50", count: "bg-violet-100 text-violet-700" },
  { id: "done",        label: "Done",        color: "border-t-emerald-500", bg: "bg-emerald-50/20", headerBg: "bg-emerald-50", count: "bg-emerald-100 text-emerald-700" },
] as const;
