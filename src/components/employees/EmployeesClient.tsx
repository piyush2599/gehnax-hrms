"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { getInitials, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import EmployeeDetail from "./EmployeeDetail";
import CTCCalculator from "./CTCCalculator";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const EMP_TYPE_COLORS: Record<string, string> = {
  full_time: "bg-emerald-50 text-emerald-700 border-emerald-200",
  part_time: "bg-blue-50 text-blue-700 border-blue-200",
  contract:  "bg-amber-50 text-amber-700 border-amber-200",
  intern:    "bg-violet-50 text-violet-700 border-violet-200",
};

export default function EmployeesClient() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState("all");
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const canAdd = ["super_admin", "hr_admin"].includes(role);

  const apiUrl = `/api/employees?search=${search}&department=${deptFilter === "all" ? "" : deptFilter}`;
  const { data, isLoading } = useSWR(apiUrl, fetcher);
  const { data: departments } = useSWR("/api/departments", fetcher);
  const employees = data?.employees || [];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          {data?.total ?? 0} total employees
        </p>
        {canAdd && (
          <Button
            className="bg-blue-600 hover:bg-blue-700 shadow-sm"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Employee
          </Button>
        )}
      </div>

      {/* Add Employee Dialog */}
      {canAdd && (
        <Dialog open={addOpen} onOpenChange={setAddOpen} disablePointerDismissal>
          <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Add New Employee</DialogTitle>
              <p className="text-sm text-slate-500 mt-0.5">Fill in the details to create a new employee account.</p>
            </DialogHeader>
            <AddEmployeeForm
              departments={departments || []}
              employees={employees}
              onSuccess={() => {
                setAddOpen(false);
                mutate(apiUrl);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, email, or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
        <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v ?? "all")}>
          <SelectTrigger className="w-48 bg-white border-slate-200">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments?.map((d: any) => (
              <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No employees found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide pl-5">Employee</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Department</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Joined</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp: any) => (
                  <TableRow
                    key={emp._id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setViewId(emp._id)}
                  >
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 flex-shrink-0">
                          <AvatarImage src={emp.avatar} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                            {getInitials(`${emp.firstName} ${emp.lastName}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {emp.employeeCode} · {emp.designation}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-slate-600">{emp.department?.name || "—"}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline" className={`text-xs capitalize ${EMP_TYPE_COLORS[emp.employmentType] || ""}`}>
                        {emp.employmentType?.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-slate-600">{formatDate(emp.joiningDate)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={emp.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-600 border-red-200"}
                      >
                        {emp.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail modal */}
      {viewId && (
        <Dialog open={!!viewId} onOpenChange={() => setViewId(null)}>
          <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
            <EmployeeDetail
              employeeId={viewId}
              onClose={() => setViewId(null)}
              onUpdate={() => mutate(apiUrl)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* ─── Add Employee Form ─────────────────────────────────────── */

type FormState = {
  firstName: string; lastName: string; email: string; phone: string;
  gender: string; dateOfBirth: string;
  department: string; designation: string; employmentType: string;
  joiningDate: string; reportingManager: string;
  salary: { basic: number; hra: number; allowances: number; deductions: number };
};

const INITIAL_FORM: FormState = {
  firstName: "", lastName: "", email: "", phone: "",
  gender: "", dateOfBirth: "",
  department: "", designation: "", employmentType: "full_time",
  joiningDate: "", reportingManager: "",
  salary: { basic: 0, hra: 0, allowances: 0, deductions: 0 },
};

function AddEmployeeForm({
  departments, employees, onSuccess,
}: {
  departments: any[]; employees: any[]; onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof FormState, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.department) e.department = "Required";
    if (!form.designation.trim()) e.designation = "Required";
    if (!form.joiningDate) e.joiningDate = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        reportingManager: form.reportingManager || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
      };
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed to add employee");
      else { toast.success("Employee added! Default password: Welcome@123"); onSuccess(); }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const gross = form.salary.basic + form.salary.hra + form.salary.allowances;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-1">

      {/* ── Personal Info ── */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Personal Information</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" required error={errors.firstName}>
            <Input placeholder="John" value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              className={errors.firstName ? "border-red-300" : ""} />
          </Field>
          <Field label="Last Name" required error={errors.lastName}>
            <Input placeholder="Doe" value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              className={errors.lastName ? "border-red-300" : ""} />
          </Field>
          <div className="col-span-2">
            <Field label="Email Address" required error={errors.email}>
              <Input type="email" placeholder="john@example.com" value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={errors.email ? "border-red-300" : ""} />
            </Field>
          </div>
          <Field label="Phone">
            <Input placeholder="+91 99999 99999" value={form.phone}
              onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Gender">
            <NativeSelect value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </NativeSelect>
          </Field>
          <Field label="Date of Birth">
            <Input type="date" value={form.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)} />
          </Field>
        </div>
      </div>

      {/* ── Employment Info ── */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Employment Details</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Department" required error={errors.department}>
            <NativeSelect
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
              error={!!errors.department}
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Designation" required error={errors.designation}>
            <Input placeholder="e.g. Software Engineer" value={form.designation}
              onChange={(e) => set("designation", e.target.value)}
              className={errors.designation ? "border-red-300" : ""} />
          </Field>
          <Field label="Employment Type">
            <NativeSelect value={form.employmentType} onChange={(e) => set("employmentType", e.target.value)}>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="intern">Intern</option>
            </NativeSelect>
          </Field>
          <Field label="Joining Date" required error={errors.joiningDate}>
            <Input type="date" value={form.joiningDate}
              onChange={(e) => set("joiningDate", e.target.value)}
              className={errors.joiningDate ? "border-red-300" : ""} />
          </Field>
          <div className="col-span-2">
            <Field label="Reporting Manager">
              <NativeSelect value={form.reportingManager} onChange={(e) => set("reportingManager", e.target.value)}>
                <option value="">None (optional)</option>
                {employees.map((e: any) => (
                  <option key={e._id} value={e._id}>
                    {e.firstName} {e.lastName} — {e.designation}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
        </div>
      </div>

      {/* ── Salary ── */}
      <div className="space-y-4">
        {/* CTC auto-calculator */}
        <CTCCalculator
          onApply={(s) =>
            setForm((f) => ({ ...f, salary: { basic: s.basic, hra: s.hra, allowances: s.allowances, deductions: s.deductions } }))
          }
        />

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Or enter manually (₹/month)
        </p>
        <div className="grid grid-cols-2 gap-4">
          {(["basic", "hra", "allowances", "deductions"] as const).map((field) => (
            <Field key={field} label={field === "hra" ? "HRA" : field.charAt(0).toUpperCase() + field.slice(1)}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                <Input type="number" min="0" className="pl-7" placeholder="0"
                  value={(form.salary as any)[field] || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, salary: { ...f.salary, [field]: parseInt(e.target.value) || 0 } }))
                  } />
              </div>
            </Field>
          ))}
        </div>
        {gross > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Gross Pay</span>
              <span className="font-semibold">₹{gross.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-red-500">
              <span>Deductions</span><span>−₹{form.salary.deductions.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t border-slate-200">
              <span>Net Pay</span><span>₹{(gross - form.salary.deductions).toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
        Default login password: <strong>Welcome@123</strong>
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
        {loading ? "Adding…" : "Add Employee"}
      </Button>
    </form>
  );
}

function Field({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
