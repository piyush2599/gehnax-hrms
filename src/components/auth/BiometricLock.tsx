"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint, Loader2, LogOut } from "lucide-react";

const LS_CRED_KEY   = "biometric_cred";
const SS_UNLOCK_KEY = "biometric_unlocked";   // sessionStorage — cleared when app killed
const SS_HIDDEN_KEY = "biometric_last_hidden"; // sessionStorage — timestamp of last hide

const LOCK_AFTER_BG_MS = 5 * 60 * 1000; // lock if backgrounded > 5 minutes

interface StoredCred { userId: string; credentialId: string; expiresAt: string }

type LockState = "checking" | "locked" | "unlocked";

export default function BiometricLock() {
  const [state, setState]       = useState<LockState>("checking");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const credRef                 = useRef<StoredCred | null>(null);

  const getStoredCred = (): StoredCred | null => {
    try { return JSON.parse(localStorage.getItem(LS_CRED_KEY) ?? "null"); }
    catch { return null; }
  };

  const lock = useCallback(() => {
    sessionStorage.removeItem(SS_UNLOCK_KEY);
    setState("locked");
  }, []);

  const unlock = useCallback(() => {
    sessionStorage.setItem(SS_UNLOCK_KEY, "1");
    setState("unlocked");
    setError(null);
  }, []);

  const triggerBiometric = useCallback(async () => {
    const cred = credRef.current;
    if (!cred) return;
    setLoading(true);
    setError(null);
    try {
      const optRes = await fetch("/api/auth/webauthn/auth-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: cred.userId }),
      });
      if (!optRes.ok) throw new Error("Could not reach server. Check your connection.");
      const { options, challengeToken } = await optRes.json();

      const authResponse = await startAuthentication(options);

      const verRes = await fetch("/api/auth/webauthn/auth-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: authResponse, challengeToken }),
      });
      if (!verRes.ok) {
        const d = await verRes.json();
        throw new Error(d.error || "Verification failed");
      }

      // Refresh local expiry
      const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem(LS_CRED_KEY, JSON.stringify({ ...cred, expiresAt }));

      unlock();
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        setError("Biometric cancelled. Tap the button to try again.");
      } else {
        setError(err.message || "Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [unlock]);

  // Initial check on mount
  useEffect(() => {
    const init = async () => {
      const cred = getStoredCred();

      // No biometric registered — nothing to lock
      if (!cred) { setState("unlocked"); return; }
      // Credential expired locally
      if (new Date(cred.expiresAt) < new Date()) {
        localStorage.removeItem(LS_CRED_KEY);
        setState("unlocked");
        return;
      }
      // WebAuthn not supported on this device
      if (!window.PublicKeyCredential) { setState("unlocked"); return; }
      const supported = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!supported) { setState("unlocked"); return; }

      credRef.current = cred;

      // Already unlocked in this session?
      if (sessionStorage.getItem(SS_UNLOCK_KEY) === "1") {
        setState("unlocked");
        return;
      }

      // Needs unlock — show lock screen then auto-trigger
      setState("locked");
    };

    init();
  }, []);

  // Auto-trigger biometric when lock screen appears
  useEffect(() => {
    if (state === "locked" && !loading && !error) {
      triggerBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Lock when app goes to background for too long
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        sessionStorage.setItem(SS_HIDDEN_KEY, String(Date.now()));
        return;
      }
      // Returning from background
      const lastHidden = Number(sessionStorage.getItem(SS_HIDDEN_KEY) ?? "0");
      if (lastHidden && Date.now() - lastHidden > LOCK_AFTER_BG_MS) {
        if (credRef.current && sessionStorage.getItem(SS_UNLOCK_KEY) === "1") {
          lock();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [lock]);

  if (state === "checking") {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (state !== "locked") return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center px-8 select-none">
      {/* App identity */}
      <div className="mb-10 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-2xl">
          <span className="text-white text-3xl font-bold">G</span>
        </div>
        <h1 className="text-white text-2xl font-bold">Gehnax HRMS</h1>
        <p className="text-slate-400 text-sm mt-1">Verify it's you to continue</p>
      </div>

      {/* Fingerprint button */}
      <button
        onClick={triggerBiometric}
        disabled={loading}
        className="w-28 h-28 rounded-full bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center mb-6 hover:bg-blue-600/30 hover:border-blue-400 transition-all duration-200 active:scale-95 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-12 h-12 text-blue-300 animate-spin" />
        ) : (
          <Fingerprint className="w-12 h-12 text-blue-300" />
        )}
      </button>

      <p className="text-slate-300 text-sm font-medium mb-2">
        {loading ? "Waiting for biometric…" : "Touch to unlock"}
      </p>

      {error && (
        <p className="text-red-400 text-xs text-center max-w-xs mt-1 mb-4 leading-relaxed">
          {error}
        </p>
      )}

      {/* Sign out fallback */}
      <button
        onClick={() => { window.location.href = "/api/auth/logout"; }}
        className="mt-10 flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        Sign out instead
      </button>
    </div>
  );
}
