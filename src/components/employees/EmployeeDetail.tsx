"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Mail, Phone, MapPin, Building2, Calendar,
  User, Briefcase, CreditCard, Pencil, X, Check,
  ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";
import { formatDate, formatCurrency, getInitials, cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import CTCCalculator from "./CTCCalculator";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  employeeId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const EMP_TYPE_COLORS: Record<string, string> = {
  full_time: "bg-emerald-50 text-emerald-700 border-emerald-200",
  part_time: "bg-blue-50 text-blue-700 border-blue-200",
  contract:  "bg-amber-50 text-amber-700 border-amber-200",
  intern:    "bg-violet-50 text-violet-700 border-violet-200",
};

export default function EmployeeDetail({ employeeId, onUpdate }: Props) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const canEdit = ["super_admin", "hr_admin"].includes(role);

  const { data: emp, isLoading } = useSWR(`/api/employees/${employeeId}`, fetcher);
  const { data: departments } = useSWR(canEdit ? "/api/departments" : null, fetcher);
  const { data: empList } = useSWR(canEdit ? "/api/employees?limit=200" : null, fetcher);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCTC, setShowCTC] = useState(false);
  const [form, setForm] = useState<any>({});

  const deptList = Array.isArray(departments) ? departments : [];
  const allEmployees = empList?.employees || [];

  const startEdit = () => {
    setShowCTC(false);
    setForm({
      firstName:      emp.firstName,
      lastName:       emp.lastName,
      phone:          emp.phone || "",
      gender:         emp.gender || "",
      dateOfBirth:    emp.dateOfBirth ? emp.dateOfBirth.slice(0, 10) : "",
      address: {
        street:  emp.address?.street || "",
        city:    emp.address?.city || "",
        state:   emp.address?.state || "",
        country: emp.address?.country || "India",
        pincode: emp.address?.pincode || "",
      },
      department:       emp.department?._id || "",
      designation:      emp.designation || "",
      employmentType:   emp.employmentType || "full_time",
      joiningDate:      emp.joiningDate ? emp.joiningDate.slice(0, 10) : "",
      reportingManager: emp.reportingManager?._id || "",
      isActive:         emp.isActive,
      salary: {
        basic:       emp.salary?.basic || 0,
        hra:         emp.salary?.hra || 0,
        allowances:  emp.salary?.allowances || 0,
        deductions:  emp.salary?.deductions || 0,
      },
      bankDetails: {
        accountNumber:     emp.bankDetails?.accountNumber || "",
        bankName:          emp.bankDetails?.bankName || "",
        ifscCode:          emp.bankDetails?.ifscCode || "",
        accountHolderName: emp.bankDetails?.accountHolderName || "",
      },
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        reportingManager: form.reportingManager || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
      };
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
      } else {
        toast.success("Employee updated");
        setEditing(false);
        mutate(`/api/employees/${employeeId}`);
        onUpdate();
      }
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: any) =>
    setForm((f: any) => ({ ...f, [key]: value }));

  const setSalary = (key: string, value: number) =>
    setForm((f: any) => ({ ...f, salary: { ...f.salary, [key]: value } }));

  const setAddress = (key: string, value: string) =>
    setForm((f: any) => ({ ...f, address: { ...f.address, [key]: value } }));

  const setBank = (key: string, value: string) =>
    setForm((f: any) => ({ ...f, bankDetails: { ...f.bankDetails, [key]: value } }));

  if (isLoading) {
    return (
      <div className="space-y-4 p-1">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="text-center py-12">
        <User className="w-10 h-10 mx-auto text-slate-300 mb-3" />
        <p className="text-sm text-slate-500">Employee not found</p>
      </div>
    );
  }

  const grossPay = (emp.salary?.basic || 0) + (emp.salary?.hra || 0) + (emp.salary?.allowances || 0);
  const netPay   = grossPay - (emp.salary?.deductions || 0);

  return (
    <div className="space-y-5">
      <DialogTitle className="sr-only">Employee Details</DialogTitle>

      {/* Header */}
      <div className="flex items-start gap-4 pb-1">
        <Avatar className="w-16 h-16 ring-2 ring-slate-100 flex-shrink-0">
          <AvatarImage src={emp.avatar} />
          <AvatarFallback className="bg-blue-600 text-white text-xl font-bold">
            {getInitials(`${emp.firstName} ${emp.lastName}`)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-900 leading-tight">
            {emp.firstName} {emp.lastName}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">{emp.designation}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200 text-slate-600">
              {emp.employeeCode}
            </Badge>
            <Badge
              variant="outline"
              className={emp.isActive
                ? "text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                : "text-xs bg-red-50 text-red-600 border-red-200"}
            >
              {emp.isActive ? "Active" : "Inactive"}
            </Badge>
            {emp.employmentType && (
              <Badge variant="outline" className={`text-xs capitalize ${EMP_TYPE_COLORS[emp.employmentType] || ""}`}>
                {emp.employmentType.replace("_", " ")}
              </Badge>
            )}
          </div>
        </div>

        {/* Edit / Save / Cancel */}
        {canEdit && (
          <div className="flex gap-2 flex-shrink-0">
            {editing ? (
              <>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(false)}
                  className="border-slate-200 gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={startEdit}
                className="border-slate-200 gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* ── VIEW MODE: tabs ── */}
      {!editing && (
        <Tabs defaultValue="info">
          <TabsList className="grid grid-cols-3 w-full bg-slate-100">
            <TabsTrigger value="info" className="gap-1.5 data-active:bg-blue-600 data-active:text-white data-active:shadow-md">
              <User className="w-3.5 h-3.5" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="work" className="gap-1.5 data-active:bg-blue-600 data-active:text-white data-active:shadow-md">
              <Briefcase className="w-3.5 h-3.5" />
              Work
            </TabsTrigger>
            <TabsTrigger value="salary" className="gap-1.5 data-active:bg-blue-600 data-active:text-white data-active:shadow-md">
              <CreditCard className="w-3.5 h-3.5" />
              Salary
            </TabsTrigger>
          </TabsList>

          {/* Personal */}
          <TabsContent value="info" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoItem icon={<Mail className="w-4 h-4" />}     label="Email"         value={emp.email} />
              <InfoItem icon={<Phone className="w-4 h-4" />}    label="Phone"         value={emp.phone || "Not provided"} />
              <InfoItem icon={<User className="w-4 h-4" />}     label="Gender"        value={emp.gender ? emp.gender.charAt(0).toUpperCase() + emp.gender.slice(1) : "—"} />
              <InfoItem icon={<Calendar className="w-4 h-4" />} label="Date of Birth" value={emp.dateOfBirth ? formatDate(emp.dateOfBirth) : "—"} />
              {emp.address?.city && (
                <InfoItem
                  icon={<MapPin className="w-4 h-4" />}
                  label="Location"
                  value={[emp.address.city, emp.address.state, emp.address.country].filter(Boolean).join(", ")}
                />
              )}
            </div>
          </TabsContent>

          {/* Work */}
          <TabsContent value="work" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoItem icon={<Building2 className="w-4 h-4" />} label="Department"       value={emp.department?.name || "—"} />
              <InfoItem icon={<Briefcase className="w-4 h-4" />} label="Designation"      value={emp.designation} />
              <InfoItem icon={<Calendar className="w-4 h-4" />}  label="Joining Date"     value={formatDate(emp.joiningDate)} />
              <InfoItem
                icon={<User className="w-4 h-4" />}
                label="Reporting Manager"
                value={emp.reportingManager
                  ? `${emp.reportingManager.firstName} ${emp.reportingManager.lastName}`
                  : "—"}
              />
            </div>

            {emp.leaveBalance && Object.keys(emp.leaveBalance).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Leave Balance</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Object.entries(emp.leaveBalance).map(([type, balance]) => (
                    <div key={type} className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-lg font-bold text-blue-600">{balance as number}</p>
                      <p className="text-xs text-slate-500 capitalize mt-0.5">{type}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Salary */}
          <TabsContent value="salary" className="mt-4 space-y-3">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Monthly Breakdown</p>
                <div className="space-y-2.5 text-sm">
                  <SalaryRow label="Basic Salary" value={formatCurrency(emp.salary?.basic || 0)} />
                  <SalaryRow label="HRA"           value={formatCurrency(emp.salary?.hra || 0)} />
                  <SalaryRow label="Allowances"    value={formatCurrency(emp.salary?.allowances || 0)} />
                  <Separator />
                  <SalaryRow label="Gross Pay"     value={formatCurrency(grossPay)} bold />
                  <SalaryRow label="Deductions"    value={`− ${formatCurrency(emp.salary?.deductions || 0)}`} className="text-red-500" />
                  <Separator />
                  <SalaryRow label="Net Pay"       value={formatCurrency(netPay)} bold className="text-emerald-600" />
                </div>
              </CardContent>
            </Card>

            {emp.bankDetails?.bankName && (
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Bank Details</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bank</span>
                      <span className="font-medium text-slate-800">{emp.bankDetails.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Account No.</span>
                      <span className="font-medium text-slate-800 font-mono">
                        ••••{emp.bankDetails.accountNumber?.slice(-4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">IFSC</span>
                      <span className="font-medium text-slate-800 font-mono">{emp.bankDetails.ifscCode}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* ── EDIT MODE: single scrollable form ── */}
      {editing && (
        <div className="space-y-6">

          {/* Section: Personal Info */}
          <EditSection title="Personal Information" icon={<User className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name">
                <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
              </Field>
              <Field label="Last Name">
                <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
              </Field>
              <div className="col-span-2">
                <Field label="Phone">
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 99999 99999" />
                </Field>
              </div>
              <Field label="Gender">
                <NativeSelect value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </NativeSelect>
              </Field>
              <Field label="Date of Birth">
                <Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
              </Field>
            </div>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-1">Address</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Street">
                  <Input value={form.address.street} onChange={(e) => setAddress("street", e.target.value)} placeholder="Street address" />
                </Field>
              </div>
              <Field label="City">
                <Input value={form.address.city} onChange={(e) => setAddress("city", e.target.value)} />
              </Field>
              <Field label="State">
                <Input value={form.address.state} onChange={(e) => setAddress("state", e.target.value)} />
              </Field>
              <Field label="Country">
                <Input value={form.address.country} onChange={(e) => setAddress("country", e.target.value)} />
              </Field>
              <Field label="Pincode">
                <Input value={form.address.pincode} onChange={(e) => setAddress("pincode", e.target.value)} />
              </Field>
            </div>
          </EditSection>

          {/* Section: Work Details */}
          <EditSection title="Work Details" icon={<Briefcase className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Department">
                <NativeSelect value={form.department} onChange={(e) => set("department", e.target.value)}>
                  <option value="">Select department</option>
                  {deptList.map((d: any) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Designation">
                <Input value={form.designation} onChange={(e) => set("designation", e.target.value)} />
              </Field>
              <Field label="Employment Type">
                <NativeSelect value={form.employmentType} onChange={(e) => set("employmentType", e.target.value)}>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </NativeSelect>
              </Field>
              <Field label="Joining Date">
                <Input type="date" value={form.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} />
              </Field>
              <div className="col-span-2">
                <Field label="Reporting Manager">
                  <NativeSelect value={form.reportingManager} onChange={(e) => set("reportingManager", e.target.value)}>
                    <option value="">None</option>
                    {allEmployees
                      .filter((e: any) => e._id !== employeeId)
                      .map((e: any) => (
                        <option key={e._id} value={e._id}>
                          {e.firstName} {e.lastName} — {e.designation}
                        </option>
                      ))}
                  </NativeSelect>
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Status">
                  <NativeSelect value={form.isActive ? "active" : "inactive"} onChange={(e) => set("isActive", e.target.value === "active")}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </NativeSelect>
                </Field>
              </div>
            </div>
          </EditSection>

          {/* Section: Salary */}
          <EditSection title="Salary (₹/month)" icon={<CreditCard className="w-4 h-4" />}>
            {/* CTC Calculator toggle */}
            <button
              type="button"
              onClick={() => setShowCTC((v) => !v)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                showCTC
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Auto-calculate from CTC
              </span>
              {showCTC ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showCTC && (
              <CTCCalculator
                initialCTC={
                  (emp.salary?.basic + emp.salary?.hra + emp.salary?.allowances) > 0
                    ? Math.round((emp.salary.basic + emp.salary.hra + emp.salary.allowances) * 12 * 1.06724)
                    : 0
                }
                onApply={(s) => {
                  setSalary("basic", s.basic);
                  setSalary("hra", s.hra);
                  setSalary("allowances", s.allowances);
                  setSalary("deductions", s.deductions);
                  setShowCTC(false);
                }}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              {(["basic", "hra", "allowances", "deductions"] as const).map((field) => (
                <Field key={field} label={field === "hra" ? "HRA" : field.charAt(0).toUpperCase() + field.slice(1)}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                    <Input
                      type="number" min="0" className="pl-7"
                      value={form.salary[field] || ""}
                      onChange={(e) => setSalary(field, parseInt(e.target.value) || 0)}
                    />
                  </div>
                </Field>
              ))}
            </div>

            {(form.salary.basic + form.salary.hra + form.salary.allowances) > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Pay</span>
                  <span className="font-semibold">
                    ₹{(form.salary.basic + form.salary.hra + form.salary.allowances).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-red-500">
                  <span>Deductions</span>
                  <span>−₹{form.salary.deductions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t border-slate-200">
                  <span>Net Pay</span>
                  <span>
                    ₹{(form.salary.basic + form.salary.hra + form.salary.allowances - form.salary.deductions).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </EditSection>

          {/* Section: Bank Details */}
          <EditSection title="Bank Details" icon={<CreditCard className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Account Holder Name">
                  <Input value={form.bankDetails.accountHolderName} onChange={(e) => setBank("accountHolderName", e.target.value)} />
                </Field>
              </div>
              <Field label="Bank Name">
                <Input value={form.bankDetails.bankName} onChange={(e) => setBank("bankName", e.target.value)} placeholder="e.g. HDFC Bank" />
              </Field>
              <Field label="Account Number">
                <Input value={form.bankDetails.accountNumber} onChange={(e) => setBank("accountNumber", e.target.value)} />
              </Field>
              <div className="col-span-2">
                <Field label="IFSC Code">
                  <Input value={form.bankDetails.ifscCode} onChange={(e) => setBank("ifscCode", e.target.value)} placeholder="e.g. HDFC0001234" />
                </Field>
              </div>
            </div>
          </EditSection>

          {/* Bottom action bar */}
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              <Check className="w-4 h-4" />
              {saving ? "Saving…" : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditing(false)}
              className="flex-1 border-slate-200"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditSection({
  title, icon, children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-slate-400">{icon}</div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <div className="flex-1 h-px bg-slate-100" />
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
      <div className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

function SalaryRow({
  label, value, bold, className,
}: {
  label: string; value: string; bold?: boolean; className?: string;
}) {
  return (
    <div className={`flex justify-between items-center ${bold ? "font-bold" : ""} ${className || ""}`}>
      <span className={bold ? "text-slate-900" : "text-slate-500"}>{label}</span>
      <span className={bold ? "text-slate-900" : "text-slate-700"}>{value}</span>
    </div>
  );
}
