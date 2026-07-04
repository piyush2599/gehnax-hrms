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
import { getInitials, formatDate, formatCurrency, secureDocUrl } from "@/lib/utils";
import { User, Phone, MapPin, Building2, Calendar, Pencil, FolderOpen, LogOut, IdCard, ShieldCheck, Eye, EyeOff, Check, X as XIcon, ScrollText, Download, Copy, ExternalLink, FileText } from "lucide-react";
import { validatePassword } from "@/lib/password";
import { useSession } from "next-auth/react";
import { useImpersonate } from "@/components/layout/impersonate-context";
import EmployeeDocuments from "@/components/employees/EmployeeDocuments";
import ResignModal from "@/components/employees/ResignModal";
import EmployeeIDCard from "@/components/employees/EmployeeIDCard";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ProfileClient() {
  const { data: session, status: sessionStatus } = useSession();
  const { impersonating } = useImpersonate();
  const roles: string[] = (session?.user as any)?.roles || [];
  // hr_admin (without super_admin / finance_admin) cannot view salary info
  const canViewSalary = roles.some(r => ["super_admin", "finance_admin"].includes(r)) ||
    !roles.some(r => ["hr_admin"].includes(r));
  // When super admin is impersonating, show that employee's profile
  const employeeId = impersonating?.id || (session?.user as any)?.employeeId || "";
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showResign, setShowResign] = useState(false);

  // Password change state
  const [pwForm, setPwForm] = useState({ current: "", new: "", confirm: "" });
  const [pwErrors, setPwErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  const { data: emp, isLoading } = useSWR(
    employeeId ? `/api/employees/${employeeId}` : null,
    fetcher
  );

  const { data: olData } = useSWR(
    employeeId ? `/api/employees/${employeeId}/offer-letter` : null,
    fetcher
  );
  const offerLetters: any[] = olData?.offerLetters || [];

  const { data: payrollData } = useSWR(
    employeeId ? `/api/payroll?employeeId=${employeeId}` : null,
    fetcher
  );
  const payslips: any[] = Array.isArray(payrollData) ? payrollData : [];

  const [form, setForm] = useState({
    phone: "",
    address: { street: "", city: "", state: "", country: "India", pincode: "" },
  });

  const isViewOnly = !!impersonating; // disable edits when impersonating

  const startEdit = () => {
    if (isViewOnly) return;
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

  const { rules: pwRules, valid: pwValid } = validatePassword(pwForm.new);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof pwErrors = {};
    if (!pwForm.current) errs.current = "Current password is required";
    if (!pwValid) errs.new = "Please meet all password requirements";
    if (!pwForm.confirm) errs.confirm = "Please confirm your new password";
    else if (pwForm.new !== pwForm.confirm) errs.confirm = "Passwords do not match";
    if (Object.keys(errs).length) { setPwErrors(errs); return; }

    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.new, confirmPassword: pwForm.confirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.toLowerCase().includes("current")) setPwErrors({ current: data.error });
        else if (data.error?.toLowerCase().includes("match") || data.error?.toLowerCase().includes("confirm")) setPwErrors({ confirm: data.error });
        else setPwErrors({ new: data.error });
        return;
      }
      toast.success("Password changed successfully");
      setPwForm({ current: "", new: "", confirm: "" });
      setPwErrors({});
    } finally { setPwLoading(false); }
  };

  if (sessionStatus === "loading" || isLoading) {
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
                {!isViewOnly && (
                <Button onClick={startEdit} variant="outline" size="sm" className="border-slate-200">
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit Profile
                </Button>
                )}
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
                ) : emp.resignation?.status !== "withdrawn" && !roles.includes("super_admin") && (
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
        <TabsList className={`grid max-w-2xl bg-slate-100 ${canViewSalary ? "grid-cols-6" : "grid-cols-5"}`}>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="work">Work</TabsTrigger>
          {canViewSalary && <TabsTrigger value="salary">Salary</TabsTrigger>}
          <TabsTrigger value="docs" className="gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" />
            Docs
          </TabsTrigger>
          <TabsTrigger value="idcard" className="gap-1.5">
            <IdCard className="w-3.5 h-3.5" />
            ID Card
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Security
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
              {(() => {
                const balance = emp.leaveBalance?.leaves ?? 0;
                const color = balance >= 10 ? "text-emerald-600" : balance >= 5 ? "text-amber-600" : "text-red-600";
                const bg    = balance >= 10 ? "bg-emerald-50 border-emerald-100" : balance >= 5 ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100";
                return (
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between px-5 py-4 rounded-xl border ${bg}`}>
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Available Leaves</p>
                        <p className={`text-3xl font-bold mt-0.5 ${color}`}>{balance} <span className="text-base font-medium text-slate-400">days</span></p>
                      </div>
                      <div className="text-right text-xs text-slate-400 space-y-1">
                        <p>+2 credited every month</p>
                        <p>Resets to 0 on Jan 1</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {canViewSalary && (
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
        )}

        <TabsContent value="docs" className="mt-4 space-y-4">
          {/* Offer Letter highlight */}
          {offerLetters.length > 0 && (
            <Card className="border-blue-200 shadow-sm bg-blue-50/40">
              <CardHeader className="pb-3 border-b border-blue-100">
                <CardTitle className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                  <ScrollText className="w-4 h-4" />
                  Your Offer Letter
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {offerLetters.slice(0, 1).map((ol: any) => {
                  const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : "https://myapp.gehnax.com"}/verify-offer/${ol.verificationToken}`;
                  return (
                    <div key={ol._id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Reference</span>
                        <span className="font-semibold text-slate-800">{ol.refNumber || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Issued On</span>
                        <span className="font-semibold text-slate-800">
                          {new Date(ol.generatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <a href={`/api/employees/${employeeId}/offer-letter/${ol._id}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <button className="w-full flex items-center justify-center gap-1.5 text-xs h-8 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors">
                            <Download className="w-3.5 h-3.5" />
                            Download PDF
                          </button>
                        </a>
                        <button
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs h-8 rounded-lg border border-blue-200 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                          onClick={() => { navigator.clipboard.writeText(verifyUrl); }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy Verify Link
                        </button>
                      </div>
                      <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="block">
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                          <ExternalLink className="w-3 h-3" />
                          <span className="truncate">{verifyUrl}</span>
                        </div>
                      </a>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Salary Slips — hidden for hr_admin */}
          {canViewSalary && (
            <Card className="border-emerald-200 shadow-sm bg-emerald-50/40">
              <CardHeader className="pb-3 border-b border-emerald-100">
                <CardTitle className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Salary Slips
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                {payslips.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No salary records found.</p>
                ) : (
                  payslips.map((p: any) => {
                    const MONTH_NAMES = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    const label = `${MONTH_NAMES[p.month] || p.month} ${p.year}`;
                    return (
                      <div key={p._id} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-emerald-100">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{label}</p>
                          <p className="text-xs text-slate-400">{p.presentDays}/{p.workingDays} days · Net ₹{(p.netPay || 0).toLocaleString("en-IN")}</p>
                        </div>
                        {p.payslipUrl ? (
                          <a href={secureDocUrl(p.payslipUrl)} target="_blank" rel="noopener noreferrer">
                            <button className="flex items-center gap-1.5 text-xs h-7 px-3 rounded-lg border border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                              <Download className="w-3.5 h-3.5" />
                              PDF
                            </button>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 px-3 py-1 rounded-lg border border-slate-200 bg-slate-50">
                            PDF pending
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          )}

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

        {/* Security — change password */}
        <TabsContent value="security" className="mt-4">
          <Card className="border-slate-200 shadow-sm max-w-md">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700">Change Password</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {/* Current password */}
                <div className="space-y-1.5">
                  <Label>Current Password</Label>
                  <div className="relative">
                    <Input
                      type={showPw.current ? "text" : "password"}
                      placeholder="Enter your current password"
                      value={pwForm.current}
                      onChange={(e) => { setPwForm((f) => ({ ...f, current: e.target.value })); setPwErrors((v) => ({ ...v, current: undefined })); }}
                      className={`pr-10 ${pwErrors.current ? "border-red-400" : ""}`}
                      disabled={pwLoading}
                    />
                    <button type="button" onClick={() => setShowPw((v) => ({ ...v, current: !v.current }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                      {showPw.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {pwErrors.current && <p className="text-xs text-red-600">{pwErrors.current}</p>}
                </div>

                {/* New password with live checklist */}
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input
                      type={showPw.new ? "text" : "password"}
                      placeholder="Min. 12 chars with complexity"
                      value={pwForm.new}
                      onChange={(e) => { setPwForm((f) => ({ ...f, new: e.target.value })); setPwErrors((v) => ({ ...v, new: undefined })); }}
                      className={`pr-10 ${pwErrors.new ? "border-red-400" : ""}`}
                      disabled={pwLoading}
                    />
                    <button type="button" onClick={() => setShowPw((v) => ({ ...v, new: !v.new }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                      {showPw.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {pwForm.new.length > 0 && (
                    <ul className="space-y-1 mt-2">
                      {pwRules.map((r) => (
                        <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.pass ? "text-emerald-600" : "text-slate-400"}`}>
                          {r.pass ? <Check className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
                          {r.label}
                        </li>
                      ))}
                    </ul>
                  )}
                  {pwErrors.new && <p className="text-xs text-red-600">{pwErrors.new}</p>}
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <Label>Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      type={showPw.confirm ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={pwForm.confirm}
                      onChange={(e) => { setPwForm((f) => ({ ...f, confirm: e.target.value })); setPwErrors((v) => ({ ...v, confirm: undefined })); }}
                      className={`pr-10 ${pwErrors.confirm ? "border-red-400" : ""}`}
                      disabled={pwLoading}
                    />
                    <button type="button" onClick={() => setShowPw((v) => ({ ...v, confirm: !v.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                      {showPw.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {pwErrors.confirm && <p className="text-xs text-red-600">{pwErrors.confirm}</p>}
                </div>

                <Button type="submit" loading={pwLoading} className="w-full gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {pwLoading ? "Updating…" : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
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
