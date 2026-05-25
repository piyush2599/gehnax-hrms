"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Building2, Users, Pencil, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const DEPT_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-red-500", "bg-indigo-500",
  "bg-pink-500", "bg-cyan-500",
];

export default function DepartmentsClient() {
  const { data: session } = useSession();
  const roles: string[] = (session?.user as any)?.roles || [];
  const canManage = roles.some(r => ["super_admin", "hr_admin"].includes(r));

  const [addOpen, setAddOpen] = useState(false);
  const [editDept, setEditDept] = useState<any>(null);
  const [deleteDept, setDeleteDept] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data: departments, isLoading } = useSWR("/api/departments", fetcher);
  const { data: employees } = useSWR("/api/employees?limit=200", fetcher);

  const deptList = Array.isArray(departments) ? departments : [];
  const empList = employees?.employees || [];

  const getHeadcount = (deptId: string) =>
    empList.filter((e: any) => e.department?._id === deptId || e.department === deptId).length;

  const handleDelete = async () => {
    if (!deleteDept) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/departments/${deleteDept._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed to delete");
      else { toast.success("Department deleted"); setDeleteDept(null); mutate("/api/departments"); }
    } finally { setDeleteLoading(false); }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">{deptList.length} departments</p>
        {canManage && (
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Department
          </Button>
        )}
      </div>

      {/* Add Dialog */}
      {canManage && (
        <Dialog open={addOpen} onOpenChange={setAddOpen} disablePointerDismissal>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
            <AddDepartmentForm
              employees={empList}
              onSuccess={() => { setAddOpen(false); mutate("/api/departments"); }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {canManage && editDept && (
        <Dialog open={!!editDept} onOpenChange={() => setEditDept(null)} disablePointerDismissal>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Department</DialogTitle>
            </DialogHeader>
            <EditDepartmentForm
              dept={editDept}
              employees={empList}
              onSuccess={() => { setEditDept(null); mutate("/api/departments"); }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {canManage && roles.includes("super_admin") && (
        <Dialog open={!!deleteDept} onOpenChange={() => setDeleteDept(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Department</DialogTitle></DialogHeader>
            <div className="mt-2 space-y-4">
              <p className="text-sm text-slate-600">
                Are you sure you want to delete <span className="font-semibold text-slate-900">{deleteDept?.name}</span>? This action cannot be undone.
              </p>
              {deleteDept && getHeadcount(deleteDept._id) > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <span>⚠️</span>
                  <span>This department has <strong>{getHeadcount(deleteDept._id)} employee(s)</strong>. Consider reassigning them before deleting.</span>
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <Button variant="outline" size="sm" onClick={() => setDeleteDept(null)}>Cancel</Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" loading={deleteLoading} onClick={handleDelete}>
                  {deleteLoading ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : deptList.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">No departments yet</p>
          <p className="text-xs text-slate-400 mt-1">Create your first department</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {deptList.map((dept: any, idx: number) => {
            const colorClass = DEPT_COLORS[idx % DEPT_COLORS.length];
            const headcount = getHeadcount(dept._id);
            return (
              <Card key={dept._id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${colorClass} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-900 leading-tight">{dept.name}</h3>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">
                            {dept.code}
                          </Badge>
                          {canManage && (
                            <button
                              onClick={() => setEditDept(dept)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                              title="Edit department"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {roles.includes("super_admin") && (
                            <button
                              onClick={() => setDeleteDept(dept)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete department"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {dept.description && (
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{dept.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold">{headcount}</span>
                      <span className="text-slate-400">employees</span>
                    </div>
                    {dept.managerId && (
                      <div className="text-xs text-slate-400 truncate">
                        Mgr: {dept.managerId.firstName} {dept.managerId.lastName}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Add Department Form ──────────────────────────────── */
function AddDepartmentForm({ employees, onSuccess }: { employees: any[]; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: "", code: "", description: "", managerId: "" });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, managerId: form.managerId || undefined };
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed");
      else { toast.success("Department created"); onSuccess(); }
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label>Department Name *</Label>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. Engineering" />
      </div>
      <div className="space-y-1.5">
        <Label>Department Code *</Label>
        <Input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="e.g. ENG" required />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Brief description…" />
      </div>
      <div className="space-y-1.5">
        <Label>Department Manager</Label>
        <NativeSelect value={form.managerId} onChange={(e) => set("managerId", e.target.value)}>
          <option value="">Select manager (optional)</option>
          {employees.map((e: any) => (
            <option key={e._id} value={e._id}>{e.firstName} {e.lastName} — {e.designation}</option>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" loading={loading} className="w-full">
        {loading ? "Creating…" : "Create Department"}
      </Button>
    </form>
  );
}

/* ── Edit Department Form ─────────────────────────────── */
function EditDepartmentForm({ dept, employees, onSuccess }: { dept: any; employees: any[]; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name:        dept.name || "",
    description: dept.description || "",
    managerId:   dept.managerId?._id || dept.managerId || "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, managerId: form.managerId || null };
      const res = await fetch(`/api/departments/${dept._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed to update");
      else { toast.success("Department updated"); onSuccess(); }
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label>Department Name *</Label>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Code</Label>
        <Input value={dept.code} disabled className="bg-slate-50 text-slate-500" />
        <p className="text-xs text-slate-400">Department code cannot be changed</p>
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label>Department Manager</Label>
        <NativeSelect value={form.managerId} onChange={(e) => set("managerId", e.target.value)}>
          <option value="">No manager</option>
          {employees.map((e: any) => (
            <option key={e._id} value={e._id}>{e.firstName} {e.lastName} — {e.designation}</option>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" loading={loading} className="w-full">
        {loading ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
