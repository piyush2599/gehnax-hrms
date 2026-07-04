"use client";

import { useState } from "react";
import { LocateFixed, RefreshCw, MapPin } from "lucide-react";
import { captureGPS, type GpsCoords } from "@/lib/gps";

interface Props {
  onGranted: (coords: GpsCoords) => void;
  onCancel: () => void;
  isMockBlocked?: boolean;
}

export default function GpsPermissionModal({ onGranted, onCancel, isMockBlocked }: Props) {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const handleRetry = async () => {
    setRetrying(true);
    setRetryError(null);
    const result = await captureGPS();
    setRetrying(false);
    if ("coords" in result) {
      onGranted(result.coords);
    } else {
      setRetryError(
        result.code === "permission_denied"
          ? "Location is still blocked. Please follow the steps above and try again."
          : result.error
      );
    }
  };

  if (isMockBlocked) {
    return (
      <div className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
          <div className="bg-red-600 px-5 py-4 flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2"><MapPin className="w-5 h-5 text-white" /></div>
            <div>
              <p className="text-white font-bold text-sm">Fake Location Detected</p>
              <p className="text-red-100 text-xs">Check-in is blocked</p>
            </div>
          </div>
          <div className="px-5 py-5 space-y-4">
            <p className="text-slate-700 text-sm leading-relaxed">
              A <strong>mock or fake GPS app</strong> is active on your device. Check-in is not allowed with a spoofed location.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 space-y-1.5">
              <p className="font-semibold text-slate-800">To fix:</p>
              <p>• Disable any Fake GPS / Mock Location apps</p>
              <p>• Turn off "Allow mock locations" in Android developer options</p>
              <p>• Then try checking in again</p>
            </div>
            <button onClick={onCancel} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-sm transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex items-center gap-3">
          <div className="bg-white/20 rounded-full p-2"><LocateFixed className="w-5 h-5 text-white" /></div>
          <div>
            <p className="text-white font-bold text-sm">Location Permission Required</p>
            <p className="text-blue-100 text-xs">GPS is mandatory for check-in / check-out</p>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4">
          <p className="text-slate-700 text-sm leading-relaxed">
            Your browser has <span className="font-semibold text-red-600">blocked location access</span>.
            To enable it:
          </p>

          {/* Single browser-specific instruction */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 space-y-2">
            <div className="flex items-start gap-2 text-sm text-blue-900">
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
              <span>Tap the <strong>lock 🔒</strong> or <strong>info ⓘ</strong> icon in your browser's address bar</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-blue-900">
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
              <span>Find <strong>Location</strong> in the permissions list and set it to <strong>Allow</strong></span>
            </div>
            <div className="flex items-start gap-2 text-sm text-blue-900">
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
              <span>Tap <strong>Try Again</strong> below</span>
            </div>
          </div>

          {retryError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {retryError}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} />
              {retrying ? "Checking…" : "Try Again"}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2.5 text-slate-500 hover:text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
