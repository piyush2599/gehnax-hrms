"use client";

import { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "sonner";
import { Search, Shield, ShieldCheck, User, Users, Loader2, Lock, Eye, EyeOff, ShieldAlert, ShieldOff, Clock, KeyRound } from "lucide-react";
import { getInitials, formatDate } from "@/lib/utils";
import AdminMFAModal from "./AdminMFAModal";
import ResetPasswordModal from "./ResetPasswordModal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "hr_admin",    label: "HR Admin" },
  { value: "manager",     label: "Manager" },
  { value: "employee",    label: "Employee" },
];

const ROLE_STYLE: Record<string, string> = {
  super_admin: "bg-violet-50 text-violet-700 border-violet-200",
  hr_admin:    "bg-blue-50 text-blue-700 border-blue-200",
  manager:     "bg-amber-50 text-amber-700 border-amber-200",
  employee:    "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STAT_ICONS: Record<string, React.ReactNode> = {
  super_admin: <ShieldCheck className="w-5 h-5 text-violet-500" />,
  hr_admin:    <Shield className="w-5 h-5 text-blue-500" />,
  manager:     <Users className="w-5 h-5 text-amber-500" />,
  employee:    <User className="w-5 h-5 text-emerald-500" />,
};

interface PendingChange {
  userId: string;
  userName: string;
  currentRole: string;
  newRole: string;
}

