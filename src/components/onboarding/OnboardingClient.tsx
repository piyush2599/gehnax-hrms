"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  UserPlus, Link2, Trash2, CheckCircle, Clock, Eye,
  AlertCircle, ClipboardCheck,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import React from "react";

interface Invite {
  _id: string;
  token: string;
  profilePicture?: string;
  employeeCode: string;
  email: string;
  firstName?: string;
  lastName?: string;
  department: { _id: string; name: string };
  designation: string;
  employmentType: string;
  joiningDate: string;
  status: "pending" | "in_progress" | "submitted" | "completed" | "expired";
  expiresAt: string;
  documents?: { panCard?: string; aadhaarCard?: string };
  formData?: {
    personal?: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      gender?: string;
      phone?: string;
      address?: { street?: string; city?: string; state?: string; country?: string; pincode?: string };
    };
    identity?: { pan?: string; aadhaar?: string };
    bank?: { accountNumber?: string; bankName?: string; ifscCode?: string; accountHolderName?: string };
    emergency?: { name?: string; relation?: string; phone?: string };
  };
  createdBy: { name: string };
  createdAt: string;
}

interface Department {
  _id: string;
  name: string;
}

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200" },
  in_progress: { label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200" },
  submitted: { label: "Submitted", color: "bg-violet-50 text-violet-700 border-violet-200" },
  completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  expired: { label: "Expired", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

const EMP_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
};

const FILTERS = ["all", "pending", "in_progress", "submitted", "completed", "expired"] as const;

export default function OnboardingClient() {
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    employeeCode: "",
    email: "",
    personalEmail: "",
    firstName: "",
    lastName: "",
    department: "",
    designation: "",
    employmentType: "full_time",
    joiningDate: "",
  });

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/onboarding");
    const data = await res.json();
    setInvites(data.invites || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInvites();
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(Array.isArray(d) ? d : []));
  }, [fetchInvites]);

  const openDetail = (inv: Invite) => {
    router.push(`/onboarding/invites/${inv.token}`);
  };

  const filtered = filter === "all" ? invites : invites.filter((i) => i.status === filter);

  const counts = FILTERS.slice(1).reduce((acc, s) => {
    acc[s] = invites.filter((i) => i.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const handleCreate = async () => {
    if (!form.employeeCode || !form.email || !form.personalEmail || !form.department || !form.designation || !form.joiningDate) {
      toast.error("Please fill all required fields");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { toast.error(data.error); return; }
    toast.success("Onboarding invite created");
    setShowCreate(false);
    setForm({ employeeCode: "", email: "", personalEmail: "", firstName: "", lastName: "", department: "", designation: "", employmentType: "full_time", joiningDate: "" });
    fetchInvites();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/onboarding/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const handleDelete = async (invite: Invite) => {
    if (!confirm(`Cancel onboarding invite for ${invite.employeeCode}?`)) return;
    const res = await fetch(`/api/onboarding/${invite.token}`, { method: "DELETE" });
    if (res.ok) { toast.success("Invite cancelled"); fetchInvites(); }
    else { const d = await res.json(); toast.error(d.error); }
  };

  const displayName = (inv: Invite) => {
    const fn = inv.formData?.personal?.firstName || inv.firstName;
    const ln = inv.formData?.personal?.lastName || inv.lastName;
    return fn || ln ? `${fn || ""} ${ln || ""}`.trim() : "—";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Employee Onboarding</h2>
          <p className="text-sm text-slate-500 mt-0.5">Create invite links for new employees to fill their details</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          New Invite
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(["pending", "in_progress", "submitted", "completed", "expired"] as const).map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{cfg.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{counts[s] || 0}</p>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && counts[f] ? (
              <span className="ml-1.5 bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5 text-[10px]">
                {counts[f]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
            <ClipboardCheck className="w-8 h-8 text-slate-300" />
            <p className="text-sm font-medium">No onboarding invites found</p>
            <p className="text-xs text-slate-400">Create a new invite to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Employee ID", "Name", "Email", "Department", "Joining Date", "Status", "Expires", "Actions"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 bg-slate-50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inv) => {
                  const cfg = STATUS_CONFIG[inv.status];
                  return (
                    <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg font-semibold">
                          {inv.employeeCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 font-medium">{displayName(inv)}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{inv.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{inv.department?.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(inv.joiningDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {inv.status === "completed" ? "—" : new Date(inv.expiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {["pending", "in_progress", "submitted"].includes(inv.status) && (
                            <button
                              onClick={() => copyLink(inv.token)}
                              title="Copy invite link"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => openDetail(inv)}
                            title="View details"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {inv.status !== "completed" && inv.status !== "expired" && (
                            <button
                              onClick={() => handleDelete(inv)}
                              title="Cancel invite"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Invite Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900">New Onboarding Invite</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID <span className="text-red-500">*</span></label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="EMP-001"
                  value={form.employeeCode}
                  onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="employee@gehnax.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Personal Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="employee@gmail.com"
                value={form.personalEmail}
                onChange={(e) => setForm({ ...form, personalEmail: e.target.value })}
              />
              <p className="text-xs text-slate-400 mt-1">Login credentials will be sent to this email</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">First Name <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Pre-fill for employee"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Pre-fill for employee"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department <span className="text-red-500">*</span></label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Designation <span className="text-red-500">*</span></label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Software Engineer"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.employmentType}
                  onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
                >
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.joiningDate}
                  onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>An onboarding link valid for 7 days will be generated. Share it with the employee so they can fill in their details. Their login password will be set to the Employee ID.</span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create Invite"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
