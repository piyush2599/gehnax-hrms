"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, Eye, EyeOff, ShieldCheck, LogOut } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { data: session, update } = useSession();

  const [newPassword, setNewPassword]       = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew]               = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [loading, setLoading]               = useState(false);
  const [errors, setErrors]                 = useState<{ new?: string; confirm?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!newPassword || newPassword.length < 6) e.new = "Password must be at least 6 characters";
    if (!confirmPassword) e.confirm = "Please confirm your password";
    else if (newPassword !== confirmPassword) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.toLowerCase().includes("confirm") || data.error?.toLowerCase().includes("match")) {
          setErrors({ confirm: data.error });
        } else {
          setErrors({ new: data.error });
        }
        return;
      }

      toast.success("Password changed successfully! Please log in again.");
      await signOut({ callbackUrl: "/login" });
    } finally {
      setLoading(false);
    }
  };

  const userName = (session?.user as any)?.name || session?.user?.email || "there";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Set a new password</h1>
          <p className="text-sm text-slate-500">
            Hi <span className="font-semibold text-slate-700">{userName}</span>, your account has a temporary password.
            <br />Please set a new password to continue.
          </p>
        </div>

        {/* Card */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New password */}
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setErrors(v => ({ ...v, new: undefined })); }}
                    className={`pr-10 ${errors.new ? "border-red-400" : ""}`}
                    disabled={loading}
                    autoFocus
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
                {errors.new && <p className="text-xs text-red-600">{errors.new}</p>}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label>Confirm Password</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setErrors(v => ({ ...v, confirm: undefined })); }}
                    className={`pr-10 ${errors.confirm ? "border-red-400" : ""}`}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirm && <p className="text-xs text-red-600">{errors.confirm}</p>}
              </div>

              {/* Password rules hint */}
              <ul className="text-xs text-slate-400 space-y-0.5 pl-4 list-disc">
                <li>At least 6 characters long</li>
                <li>Must be different from your current password</li>
              </ul>

              <Button
                type="submit"
                loading={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {loading ? "Updating…" : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sign out link */}
        <div className="text-center">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1.5 mx-auto"
          >
            <LogOut className="w-3 h-3" />
            Sign out instead
          </button>
        </div>
      </div>
    </div>
  );
}
