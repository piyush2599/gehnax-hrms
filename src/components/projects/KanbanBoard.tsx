"use client";

import { useState, useMemo } from "react";
import {
  DndContext, DragOverlay, closestCorners,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { KANBAN_COLUMNS } from "./constants";
import TaskCard from "./TaskCard";

interface KanbanBoardProps {
  tasks: any[];
  projectId: string;
  canManage: boolean;
  onTaskClick: (task: any) => void;
  onAddTask: (status: string) => void;
  onTasksChange: (tasks: any[]) => void;
}

function DroppableColumn({ col, tasks, canManage, onTaskClick, onAddTask }: {
  col: typeof KANBAN_COLUMNS[number];
  tasks: any[];
  canManage: boolean;
  onTaskClick: (task: any) => void;
  onAddTask: (status: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div className={cn(
      "flex flex-col rounded-xl border-t-4 min-w-[260px] flex-1",
      col.color, col.bg,
      isOver && "ring-2 ring-blue-400 ring-offset-1"
    )}>
      {/* Column Header */}
      <div className={cn("px-3 py-2.5 rounded-t-sm flex items-center justify-between", col.headerBg)}>
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{col.label}</span>
        <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full", col.count)}>{tasks.length}</span>
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="flex-1 p-2 space-y-2 min-h-[120px]">
        <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="h-16 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center">
            <p className="text-xs text-slate-400">Drop tasks here</p>
          </div>
        )}
      </div>

      {/* Add task button */}
      {canManage && (
        <div className="p-2 pt-0">
          <button
            onClick={() => onAddTask(col.id)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-white/70 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add task
          </button>
        </div>
      )}
    </div>
  );
}

export default function KanbanBoard({ tasks, projectId, canManage, onTaskClick, onAddTask, onTasksChange }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<any | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columnTasks = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const col of KANBAN_COLUMNS) map[col.id] = [];
    for (const task of tasks) {
      if (map[task.status]) map[task.status].push(task);
    }
    return map;
  }, [tasks]);

  function findColumn(taskId: string): string | null {
    for (const col of KANBAN_COLUMNS) {
      if (columnTasks[col.id]?.some((t) => t._id === taskId)) return col.id;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t._id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeCol = findColumn(String(active.id));
    const overCol   = KANBAN_COLUMNS.find((c) => c.id === over.id)?.id
      ?? findColumn(String(over.id));

    if (!activeCol || !overCol || activeCol === overCol) return;

    // Optimistically move task in UI
    onTasksChange(tasks.map((t) =>
      t._id === active.id ? { ...t, status: overCol } : t
    ));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const task = tasks.find((t) => t._id === active.id);
    if (!task) return;

    const newStatus = KANBAN_COLUMNS.find((c) => c.id === over.id)?.id
      ?? findColumn(String(over.id))
      ?? task.status;

    if (newStatus === task.status) return;

    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      const updated = await res.json();
      onTasksChange(tasks.map((t) => t._id === updated._id ? updated : t));
    } catch {
      // Revert
      onTasksChange(tasks.map((t) => t._id === task._id ? { ...t, status: task.status } : t));
      toast.error("Failed to move task");
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => (
          <DroppableColumn
            key={col.id}
            col={col}
            tasks={columnTasks[col.id] ?? []}
            canManage={canManage}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <TaskCard task={activeTask} onClick={() => {}} overlay />
        )}
      </DragOverlay>
    </DndContext>
  );
}
