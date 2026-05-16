"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getInitials, formatDate, formatCurrency } from "@/lib/utils";
import { User, Phone, MapPin, Building2, Calendar, Pencil, FolderOpen, LogOut, IdCard } from "lucide-react";
import { useSession } from "next-auth/react";
import EmployeeDocuments from "@/components/employees/EmployeeDocuments";
import ResignModal from "@/components/employees/ResignModal";
import EmployeeIDCard from "@/components/employees/EmployeeIDCard";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ProfileClient() {
  const { data: session } = useSession();
  const employeeId = (session?.user as any)?.employeeId || "";
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showResign, setShowResign] = useState(false);

  const { data: emp, isLoading } = useSWR(
    employeeId ? `/api/employees/${employeeId}` : null,
    fetcher
  );

  const [form, setForm] = useState({
    phone: "",
    address: { street: "", city: "", state: "", country: "India", pincode: "" },
  });

  const startEdit = () => {
    setForm({
      phone: emp?.phone || "",
      address: emp?.address || { street: "", city: "", state: "", country: "India", pincode: "" },
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error);
      else { toast.success("Profile updated"); setEditing(false); mutate(`/api/employees/${employeeId}`); }
    } finally { setSaving(false); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="text-center py-16">
        <User className="w-10 h-10 mx-auto text-slate-300 mb-3" />
        <p className="text-sm text-slate-500">Profile not found</p>
      </div>
    );
  }

  const grossPay = (emp.salary?.basic || 0) + (emp.salary?.hra || 0) + (emp.salary?.allowances || 0);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile header card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-700" />
        <CardContent className="px-6 pb-6 -mt-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar className="w-20 h-20 ring-4 ring-white shadow-lg">
                <AvatarImage src={emp.avatar} />
                <AvatarFallback className="bg-blue-600 text-white text-2xl font-bold">
                  {getInitials(`${emp.firstName} ${emp.lastName}`)}
                </AvatarFallback>
              </Avatar>
              <div className="mb-1">
                <h2 className="text-xl font-bold text-slate-900">{emp.firstName} {emp.lastName}</h2>
                <p className="text-slate-500 text-sm">{emp.designation}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200">{emp.employeeCode}</Badge>
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 capitalize">
                    {emp.employmentType?.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            </div>
            {!editing && (
              <div className="flex gap-2 flex-shrink-0">
                <Button onClick={startEdit} variant="outline" size="sm" className="border-slate-200">
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit Profile
                </Button>
                {emp.resignation?.status === "pending" || emp.resignation?.status === "accepted" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className={emp.resignation.status === "accepted"
                      ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      : "border-amber-200 text-amber-700 hover:bg-amber-50"}
                    onClick={() => setShowResign(true)}
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    {emp.resignation.status === "accepted" ? "Resignation Accepted" : "View Resignation"}
                  </Button>
                ) : emp.resignation?.status !== "withdrawn" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => setShowResign(true)}
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    Resign
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="personal">
        <TabsList className="grid grid-cols-5 max-w-xl bg-slate-100">
          <TabsTrigger value="personal" className="">Personal</TabsTrigger>
          <TabsTrigger value="work" className="">Work</TabsTrigger>
          <TabsTrigger value="salary" className="">Salary</TabsTrigger>
          <TabsTrigger value="docs" className="gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" />
            Docs
          </TabsTrigger>
          <TabsTrigger value="idcard" className="gap-1.5">
            <IdCard className="w-3.5 h-3.5" />
            ID Card
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              {editing ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Phone Number</Label>
                    <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {["city","state","country","pincode"].map((field) => (
                      <div key={field} className="space-y-1.5">
                        <Label className="capitalize">{field}</Label>
                        <Input
                          value={(form.address as any)[field]}
                          onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, [field]: e.target.value } }))}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSave} loading={saving}>
                      Save Changes
                    </Button>
                    <Button onClick={() => setEditing(false)} variant="outline" className="border-slate-200">Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoRow icon={<User className="w-4 h-4" />} label="Full Name" value={`${emp.firstName} ${emp.lastName}`} />
                  <InfoRow icon={<Building2 className="w-4 h-4" />} label="Email" value={emp.email} />
                  <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={emp.phone || "Not provided"} />
                  <InfoRow icon={<Calendar className="w-4 h-4" />} label="Date of Birth" value={emp.dateOfBirth ? formatDate(emp.dateOfBirth) : "Not provided"} />
                  {emp.address?.city && (
                    <InfoRow
                      icon={<MapPin className="w-4 h-4" />}
                      label="Location"
                      value={[emp.address.city, emp.address.state, emp.address.country].filter(Boolean).join(", ")}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700">Work Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow icon={<Building2 className="w-4 h-4" />} label="Department" value={emp.department?.name || "—"} />
                <InfoRow icon={<User className="w-4 h-4" />} label="Designation" value={emp.designation} />
                <InfoRow icon={<Calendar className="w-4 h-4" />} label="Joining Date" value={formatDate(emp.joiningDate)} />
                <InfoRow
                  icon={<User className="w-4 h-4" />}
                  label="Reporting Manager"
                  value={emp.reportingManager ? `${emp.reportingManager.firstName} ${emp.reportingManager.lastName}` : "—"}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700">Leave Balance</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {Object.entries(emp.leaveBalance || {}).map(([type, balance]) => (
                  <div key={type} className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xl font-bold text-blue-600">{balance as number}</p>
                    <p className="text-xs text-slate-500 capitalize mt-0.5">{type}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary" className="mt-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700">Salary Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="space-y-2.5 text-sm max-w-sm">
                <SalaryRow label="Basic" value={formatCurrency(emp.salary?.basic)} />
                <SalaryRow label="HRA" value={formatCurrency(emp.salary?.hra)} />
                <SalaryRow label="Allowances" value={formatCurrency(emp.salary?.allowances)} />
                <Separator className="my-3" />
                <SalaryRow label="Gross Pay" value={formatCurrency(grossPay)} bold />
                <SalaryRow label="Deductions" value={`- ${formatCurrency(emp.salary?.deductions)}`} className="text-red-500" />
                <Separator className="my-3" />
                <SalaryRow label="Net Pay" value={formatCurrency(grossPay - (emp.salary?.deductions || 0))} bold className="text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="mt-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700">My Documents</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <EmployeeDocuments employeeId={employeeId} canUpload={true} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ID Card */}
        <TabsContent value="idcard" className="mt-4">
          <EmployeeIDCard emp={emp} />
        </TabsContent>
      </Tabs>

      {showResign && (
        <ResignModal
          employeeId={employeeId}
          employeeName={`${emp.firstName} ${emp.lastName}`}
          resignation={emp.resignation}
          isHR={false}
          isOwner={true}
          onClose={() => setShowResign(false)}
        />
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
      <div className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

function SalaryRow({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className={`flex justify-between items-center ${bold ? "font-bold" : ""} ${className || ""}`}>
      <span className={bold ? "text-slate-900" : "text-slate-500"}>{label}</span>
      <span className={bold ? "text-slate-900" : "text-slate-700"}>{value}</span>
    </div>
  );
}
