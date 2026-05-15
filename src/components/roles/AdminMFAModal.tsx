"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  X, Shield, ShieldOff, ShieldAlert, ShieldCheck, ShieldX,
  Clock, RefreshCw, Lock, Eye, EyeOff, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Props {
  userId: string;
  userName: string;
  userEmail: string;
  mfaEnabled: boolean;
  mfaSkipCount: number;
  mfaDisabledUntil?: string | null;
  mfaForceSetup?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DURATION_OPTIONS = [
  { label: "1 hour",   hours: 1 },
  { label: "4 hours",  hours: 4 },
  { label: "12 hours", hours: 12 },
  { label: "24 hours", hours: 24 },
  { label: "3 days",   hours: 72 },
  { label: "7 days",   hours: 168 },
];

type Action = "disable" | "disable_temp" | "force_reregister" | "remove_override";

function getMfaStatus(
  mfaEnabled: boolean,
  mfaSkipCount: number,
  mfaDisabledUntil?: string | null,
  mfaForceSetup?: boolean
): { label: string; cls: string; icon: React.ReactNode; description: string } {
  const now = new Date();

  if (mfaEnabled && mfaDisabledUntil && new Date(mfaDisabledUntil) > now) {
    return {
      label: "Temporarily Bypassed",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Clock className="w-4 h-4" />,
      description: `MFA is enabled but bypassed until ${formatDate(mfaDisabledUntil)}`,
    };
  }
  if (mfaForceSetup) {
    return {
      label: "Force Re-register",
      cls: "bg-orange-50 text-orange-700 border-orange-200",
      icon: <ShieldAlert className="w-4 h-4" />,
      description: "User must set up MFA fresh — no skipping allowed",
    };
  }
  if (mfaEnabled) {
    return {
      label: "Enabled",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <ShieldCheck className="w-4 h-4" />,
      description: "Two-factor authentication is active",
    };
  }
  return {
    label: "Not Set Up",
    cls: "bg-slate-50 text-slate-500 border-slate-200",
    icon: <ShieldOff className="w-4 h-4" />,
    description: `User skipped setup ${mfaSkipCount ?? 0}/5 times`,
  };
}

export default function AdminMFAModal({
  userId, userName, userEmail,
  mfaEnabled, mfaSkipCount, mfaDisabledUntil, mfaForceSetup,
  onClose, onSuccess,
}: Props) {
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [tempHours, setTempHours]           = useState<number>(4);
  const [customHours, setCustomHours]       = useState("");
  const [useCustom, setUseCustom]           = useState(false);
  const [password, setPassword]             = useState("");
  const [showPw, setShowPw]                 = useState(false);
  const [pwError, setPwError]               = useState("");
  const [loading, setLoading]               = useState(false);

  const now = new Date();
  const isTempBypassed = mfaEnabled && mfaDisabledUntil && new Date(mfaDisabledUntil) > now;
  const hasOverride    = isTempBypassed || mfaForceSetup;
  const status         = getMfaStatus(mfaEnabled, mfaSkipCount, mfaDisabledUntil, mfaForceSetup);

  const ACTIONS = [
    ...(mfaEnabled || mfaForceSetup ? [{
      id: "disable" as Action,
      icon: <ShieldX className="w-5 h-5 text-red-500" />,
      title: "Disable MFA Permanently",
      desc: "Removes MFA entirely. User will be prompted to set it up again on next login.",
      cls: "border-red-100 hover:border-red-300 hover:bg-red-50/50",
      selectedCls: "border-red-400 bg-red-50",
    }] : []),
    ...(mfaEnabled ? [{
      id: "disable_temp" as Action,
      icon: <Clock className="w-5 h-5 text-amber-500" />,
      title: "Disable Temporarily",
      desc: "MFA is bypassed for a set duration. Ideal when the user lost their device temporarily.",
      cls: "border-amber-100 hover:border-amber-300 hover:bg-amber-50/50",
      selectedCls: "border-amber-400 bg-amber-50",
    }] : []),
    ...(!mfaEnabled && !mfaForceSetup ? [{
      id: "force_reregister" as Action,
      icon: <RefreshCw className="w-5 h-5 text-orange-500" />,
      title: "Force Re-register MFA",
      desc: "Requires the user to set up MFA on next login. Skip is not allowed.",
      cls: "border-orange-100 hover:border-orange-300 hover:bg-orange-50/50",
      selectedCls: "border-orange-400 bg-orange-50",
    }] : []),
    ...(mfaEnabled && !mfaForceSetup ? [{
      id: "force_reregister" as Action,
      icon: <RefreshCw className="w-5 h-5 text-orange-500" />,
      title: "Force Re-register MFA",
      desc: "Wipes the current secret and forces fresh setup on next login. No skipping.",
      cls: "border-orange-100 hover:border-orange-300 hover:bg-orange-50/50",
      selectedCls: "border-orange-400 bg-orange-50",
    }] : []),
    ...(hasOverride ? [{
      id: "remove_override" as Action,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      title: "Remove Admin Override",
      desc: isTempBypassed
        ? "Cancel the temporary bypass. MFA will be enforced again immediately."
        : "Cancel the forced re-register. User's existing MFA state is preserved.",
      cls: "border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/50",
      selectedCls: "border-emerald-400 bg-emerald-50",
    }] : []),
  ];

  const handleConfirm = async () => {
    if (!selectedAction) { toast.error("Select an action"); return; }
    if (!password.trim()) { setPwError("Enter your Super Admin password"); return; }

    const finalHours = useCustom ? Number(customHours) : tempHours;
    if (selectedAction === "disable_temp" && (!finalHours || finalHours <= 0)) {
      toast.error("Enter a valid duration"); return;
    }

    setLoading(true);
    setPwError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/mfa`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selectedAction,
          disableHours: selectedAction === "disable_temp" ? finalHours : undefined,
          password,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) { setPwError("Incorrect password. Try again."); return; }
        toast.error(json.error || "Failed"); return;
      }

      const msgs: Record<Action, string> = {
        disable:          "MFA disabled permanently",
        disable_temp:     `MFA bypassed for ${useCustom ? customHours : DURATION_OPTIONS.find(d => d.hours === tempHours)?.label}`,
        force_reregister: "User will be required to re-register MFA",
        remove_override:  "Admin override removed",
      };
      toast.success(msgs[selectedAction]);
      onSuccess();
      onClose();
    } finally { setLoading(false); }
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 animate-scale-in max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage MFA</h3>
              <p className="text-xs text-slate-500 mt-0.5">{userName} · {userEmail}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Current status */}
          <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${status.cls}`}>
            <div className="flex-shrink-0 mt-0.5">{status.icon}</div>
            <div>
              <p className="text-sm font-semibold">{status.label}</p>
              <p className="text-xs opacity-75 mt-0.5">{status.description}</p>
              {mfaDisabledUntil && new Date(mfaDisabledUntil) > now && (
                <p className="text-xs font-medium mt-1">
                  Bypass expires: <span className="font-bold">{formatDate(mfaDisabledUntil)}</span>
                </p>
              )}
            </div>
          </div>

          {/* Skip count info */}
          {!mfaEnabled && !mfaForceSetup && (
            <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
              <span>Setup skips used:</span>
              {[0,1,2,3,4].map(i => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < mfaSkipCount ? "bg-amber-400" : "bg-slate-200"}`} />
              ))}
              <span className="font-semibold">{mfaSkipCount}/5</span>
            </div>
          )}

          {/* Action selection */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Choose Action</p>
            {ACTIONS.map((a) => (
              <button
                key={a.id + a.title}
                onClick={() => setSelectedAction(a.id)}
                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                  selectedAction === a.id ? a.selectedCls : a.cls + " border-slate-100"
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">{a.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{a.desc}</p>
                </div>
                <div className={`ml-auto flex-shrink-0 mt-1 w-4 h-4 rounded-full border-2 transition-all ${
                  selectedAction === a.id ? "border-current bg-current" : "border-slate-300"
                }`} />
              </button>
            ))}
          </div>

          {/* Duration picker (for disable_temp) */}
          {selectedAction === "disable_temp" && (
            <div className="space-y-2.5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Select bypass duration
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.hours}
                    onClick={() => { setTempHours(opt.hours); setUseCustom(false); }}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      !useCustom && tempHours === opt.hours
                        ? "border-amber-400 bg-amber-100 text-amber-800"
                        : "border-amber-200 bg-white text-slate-600 hover:border-amber-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  onClick={() => setUseCustom(true)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                    useCustom
                      ? "border-amber-400 bg-amber-100 text-amber-800"
                      : "border-amber-200 bg-white text-slate-600 hover:border-amber-300"
                  }`}
                >
                  Custom…
                </button>
              </div>
              {useCustom && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="720"
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                    placeholder="e.g. 48"
                    className="h-8 text-sm w-28"
                  />
                  <span className="text-xs text-amber-700">hours</span>
                </div>
              )}
            </div>
          )}

          {/* Warning for destructive actions */}
          {(selectedAction === "disable" || selectedAction === "force_reregister") && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                {selectedAction === "disable"
                  ? "The user's current MFA device will be de-linked. They will be prompted to set up MFA again."
                  : "The user's current authenticator will stop working. They must scan a new QR code on next login."}
              </p>
            </div>
          )}

          {/* Password confirmation */}
          {selectedAction && (
            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Confirm with your Super Admin password
              </label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPwError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                  className={`pr-10 ${pwError ? "border-red-400" : ""}`}
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pwError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
                  {pwError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-slate-100 flex gap-2 flex-shrink-0">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            loading={loading}
            disabled={!selectedAction}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}
