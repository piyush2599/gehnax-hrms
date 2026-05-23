"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Shield } from "lucide-react";

export default function VerifyOfferPortalPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const handleVerify = () => {
    const t = token.trim();
    if (!t) { setError("Please enter a verification token."); return; }
    if (t.length < 10) { setError("Token appears too short. Please check and try again."); return; }
    router.push(`/verify-offer/${encodeURIComponent(t)}`);
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Verify Offer Letter</h1>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          Enter the verification token printed on your Gehnax Technologies LLP offer letter to confirm its authenticity.
        </p>
      </div>

      {/* Input card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Verification Token</Label>
          <Input
            placeholder="e.g. a3f9b2c1d4e5f6..."
            value={token}
            onChange={(e) => { setToken(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            className="font-mono text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <p className="text-xs text-slate-400">
            The token is printed at the bottom of the offer letter PDF and in the verification section.
          </p>
        </div>
        <Button onClick={handleVerify} className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
          <Search className="w-4 h-4" />
          Verify Offer Letter
        </Button>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-1">
        <p className="font-semibold">How to verify</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700 text-xs">
          <li>Locate the verification token on your offer letter PDF (bottom of page 1).</li>
          <li>Enter the token above and click "Verify Offer Letter".</li>
          <li>The portal will confirm if the letter is genuine and issued by Gehnax Technologies LLP.</li>
        </ol>
      </div>
    </div>
  );
}
