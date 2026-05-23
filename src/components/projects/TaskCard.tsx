"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { TASK_PRIORITY_DOT, TASK_TYPE_COLORS, TASK_TYPE_LABEL } from "./constants";

function typeIcon(type: string) {
  const icons: Record<string, string> = { task: "✓", bug: "⚡", feature: "★", story: "◆" };
  return icons[type] ?? "·";
}

interface Props {
  task: any;
  onClick: () => void;
  overlay?: boolean;
}

export default function TaskCard({ task, onClick, overlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group",
        overlay && "rotate-1 shadow-xl border-blue-300",
        isDragging && "ring-2 ring-blue-300"
      )}
      onClick={onClick}
    >
      {/* Drag handle + type */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", TASK_TYPE_COLORS[task.type])}>
            {typeIcon(task.type)} {TASK_TYPE_LABEL[task.type]}
          </span>
          <span className="text-[10px] font-mono text-slate-400">{task.taskCode}</span>
        </div>
        <button
          {...attributes}
          {...listeners}
          className="p-0.5 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2 mb-2">
        {task.title}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Priority dot */}
          <span title={task.priority} className={cn("w-2 h-2 rounded-full flex-shrink-0", TASK_PRIORITY_DOT[task.priority])} />
          {/* Due date */}
          {task.dueDate && (
            <span className={cn("flex items-center gap-0.5 text-[10px]", isOverdue ? "text-red-500 font-semibold" : "text-slate-400")}>
              <Calendar className="w-3 h-3" />
              {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>

        {/* Assignee */}
        {task.assignee ? (
          <div
            title={`${task.assignee.firstName} ${task.assignee.lastName}`}
            className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
          >
            {task.assignee.firstName?.[0]}{task.assignee.lastName?.[0]}
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-slate-100 border border-dashed border-slate-300 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}
