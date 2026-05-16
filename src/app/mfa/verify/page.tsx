"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function OtpTimer({ onExpire }: { onExpire: () => void }) {
  const getSecsLeft = () => 30 - (Math.floor(Date.now() / 1000) % 30);
  const [secs, setSecs] = useState(getSecsLeft);

  useEffect(() => {
    const id = setInterval(() => {
      const s = getSecsLeft();
      setSecs(s);
      if (s === 30) onExpire();
    }, 500);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const r      = 18;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - secs / 30);
  const color  = secs <= 4 ? "#ef4444" : secs <= 8 ? "#f59e0b" : "#3b82f6";

  return (
    <div className="flex items-center gap-2 justify-center">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s linear, stroke 0.5s" }} />
      </svg>
      <span className="text-sm font-semibold" style={{ color }}>{secs}s</span>
      <span className="text-blue-300/70 text-xs">until code refreshes</span>
    </div>
  );
}

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
          value={d} placeholder="·"
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          className={[
            "w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all",
            "bg-white text-slate-900 placeholder:text-slate-300",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            d ? "border-blue-500 shadow-sm shadow-blue-500/20" : "border-slate-300 hover:border-slate-400",
            "focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

export default function MfaVerifyPage() {
  const [otp,       setOtp]       = useState("");
  const [loading,   setLoading]   = useState(false);
  const [expireMsg, setExpireMsg] = useState("");

  const handleCodeExpire = () => { setOtp(""); setExpireMsg("Code expired — enter the new code from your app."); };

  const handleVerify = async () => {
    if (otp.length !== 6) { toast.error("Enter all 6 digits"); return; }
    setLoading(true); setExpireMsg("");
    try {
      const res  = await fetch("/api/auth/mfa/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success("Verified! Welcome back.");
      // API sets mfa-complete cookie — middleware reads it and allows /dashboard
      window.location.replace("/dashboard");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-white rounded-2xl px-6 py-3 mb-4 shadow-lg shadow-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://www.gehnax.com/Gehnax-logo.png" alt="Gehnax" className="h-10 w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-white">Two-Factor Auth</h1>
          <p className="text-blue-200 mt-2 text-sm max-w-xs mx-auto">
            Enter the 6-digit code from Google Authenticator
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-8 space-y-6">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <p className="text-blue-200 text-xs">
              Open <span className="font-semibold text-white">Google Authenticator</span> on your device and enter the code for <span className="font-semibold text-white">Gehnax HRMS</span>
            </p>
          </div>

          <OtpInput
            value={otp}
            onChange={(v) => { setOtp(v); setExpireMsg(""); }}
            onComplete={handleVerify}
            disabled={loading}
          />

          {expireMsg && (
            <p className="text-center text-amber-300 text-xs font-medium">{expireMsg}</p>
          )}

          <OtpTimer onExpire={handleCodeExpire} />

          <Button
            onClick={handleVerify}
            disabled={loading || otp.length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 font-semibold"
            loading={loading}
          >
            {!loading && "Verify Code"}
          </Button>
        </div>

        <p className="text-center text-blue-300 text-xs mt-6">
          © {new Date().getFullYear()} Gehnax HRMS
        </p>
      </div>
    </div>
  );
}
