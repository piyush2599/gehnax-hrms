export default function VerifyOfferLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-sm">G</span>
          </div>
          <div>
            <p className="font-bold text-slate-900 leading-tight text-sm">Gehnax Technologies LLP</p>
            <p className="text-xs text-slate-500">Offer Letter Verification Portal</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        {children}
      </main>

      <footer className="border-t border-slate-200 mt-16">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Gehnax Technologies LLP · All rights reserved
        </div>
      </footer>
    </div>
  );
}
