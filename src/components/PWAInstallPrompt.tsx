"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Briefcase, Download, Share, X, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "pwa-prompt-dismissed-at";
const DISMISS_DAYS = 5;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

function isMobile() {
  return isIOS() || isAndroid() || window.innerWidth < 768;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Already installed — skip
    if (isStandalone()) return;

    // User dismissed recently
    const ts = localStorage.getItem(DISMISS_KEY);
    if (ts && Date.now() - Number(ts) < DISMISS_DAYS * 86_400_000) return;

    const iosDevice = isIOS();
    setIos(iosDevice);
    setMobile(isMobile());

    if (iosDevice) {
      // iOS has no beforeinstallprompt — show manual instructions after delay
      const t = setTimeout(() => setShow(true), 2500);
      return () => clearTimeout(t);
    }

    // Chrome / Edge / Android — wait for browser prompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const t = setTimeout(() => setShow(true), 2500);
      return () => clearTimeout(t);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setInstalling(false);
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      dismiss();
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setShow(false);
  };

  if (!mounted || !show) return null;

  const content = mobile ? (
    /* ── Mobile bottom sheet ─────────────────────────────── */
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={dismiss}
      />

      {/* Sheet */}
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl animate-fade-up pb-safe"
        style={{ animation: "fade-up 0.38s cubic-bezier(.22,.68,0,1.2) both" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-4 pb-7">
          {/* App identity */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Install Gehnax HRMS</h3>
              <p className="text-sm text-slate-500 mt-0.5">gehnax.com</p>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: "⚡", label: "Fast access" },
              { icon: "📲", label: "Works offline" },
              { icon: "🔔", label: "Notifications" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 rounded-xl text-center">
                <span className="text-xl">{icon}</span>
                <span className="text-[11px] font-medium text-slate-600">{label}</span>
              </div>
            ))}
          </div>

          {ios ? (
            /* iOS instructions */
            <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-sm font-semibold text-slate-700 mb-3">Add to Home Screen:</p>
              <ol className="space-y-2.5">
                <li className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0">1</span>
                  Tap the <Share className="w-4 h-4 mx-0.5 text-blue-600 flex-shrink-0" /> <strong className="text-slate-800">Share</strong> button in Safari
                </li>
                <li className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0">2</span>
                  Scroll down and tap <strong className="text-slate-800">"Add to Home Screen"</strong>
                </li>
                <li className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0">3</span>
                  Tap <strong className="text-slate-800">"Add"</strong> in the top-right corner
                </li>
              </ol>
            </div>
          ) : (
            <Button
              className="w-full h-12 text-base font-bold rounded-2xl mb-3"
              onClick={handleInstall}
              loading={installing}
            >
              <Download className="w-5 h-5" />
              Install App
            </Button>
          )}

          <button
            onClick={dismiss}
            className="w-full text-sm text-slate-400 hover:text-slate-600 py-2 transition-colors"
          >
            {ios ? "Got it, maybe later" : "Not now"}
          </button>
        </div>
      </div>
    </div>
  ) : (
    /* ── Desktop bottom-right card ───────────────────────── */
    <div
      className="fixed bottom-5 right-5 z-[9999] w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
      style={{ animation: "fade-up 0.38s cubic-bezier(.22,.68,0,1.2) both" }}
    >
      {/* Gradient top bar */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-600" />

      {/* Close */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="p-5">
        {/* App identity */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/25 flex-shrink-0">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Install Gehnax HRMS</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Monitor className="w-3 h-3" /> Desktop app · works offline
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Install for quick one-click access from your taskbar, without opening a browser.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={dismiss}>
            Not now
          </Button>
          <Button size="sm" className="flex-1" onClick={handleInstall} loading={installing}>
            <Download className="w-3.5 h-3.5" />
            Install
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
