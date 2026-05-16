"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { KeyRound, Lock, Eye, EyeOff, RefreshCw, Copy, Check } from "lucide-react";

interface Props {
  userId: string;
  userName: string;
  userEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}

function generatePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "@#$!";
  const all = upper + lower + digits + special;
  let pwd = upper[Math.floor(Math.random() * upper.length)]
    + lower[Math.floor(Math.random() * lower.length)]
    + digits[Math.floor(Math.random() * digits.length)]
    + special[Math.floor(Math.random() * special.length)];
  for (let i = 0; i < 6; i++) pwd += all[Math.floor(Math.random() * all.length)];
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

export default function ResetPasswordModal({ userId, userName, userEmail, onClose, onSuccess }: Props) {
  const [newPassword, setNewPassword]       = useState("");
  const [adminPassword, setAdminPassword]   = useState("");
  const [showNew, setShowNew]               = useState(false);
  const [showAdmin, setShowAdmin]           = useState(false);
  const [loading, setLoading]               = useState(false);
  const [newPwError, setNewPwError]         = useState("");
  const [adminPwError, setAdminPwError]     = useState("");
  const [copied, setCopied]                 = useState(false);
  const adminRef = useRef<HTMLInputElement>(null);

  const handleGenerate = () => {
    setNewPassword(generatePassword());
    setShowNew(true);
    setNewPwError("");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    let hasError = false;
    if (!newPassword || newPassword.length < 6) {
      setNewPwError("Password must be at least 6 characters"); hasError = true;
    } else setNewPwError("");
    if (!adminPassword.trim()) {
      setAdminPwError("Enter your Super Admin password"); hasError = true;
    } else setAdminPwError("");
    if (hasError) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) setAdminPwError("Incorrect password. Please try again.");
        else toast.error(data.error || "Failed to reset password");
        return;
      }
      toast.success(`Password reset for ${userName}`);
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && onClose()} />

      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-50 rounded-xl">
              <KeyRound className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Set a new login password for <span className="font-semibold text-slate-700">{userName}</span>
            <span className="text-slate-400 text-xs block mt-0.5">{userEmail}</span>
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* New password */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">New Password</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showNew ? "text" : "password"}
                  placeholder="Enter new password…"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setNewPwError(""); }}
                  className={`pr-10 ${newPwError ? "border-red-400" : ""}`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={loading}
                className="shrink-0 gap-1.5 border-slate-200"
                title="Generate random password"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Generate
              </Button>
            </div>
            {newPassword && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied!" : "Copy password"}
              </button>
            )}
            {newPwError && <p className="text-xs text-red-600 font-medium">{newPwError}</p>}
          </div>

          {/* Admin password confirmation */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Your Super Admin Password
            </label>
            <div className="relative">
              <Input
                ref={adminRef}
                type={showAdmin ? "text" : "password"}
                placeholder="Confirm with your password"
                value={adminPassword}
                onChange={(e) => { setAdminPassword(e.target.value); setAdminPwError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className={`pr-10 ${adminPwError ? "border-red-400" : ""}`}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowAdmin(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showAdmin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {adminPwError && <p className="text-xs text-red-600 font-medium">{adminPwError}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSubmit} loading={loading}>
            Reset Password
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
