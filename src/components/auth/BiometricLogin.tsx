"use client";

import { useEffect, useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint, Loader2 } from "lucide-react";
import { toast } from "sonner";

const LS_KEY = "biometric_cred";

interface StoredCred {
  userId: string;
  credentialId: string;
  expiresAt: string;
}

interface Props {
  callbackUrl?: string;
}

export default function BiometricLogin({ callbackUrl = "/dashboard" }: Props) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cred, setCred] = useState<StoredCred | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!window.PublicKeyCredential) return;
      const supported = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!supported) return;

      const stored = getStoredCred();
      if (!stored) return;
      // Check if credential is expired (15-day window)
      if (new Date(stored.expiresAt) < new Date()) {
        localStorage.removeItem(LS_KEY);
        return;
      }

      setCred(stored);
      setReady(true);
    };

    init();
  }, []);

  const handleBiometricLogin = async () => {
    if (!cred) return;
    setLoading(true);
    try {
      // Get authentication challenge
      const optRes = await fetch("/api/auth/webauthn/auth-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: cred.userId }),
      });

      if (!optRes.ok) {
        const d = await optRes.json();
        if (optRes.status === 404) {
          // Credential removed from server — clear local storage
          localStorage.removeItem(LS_KEY);
          setReady(false);
          toast.error("Biometric registration not found. Please log in with your password to re-register.");
          return;
        }
        throw new Error(d.error || "Failed to get challenge");
      }

      const { options, challengeToken } = await optRes.json();

      // Trigger device biometric prompt
      const authResponse = await startAuthentication(options);

      // Verify and create session
      const verRes = await fetch("/api/auth/webauthn/auth-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: authResponse, challengeToken }),
      });

      if (!verRes.ok) {
        const d = await verRes.json();
        throw new Error(d.error || "Biometric verification failed");
      }

      // Update expiry in local storage (rolling 15 days)
      const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem(LS_KEY, JSON.stringify({ ...cred, expiresAt }));

      toast.success("Signed in successfully!");
      window.location.href = callbackUrl;
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        toast.error("Biometric prompt was cancelled or timed out.");
      } else {
        toast.error(err.message || "Biometric login failed. Please try your password.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="mt-4">
      <div className="relative flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-white/20" />
        <span className="text-blue-300 text-xs font-medium">or</span>
        <div className="flex-1 h-px bg-white/20" />
      </div>

      <button
        onClick={handleBiometricLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-white/25 bg-white/10 hover:bg-white/20 disabled:opacity-60 transition-all duration-200 group"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 text-blue-200 animate-spin" />
        ) : (
          <Fingerprint className="w-5 h-5 text-blue-200 group-hover:text-white transition-colors" />
        )}
        <span className="text-blue-100 group-hover:text-white font-medium text-sm transition-colors">
          {loading ? "Verifying…" : "Sign in with Fingerprint / Face ID"}
        </span>
      </button>
    </div>
  );
}

function getStoredCred(): StoredCred | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
