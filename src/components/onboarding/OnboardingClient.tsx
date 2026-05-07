"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  UserPlus, Link2, Trash2, CheckCircle, Clock, Eye,
  AlertCircle, ClipboardCheck, User, Phone, MapPin,
  CreditCard, Shield, HeartPulse,
  Mail, FileText, BadgeCheck, KeyRound, RefreshCw,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import React from "react";
import { X } from "lucide-react";

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
  const [invites, setInvites] = useState<Invite[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null);
  const [panelVisible, setPanelVisible] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completedCreds, setCompletedCreds] = useState<{ email: string; password: string } | null>(null);

  const [form, setForm] = useState({
    employeeCode: "",
    email: "",
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

  // Animate panel open whenever selectedInvite is freshly set
  useEffect(() => {
    if (selectedInvite) {
      requestAnimationFrame(() => setPanelVisible(true));
    }
  }, [selectedInvite]);

  const closePanel = () => {
    setPanelVisible(false);
    setTimeout(() => {
      setSelectedInvite(null);
      setCompletedCreds(null);
    }, 320);
  };

  const openPanel = async (inv: Invite) => {
    setPanelVisible(false);
    setCompletedCreds(null);
    setAvatarError(false);
    // Fetch fresh data so profilePicture / formData are up-to-date
    try {
      const res = await fetch(`/api/onboarding/${inv.token}/detail`);
      const data = await res.json();
      setSelectedInvite(res.ok ? data.invite : inv);
    } catch {
      setSelectedInvite(inv);
    }
  };

  const refreshPanel = async () => {
    if (!selectedInvite) return;
    setAvatarError(false);
    try {
      const res = await fetch(`/api/onboarding/${selectedInvite.token}/detail`);
      const data = await res.json();
      if (res.ok) setSelectedInvite(data.invite);
    } catch { /* keep current */ }
    fetchInvites();
  };

  const filtered = filter === "all" ? invites : invites.filter((i) => i.status === filter);

  const counts = FILTERS.slice(1).reduce((acc, s) => {
    acc[s] = invites.filter((i) => i.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const handleCreate = async () => {
    if (!form.employeeCode || !form.email || !form.department || !form.designation || !form.joiningDate) {
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
    setForm({ employeeCode: "", email: "", firstName: "", lastName: "", department: "", designation: "", employmentType: "full_time", joiningDate: "" });
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

  const handleComplete = async () => {
    if (!selectedInvite) return;
    setCompleting(true);
    const res = await fetch(`/api/onboarding/${selectedInvite.token}/complete`, { method: "POST" });
    const data = await res.json();
    setCompleting(false);
    if (!res.ok) { toast.error(data.error); return; }
    toast.success("Employee account created successfully!");
    setCompletedCreds(data.credentials);
    fetchInvites();
    setSelectedInvite({ ...selectedInvite, status: "completed" });
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
                          {["submitted", "completed"].includes(inv.status) && (
                            <button
                              onClick={() => openPanel(inv)}
                              title="View details"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="employee@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
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

      {/* Details Side Panel */}
      {selectedInvite && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${panelVisible ? "opacity-100" : "opacity-0"}`}
            onClick={closePanel}
          />

          {/* Panel */}
          <div
            className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[680px] xl:w-[780px] bg-slate-50 shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-out ${panelVisible ? "translate-x-0" : "translate-x-full"}`}
          >
            {/* ── Sticky hero header ── */}
            <div className="flex-shrink-0 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-700 px-7 pt-5 pb-5 shadow-lg z-10">
              {/* Top row: label + actions */}
              <div className="flex items-center justify-between mb-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Onboarding Details</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshPanel}
                    title="Refresh"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={closePanel}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Profile row */}
              <div className="flex items-center gap-5">
                {selectedInvite.profilePicture && !avatarError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/onboarding/${selectedInvite.token}/photo`}
                    alt="Profile"
                    onError={() => setAvatarError(true)}
                    className="w-20 h-20 rounded-2xl object-cover border-4 border-white/20 shadow-xl flex-shrink-0"
                  />
                ) : (
                  <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center flex-shrink-0 ${
                    avatarError ? "bg-red-900/20 border-red-400/30" : "bg-white/10 border-white/10"
                  }`}>
                    <User className={`w-9 h-9 ${avatarError ? "text-red-300" : "text-white/40"}`} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-white leading-tight">
                    {displayName(selectedInvite) || selectedInvite.email}
                  </h2>
                  <p className="text-slate-300 text-sm mt-0.5">{selectedInvite.designation}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="font-mono text-[11px] bg-white/10 text-white/80 px-2.5 py-1 rounded-lg font-semibold">
                      {selectedInvite.employeeCode}
                    </span>
                    <span className="text-[11px] bg-blue-500/20 text-blue-200 border border-blue-400/20 px-2.5 py-1 rounded-lg font-medium">
                      {selectedInvite.department?.name}
                    </span>
                    <span className="text-[11px] bg-white/10 text-white/70 border border-white/10 px-2.5 py-1 rounded-lg font-medium">
                      {EMP_TYPE_LABELS[selectedInvite.employmentType]}
                    </span>
                    <Badge className={`text-xs border ${STATUS_CONFIG[selectedInvite.status].color}`}>
                      {STATUS_CONFIG[selectedInvite.status].label}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Info strip — inside header, always visible */}
              <div className="grid grid-cols-3 gap-0 mt-5 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Employee ID</p>
                  <p className="text-sm font-mono font-bold text-white mt-1">{selectedInvite.employeeCode}</p>
                </div>
                <div className="px-4 py-3 text-center border-x border-white/10">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Email</p>
                  <p className="text-sm font-medium text-white/90 mt-1 truncate">{selectedInvite.email}</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Joining Date</p>
                  <p className="text-sm font-bold text-white mt-1">
                    {new Date(selectedInvite.joiningDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-7 pb-8 space-y-4 pt-5">
                {/* ── Credentials banner ── */}
                {completedCreds && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <BadgeCheck className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-800">Employee Account Created!</p>
                        <p className="text-xs text-emerald-600 mt-0.5">Share these login credentials with the employee</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-xl px-4 py-3 border border-emerald-100">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Email</p>
                        </div>
                        <p className="text-sm font-mono font-semibold text-slate-900 break-all">{completedCreds.email}</p>
                      </div>
                      <div className="bg-white rounded-xl px-4 py-3 border border-emerald-100">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Password</p>
                        </div>
                        <p className="text-sm font-mono font-semibold text-slate-900">{completedCreds.password}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Personal Details ── */}
                <DetailCard icon={<User className="w-4 h-4" />} title="Personal Details" color="blue">
                  <TwoCol>
                    <InfoRow label="First Name" value={selectedInvite.formData?.personal?.firstName} />
                    <InfoRow label="Last Name" value={selectedInvite.formData?.personal?.lastName} />
                    <InfoRow label="Date of Birth" value={selectedInvite.formData?.personal?.dateOfBirth
                      ? new Date(selectedInvite.formData.personal.dateOfBirth).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
                      : undefined} />
                    <InfoRow label="Gender" value={selectedInvite.formData?.personal?.gender} capitalize />
                  </TwoCol>
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Phone</p>
                        <p className="text-sm text-slate-900 font-semibold mt-0.5">{selectedInvite.formData?.personal?.phone || "—"}</p>
                      </div>
                    </div>
                    {selectedInvite.formData?.personal?.address && (
                      <div className="flex items-start gap-2.5 col-span-1">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Address</p>
                          <p className="text-sm text-slate-900 font-semibold mt-0.5 leading-relaxed">
                            {[
                              selectedInvite.formData.personal.address.street,
                              selectedInvite.formData.personal.address.city,
                              selectedInvite.formData.personal.address.state,
                              selectedInvite.formData.personal.address.country,
                              selectedInvite.formData.personal.address.pincode,
                            ].filter(Boolean).join(", ") || "—"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </DetailCard>

                {/* ── Identity Documents ── */}
                <DetailCard icon={<Shield className="w-4 h-4" />} title="Identity Documents" color="violet">
                  <TwoCol>
                    <InfoRow label="PAN Number" value={selectedInvite.formData?.identity?.pan} mono />
                    <InfoRow label="Aadhaar Number" value={selectedInvite.formData?.identity?.aadhaar} mono />
                  </TwoCol>
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                    <DocStatus label="PAN Card PDF" uploaded={!!selectedInvite.documents?.panCard} />
                    <DocStatus label="Aadhaar Card PDF" uploaded={!!selectedInvite.documents?.aadhaarCard} />
                  </div>
                </DetailCard>

                {/* ── Bank Details ── */}
                <DetailCard icon={<CreditCard className="w-4 h-4" />} title="Bank Details" color="emerald">
                  <TwoCol>
                    <InfoRow label="Account Holder" value={selectedInvite.formData?.bank?.accountHolderName} />
                    <InfoRow label="Bank Name" value={selectedInvite.formData?.bank?.bankName} />
                    <InfoRow label="Account Number" value={selectedInvite.formData?.bank?.accountNumber} mono />
                    <InfoRow label="IFSC Code" value={selectedInvite.formData?.bank?.ifscCode} mono />
                  </TwoCol>
                </DetailCard>

                {/* ── Emergency Contact ── */}
                <DetailCard icon={<HeartPulse className="w-4 h-4" />} title="Emergency Contact" color="rose">
                  <TwoCol>
                    <InfoRow label="Name" value={selectedInvite.formData?.emergency?.name} />
                    <InfoRow label="Relation" value={selectedInvite.formData?.emergency?.relation} />
                    <InfoRow label="Phone" value={selectedInvite.formData?.emergency?.phone} />
                  </TwoCol>
                </DetailCard>

                {/* ── Complete Onboarding CTA ── */}
                {selectedInvite.status === "submitted" && !completedCreds && (
                  <div className="flex items-center gap-5 bg-violet-600 rounded-2xl p-5 shadow-lg shadow-violet-200">
                    <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ClipboardCheck className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">Ready to complete onboarding</p>
                      <p className="text-xs text-violet-200 mt-0.5">Review all details above, then activate the employee account</p>
                    </div>
                    <button
                      onClick={handleComplete}
                      disabled={completing}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white text-violet-700 rounded-xl text-sm font-bold hover:bg-violet-50 transition-colors disabled:opacity-60 shadow-sm flex-shrink-0"
                    >
                      {completing ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      {completing ? "Creating…" : "Complete Onboarding"}
                    </button>
                  </div>
                )}

                {selectedInvite.status === "completed" && !completedCreds && (
                  <div className="flex items-center gap-3 bg-emerald-600 rounded-2xl p-5">
                    <CheckCircle className="w-5 h-5 text-white flex-shrink-0" />
                    <p className="text-sm font-semibold text-white">Onboarding completed — employee account is active</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const CARD_COLORS: Record<string, string> = {
  blue:   "bg-blue-50 text-blue-600 border-blue-100",
  violet: "bg-violet-50 text-violet-600 border-violet-100",
  emerald:"bg-emerald-50 text-emerald-600 border-emerald-100",
  rose:   "bg-rose-50 text-rose-600 border-rose-100",
};

function DetailCard({ icon, title, color, children }: {
  icon: React.ReactNode; title: string; color: string; children: React.ReactNode;
}) {
  const cls = CARD_COLORS[color] ?? CARD_COLORS.blue;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${cls.split(" ").pop()} bg-gradient-to-r from-slate-50 to-white`}>
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${cls}`}>
          {icon}
        </div>
        <p className="text-sm font-bold text-slate-800">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>;
}

function InfoRow({ label, value, mono, capitalize }: { label: string; value?: string; mono?: boolean; capitalize?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-sm text-slate-900 font-medium mt-0.5 ${mono ? "font-mono" : ""} ${capitalize ? "capitalize" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

function DocStatus({ label, uploaded }: { label: string; uploaded: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border ${
      uploaded ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
    }`}>
      <FileText className={`w-4 h-4 flex-shrink-0 ${uploaded ? "text-emerald-500" : "text-slate-400"}`} />
      <div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className={`text-xs font-semibold mt-0.5 ${uploaded ? "text-emerald-700" : "text-slate-400"}`}>
          {uploaded ? "Uploaded & Encrypted" : "Not Uploaded"}
        </p>
      </div>
    </div>
  );
}
