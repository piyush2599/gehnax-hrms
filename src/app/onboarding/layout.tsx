import { Toaster } from "@/components/ui/sonner";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.gehnax.com/Gehnax-logo.png" alt="Gehnax" className="h-8 w-auto flex-shrink-0" />
          <div>
            <p className="font-bold text-slate-900 leading-tight text-sm">Gehnax Technologies LLP</p>
            <p className="text-xs text-slate-500">Employee Onboarding</p>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
      <footer className="border-t border-slate-200 mt-16">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Gehnax Technologies LLP · All rights reserved
        </div>
      </footer>
      <Toaster richColors position="top-right" />
    </div>
  );
}
