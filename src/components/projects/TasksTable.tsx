"use client";

import { useState } from "react";
import { Badge }    from "@/components/ui/badge";
import { Input }    from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Calendar, User } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import {
  TASK_STATUS_LABEL, TASK_STATUS_COLORS,
  TASK_PRIORITY_DOT, TASK_TYPE_COLORS, TASK_TYPE_LABEL,
} from "./constants";

interface Props {
  tasks: any[];
  onTaskClick: (task: any) => void;
}

export default function TasksTable({ tasks, onTaskClick }: Props) {
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("all");
  const [priority, setPriority] = useState("all");
  const [type,     setType]     = useState("all");

  const filtered = tasks.filter((t) => {
    if (status   !== "all" && t.status   !== status)   return false;
    if (priority !== "all" && t.priority !== priority) return false;
    if (type     !== "all" && t.type     !== type)     return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.taskCode.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 text-sm w-36">
          <option value="all">All Status</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="in_review">In Review</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </NativeSelect>
        <NativeSelect value={priority} onChange={(e) => setPriority(e.target.value)} className="h-8 text-sm w-36">
          <option value="all">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </NativeSelect>
        <NativeSelect value={type} onChange={(e) => setType(e.target.value)} className="h-8 text-sm w-32">
          <option value="all">All Types</option>
          <option value="task">Task</option>
          <option value="bug">Bug</option>
          <option value="feature">Feature</option>
          <option value="story">Story</option>
        </NativeSelect>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm font-medium text-slate-600">No tasks found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Code</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Type</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Priority</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Assignee</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((task) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
                return (
                  <TableRow
                    key={task._id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => onTaskClick(task)}
                  >
                    <TableCell>
                      <span className="text-xs font-mono font-semibold text-slate-400">{task.taskCode}</span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-slate-800 max-w-[260px] truncate">{task.title}</p>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded", TASK_TYPE_COLORS[task.type])}>
                        {TASK_TYPE_LABEL[task.type]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", TASK_PRIORITY_DOT[task.priority])} />
                        <span className="text-xs text-slate-600 capitalize">{task.priority}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs whitespace-nowrap", TASK_STATUS_COLORS[task.status])}>
                        {TASK_STATUS_LABEL[task.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                            {task.assignee.firstName?.[0]}{task.assignee.lastName?.[0]}
                          </div>
                          <span className="text-xs text-slate-600 truncate max-w-[80px]">{task.assignee.firstName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 flex items-center gap-1"><User className="w-3 h-3" /> Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.dueDate ? (
                        <span className={cn("flex items-center gap-1 text-xs", isOverdue ? "text-red-600 font-semibold" : "text-slate-500")}>
                          <Calendar className="w-3 h-3" />
                          {formatDate(task.dueDate)}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      <p className="text-xs text-slate-400 text-right">{filtered.length} task{filtered.length !== 1 ? "s" : ""}</p>
    </div>
  );
}