export default function RolesClient() {
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.role === "super_admin";
  const myId = (session?.user as any)?.id;

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // MFA modal state
  const [mfaTarget, setMfaTarget] = useState<any | null>(null);

  // Reset password modal state
  const [pwResetTarget, setPwResetTarget] = useState<any | null>(null);

  // Password confirmation modal state
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pwError, setPwError] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);

  const params = new URLSearchParams();
  if (search)     params.set("search", search);
  if (filterRole) params.set("role", filterRole);

  const { data, isLoading, mutate } = useSWR(
    `/api/users?${params.toString()}`,
    fetcher,
    { keepPreviousData: true }
  );

  const users: any[] = data?.users || [];
  const roleCounts: Record<string, number> = data?.roleCounts || {};

  // Step 1: capture the change and open the modal
  const requestRoleChange = useCallback((userId: string, userName: string, currentRole: string, newRole: string) => {
    if (newRole === currentRole) return;
    setPending({ userId, userName, currentRole, newRole });
    setPassword("");
    setPwError("");
    setShowPassword(false);
    setTimeout(() => passwordRef.current?.focus(), 80);
  }, []);

  // Step 2: submit with password
  const confirmRoleChange = useCallback(async () => {
    if (!pending) return;
    if (!password.trim()) { setPwError("Please enter your password"); return; }

    setConfirming(true);
    setPwError("");
    setUpdatingId(pending.userId);

    try {
      const res = await fetch(`/api/users/${pending.userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: pending.newRole, password }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setPwError("Incorrect password. Please try again.");
        } else {
          toast.error(json.error || "Failed to update role");
          setPending(null);
        }
        return;
      }

      toast.success(`${pending.userName}'s role updated to ${ROLES.find(r => r.value === pending.newRole)?.label}`);
      mutate();
      setPending(null);
    } finally {
      setConfirming(false);
      setUpdatingId(null);
    }
  }, [pending, password, mutate]);

  const cancelModal = () => {
    if (confirming) return;
    setPending(null);
    setPassword("");
    setPwError("");
  };

  return (
    <div className="space-y-6">
      {/* Password confirmation modal — rendered via portal so fixed covers the full viewport */}
      {pending && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={cancelModal}
          />

          {/* Modal */}
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 animate-scale-in">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-amber-50 rounded-xl">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Confirm Role Change</h3>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                You are changing <span className="font-semibold text-slate-700">{pending.userName}</span>'s role from{" "}
                <Badge variant="outline" className={`text-xs ${ROLE_STYLE[pending.currentRole]}`}>
                  {ROLES.find(r => r.value === pending.currentRole)?.label}
                </Badge>{" "}
                to{" "}
                <Badge variant="outline" className={`text-xs ${ROLE_STYLE[pending.newRole]}`}>
                  {ROLES.find(r => r.value === pending.newRole)?.label}
                </Badge>
              </p>
            </div>

            {/* Password field */}
            <div className="px-6 py-5 space-y-3">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Enter your Super Admin password
              </label>
              <div className="relative">
                <Input
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPwError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && confirmRoleChange()}
                  className={pwError ? "border-red-400 ring-red-500/15 pr-10" : "pr-10"}
                  disabled={confirming}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pwError && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
                  {pwError}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={cancelModal} disabled={confirming}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={confirmRoleChange} loading={confirming}>
                Confirm Change
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reset password modal */}
      {pwResetTarget && (
        <ResetPasswordModal
          userId={pwResetTarget._id}
          userName={pwResetTarget.name}
          userEmail={pwResetTarget.email}
          onClose={() => setPwResetTarget(null)}
          onSuccess={() => mutate()}
        />
      )}

      {/* MFA management modal */}
      {mfaTarget && (
        <AdminMFAModal
          userId={mfaTarget._id}
          userName={mfaTarget.name}
          userEmail={mfaTarget.email}
          mfaEnabled={!!mfaTarget.mfaEnabled}
          mfaSkipCount={mfaTarget.mfaSkipCount ?? 0}
          mfaDisabledUntil={mfaTarget.mfaDisabledUntil}
          mfaForceSetup={!!mfaTarget.mfaForceSetup}
          onClose={() => setMfaTarget(null)}
          onSuccess={() => mutate()}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {ROLES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilterRole(filterRole === value ? "" : value)}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
              filterRole === value
                ? "border-blue-400 bg-blue-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="p-2 rounded-lg bg-slate-50">
              {STAT_ICONS[value]}
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{roleCounts[value] ?? 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Search & filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-9 h-9 border-slate-200"
          />
        </div>
        {filterRole && (
          <button onClick={() => setFilterRole("")} className="text-xs text-blue-600 hover:underline">
            Clear filter
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">User</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Employee</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Last Login</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-slate-400 text-sm">No users found</td>
              </tr>
            ) : (
              users.map((user) => {
                const isMe = user._id === myId;
                const emp = user.employeeId;
                return (
                  <tr key={user._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    {/* User */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 leading-tight truncate">
                            {user.name}
                            {isMe && <span className="ml-1.5 text-[10px] font-medium text-slate-400">(you)</span>}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Linked employee */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      {emp ? (
                        <div>
                          <p className="font-medium text-slate-700 text-sm">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-slate-400">{emp.employeeCode}</p>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Last login */}
                    <td className="px-4 py-3.5 hidden md:table-cell text-slate-500 text-xs">
                      {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className={user.isActive
                          ? "text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "text-xs bg-red-50 text-red-600 border-red-200"}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>

                    {/* Role + MFA manage */}
                    <td className="px-4 py-3.5">
                      {isSuperAdmin && !isMe ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <NativeSelect
                              value={user.role}
                              onChange={(e) => requestRoleChange(user._id, user.name, user.role, e.target.value)}
                              disabled={updatingId === user._id}
                              className="h-7 text-xs w-36 border-slate-200"
                            >
                              {ROLES.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </NativeSelect>
                            {updatingId === user._id && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <MfaCell user={user} onManage={() => setMfaTarget(user)} isMe={false} />
                            <button
                              onClick={() => setPwResetTarget(user)}
                              className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Reset password"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline" className={`text-xs ${ROLE_STYLE[user.role] || ""}`}>
                          {ROLES.find(r => r.value === user.role)?.label ?? user.role}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 text-center">
        {isSuperAdmin
          ? "Role changes take effect within 1 hour, or immediately on the user's next login."
          : "Only Super Admin can change user roles."}
      </p>
    </div>
  );
}

function MfaCell({ user, onManage, isMe }: { user: any; onManage: () => void; isMe: boolean }) {
  const now = new Date();
  const isTempBypassed = user.mfaEnabled &&
    user.mfaDisabledUntil && new Date(user.mfaDisabledUntil) > now;

  let badge: React.ReactNode;
  if (user.mfaForceSetup) {
    badge = (
      <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200 gap-1">
        <ShieldAlert className="w-3 h-3" /> Force Setup
      </Badge>
    );
  } else if (isTempBypassed) {
    badge = (
      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 gap-1">
        <Clock className="w-3 h-3" /> Bypassed
      </Badge>
    );
  } else if (user.mfaEnabled) {
    badge = (
      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
        <ShieldCheck className="w-3 h-3" /> Enabled
      </Badge>
    );
  } else {
    badge = (
      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 border-slate-200 gap-1">
        <ShieldOff className="w-3 h-3" /> Not Set
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {badge}
      {!isMe && (
        <button
          onClick={onManage}
          className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title="Manage MFA"
        >
          <Shield className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
