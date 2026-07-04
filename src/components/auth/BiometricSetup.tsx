"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { startRegistration } from "@simplewebauthn/browser";
import { Fingerprint, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const LS_KEY = "biometric_cred";
const LS_DISMISSED_KEY = "biometric_setup_dismissed";

export default function BiometricSetup() {
  const { data: session } = useSession();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    const check = async () => {
      // Only on mobile / PWA
      if (!isMobileOrPWA()) return;
      // WebAuthn must be supported
      if (!window.PublicKeyCredential) return;
      const supported = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!supported) return;
      // Skip if already registered for this user or permanently dismissed
      const stored = getStoredCred();
      if (stored?.userId === (session.user as any).id) return;
      if (localStorage.getItem(LS_DISMISSED_KEY) === (session.user as any).id) return;
      // Show after a short delay so the dashboard loads first
      setTimeout(() => setShow(true), 2000);
    };

    check();
  }, [session]);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const optRes = await fetch("/api/auth/webauthn/register-options");
      if (!optRes.ok) throw new Error("Failed to get options");
      const { options, challengeToken } = await optRes.json();

      const regResponse = await startRegistration(options);

      const verRes = await fetch("/api/auth/webauthn/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: regResponse, challengeToken }),
      });
      if (!verRes.ok) {
        const d = await verRes.json();
        throw new Error(d.error || "Registration failed");
      }

      // Store credential info locally (15 days from now)
      const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem(LS_KEY, JSON.stringify({
        userId:       (session!.user as any).id,
        credentialId: regResponse.id,
        expiresAt,
      }));

      toast.success("Biometric login enabled! You can now sign in with your fingerprint or face.");
      setShow(false);
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        toast.error("Biometric prompt was cancelled.");
      } else {
        toast.error(err.message || "Could not enable biometric login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(LS_DISMISSED_KEY, (session!.user as any).id);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-1.5">
              <Fingerprint className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-white text-sm">Enable Biometric Login</span>
          </div>
          <button onClick={handleDismiss} className="text-white/70 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-gray-600 text-sm leading-relaxed">
            Sign in instantly using your{" "}
            <span className="font-medium text-gray-800">fingerprint or Face ID</span>.
            No password or OTP needed — stays active for 15 days.
          </p>

          <div className="flex items-center gap-2 mt-3 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>Your biometric data never leaves your device</span>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Fingerprint className="w-4 h-4" />
              {loading ? "Setting up…" : "Enable Now"}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors rounded-xl hover:bg-gray-100"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function isMobileOrPWA(): boolean {
  if (typeof window === "undefined") return false;
  const isPWA = window.matchMedia("(display-mode: standalone)").matches
    || (window.navigator as any).standalone === true;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isPWA || isMobile;
}

function getStoredCred() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
