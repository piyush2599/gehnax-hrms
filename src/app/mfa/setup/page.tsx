"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  ShieldCheck, Copy, RefreshCw, Loader2,
  AlertTriangle, CheckCircle2, SkipForward, Shield, KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ── 30-second countdown ring ── */
function OtpTimer({ onExpire }: { onExpire: () => void }) {
  const getSecsLeft = () => 30 - (Math.floor(Date.now() / 1000) % 30);
  const [secs, setSecs] = useState(getSecsLeft);

  useEffect(() => {
    const id = setInterval(() => {
      const s = getSecsLeft();
      setSecs(s);
      if (s === 30) onExpire();
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const r    = 14;
  const circ = 2 * Math.PI * r;
  const offset   = circ * (1 - secs / 30);
  const isDanger = secs <= 4;
  const isLow    = secs <= 8;
  const color    = isDanger ? "#f87171" : isLow ? "#fbbf24" : "#60a5fa";

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-9 h-9 flex-shrink-0">
        <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
          <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeOpacity={0.2} strokeWidth="3" />
          <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.85s linear, stroke 0.3s" }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold" style={{ color }}>
          {secs}
        </span>
      </div>
      <span className="text-xs" style={{ color }}>
        {isDanger ? "Expiring! Get a new code." : isLow ? "Code expiring soon…" : "Code refreshes every 30 s"}
      </span>
    </div>
  );
}

/* ── 6-box OTP input ── */
function OtpInput({ value, onChange, onComplete, disabled }: {
  value: string; onChange: (v: string) => void; onComplete?: () => void; disabled?: boolean;
}) {
  const refs   = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const set = (i: number, char: string) => {
    const arr = Array.from({ length: 6 }, (_, j) => value[j] ?? "");
    arr[i] = char;
    const next = arr.join("").slice(0, 6);
    onChange(next);
    if (char && i < 5) refs.current[i + 1]?.focus();
    if (char && i === 5 && next.replace(/\s/g, "").length === 6) onComplete?.();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[i] && i > 0) { set(i - 1, ""); refs.current[i - 1]?.focus(); }
      else set(i, "");
    } else if (e.key === "ArrowLeft"  && i > 0) refs.current[i - 1]?.focus();
    else if  (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) { set(i, ""); return; }
    if (raw.length > 1) {
      const chars = raw.slice(0, 6 - i).split("");
      const arr   = Array.from({ length: 6 }, (_, j) => value[j] ?? "");
      chars.forEach((c, idx) => { arr[i + idx] = c; });
      const next = arr.join("").slice(0, 6);
      onChange(next);
      refs.current[Math.min(i + chars.length, 5)]?.focus();
      if (next.replace(/\s/g, "").length === 6) onComplete?.();
    } else {
      set(i, raw);
    }
  };

  useEffect(() => { refs.current[0]?.focus(); }, []);

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={1}
          value={d} placeholder="–"
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          className={[
            "w-11 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all",
            "bg-white text-slate-900 placeholder:text-slate-300",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            d ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-300 hover:border-slate-400",
            "focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

interface SetupData { qrImage: string; secret: string; mandatory: boolean; remaining: number; }

export default function MfaSetupPage() {
  const [data,      setData]      = useState<SetupData | null>(null);
  const [loadingQr, setLoadingQr] = useState(true);
  const [otp,       setOtp]       = useState("");
  const [otpError,  setOtpError]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [skipping,  setSkipping]  = useState(false);
  const [copied,    setCopied]    = useState(false);

  const fetchSetup = async () => {
    setLoadingQr(true); setOtp(""); setOtpError("");
    try {
      const res = await fetch("/api/auth/mfa/generate");
      if (res.status === 400) {
        const json = await res.json();
        if (json.error === "MFA already enabled") {
          // Already enabled — just go to dashboard
          window.location.replace("/dashboard");
          return;
        }
      }
      if (!res.ok) { toast.error("Failed to generate QR code. Please refresh."); return; }
      setData(await res.json());
    } finally { setLoadingQr(false); }
  };

  useEffect(() => { fetchSetup(); }, []);

  const handleCodeExpire = useCallback(() => {
    if (otp) { setOtp(""); setOtpError("Code expired — get the new code from your app."); }
  }, [otp]);

  const copySecret = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.secret.replace(/\s/g, ""));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    toast.success("Secret copied");
  };

  const handleEnable = async () => {
    if (otp.replace(/\s/g, "").length !== 6) { setOtpError("Enter all 6 digits"); return; }
    setLoading(true); setOtpError("");
    try {
      const res  = await fetch("/api/auth/mfa/setup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const json = await res.json();
      if (!res.ok) { setOtpError(json.error || "Invalid code. Try again."); return; }
      toast.success("Two-factor authentication enabled!");
      // API sets mfa-complete cookie — middleware reads it and allows /dashboard
      window.location.replace("/dashboard");
    } finally { setLoading(false); }
  };

  const handleSkip = async () => {
    setSkipping(true);
    try {
      const res  = await fetch("/api/auth/mfa/skip", { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error); return; }
      const left = json.remaining;
      toast.info(left > 0 ? `Skipped. ${left} skip${left === 1 ? "" : "s"} remaining.` : "Last skip used. MFA required next login.");
      window.location.replace("/dashboard");
    } finally { setSkipping(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-4 py-6">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-3 shadow-lg shadow-blue-500/40">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Set Up Two-Factor Auth</h1>
          <p className="text-blue-300 mt-1 text-sm">Scan the QR code, then enter the code to verify</p>
        </div>

        {/* Skip banner */}
        {data?.mandatory ? (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">
              <span className="font-semibold">Setup is mandatory.</span> You have used all your skips.
            </p>
          </div>
        ) : data && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <SkipForward className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-300">
              You can skip <span className="font-bold text-amber-200">{data.remaining} more time{data.remaining !== 1 ? "s" : ""}</span> before MFA becomes mandatory.
            </p>
          </div>
        )}

        {/* Main card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl">

          {/* Step 1 */}
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-xs text-blue-300 font-semibold uppercase tracking-wider mb-2.5">
              Step 1 · Install Google Authenticator
            </p>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow">
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Google Authenticator</p>
                <p className="text-blue-300 text-xs mt-0.5">Available on iOS App Store &amp; Google Play</p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="px-5 py-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-blue-300 font-semibold uppercase tracking-wider">
                Step 2 · Scan QR Code
              </p>
              <button onClick={fetchSetup} disabled={loadingQr} title="Regenerate"
                className="p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingQr ? "animate-spin" : ""}`} />
              </button>
            </div>

            {loadingQr ? (
              <div className="flex items-center justify-center gap-3 py-6">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <span className="text-blue-300 text-sm">Generating…</span>
              </div>
            ) : data ? (
              <div className="flex gap-4 items-center">
                <div className="flex-shrink-0 p-2 bg-white rounded-xl shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={data.qrImage} alt="MFA QR Code" width={120} height={120} className="w-[120px] h-[120px]" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-white text-xs leading-relaxed">
                    Open Google Authenticator → tap <strong>+</strong> → <strong>Scan QR code</strong>, then point camera here.
                  </p>
                  <div>
                    <p className="text-blue-400 text-[10px] mb-1">Can't scan? Enter manually:</p>
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-black/30 border border-white/10">
                      <code className="flex-1 text-white text-[10px] font-mono tracking-wider select-all truncate">
                        {data.secret}
                      </code>
                      <button onClick={copySecret} title="Copy"
                        className="text-blue-300 hover:text-white p-0.5 rounded flex-shrink-0 transition-colors">
                        {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-red-300 text-sm mb-2">Failed to load QR code</p>
                <button onClick={fetchSetup} className="text-xs text-blue-400 underline">Try again</button>
              </div>
            )}
          </div>

          {/* Step 3 */}
          <div className="px-5 py-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 flex-shrink-0">
                <KeyRound className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                Step 3 · Enter the Code from Your App
              </p>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-blue-400/40 bg-blue-500/5 p-4 space-y-4">
              <p className="text-center text-blue-200 text-sm font-medium">
                Your app shows a 6-digit code — type it in the boxes below:
              </p>

              {data && <OtpTimer onExpire={handleCodeExpire} />}

              <OtpInput
                value={otp}
                onChange={(v) => { setOtp(v); setOtpError(""); }}
                onComplete={handleEnable}
                disabled={loading || skipping || !data}
              />

              {otpError && (
                <p className="text-center text-sm text-red-400 font-medium flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                  {otpError}
                </p>
              )}

              <Button
                onClick={handleEnable}
                loading={loading}
                disabled={loading || skipping || otp.replace(/\s/g, "").length !== 6 || !data}
                className="w-full h-11 font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/30 disabled:opacity-50"
              >
                {!loading && <Shield className="w-4 h-4 mr-2" />}
                Activate Two-Factor Auth
              </Button>
            </div>

            {data && !data.mandatory && (
              <Button
                onClick={handleSkip}
                loading={skipping}
                disabled={loading || skipping}
                variant="outline"
                className="w-full mt-2 h-9 border-white/15 text-blue-300 hover:bg-white/5 hover:text-white text-sm"
              >
                {!skipping && <SkipForward className="w-3.5 h-3.5 mr-1.5" />}
                Skip for now
                <span className="ml-1.5 opacity-50 text-xs">({data.remaining} remaining)</span>
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-blue-400/50 text-xs pb-2">
          © {new Date().getFullYear()} Gehnax HRMS
        </p>
      </div>
    </div>
  );
}
