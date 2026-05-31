"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Upload, FileText, X } from "lucide-react";

function CandidateRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/candidate/dashboard";

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "",
    phone: "", currentCompany: "", currentDesignation: "",
    totalExperience: "", skills: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile) { toast.error("Please upload your resume"); return; }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("resume", resumeFile);

      const res = await fetch("/api/candidate/register", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Registration failed"); return; }
      toast.success("Account created! Welcome to Gehnax Careers.");
      router.push(next);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <img src="https://www.gehnax.com/Gehnax-logo.png" alt="Gehnax" className="h-10 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-slate-900">Create Your Profile</h1>
            <p className="text-slate-500 text-sm mt-1">Register to apply and track your applications</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name *" value={form.firstName} onChange={v => set("firstName", v)} placeholder="Rahul" />
              <Field label="Last Name *" value={form.lastName} onChange={v => set("lastName", v)} placeholder="Sharma" />
            </div>

            {/* Account */}
            <Field label="Email *" type="email" value={form.email} onChange={v => set("email", v)} placeholder="rahul@email.com" />
            <Field label="Password *" type="password" value={form.password} onChange={v => set("password", v)} placeholder="Min. 6 characters" />

            {/* Contact */}
            <Field label="Phone" value={form.phone} onChange={v => set("phone", v)} placeholder="+91 9876543210" />

            {/* Work */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Current Company" value={form.currentCompany} onChange={v => set("currentCompany", v)} placeholder="ABC Corp" />
              <Field label="Current Designation" value={form.currentDesignation} onChange={v => set("currentDesignation", v)} placeholder="Software Engineer" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Total Experience (years)" type="number" value={form.totalExperience} onChange={v => set("totalExperience", v)} placeholder="3" />
              <Field label="Skills (comma separated)" value={form.skills} onChange={v => set("skills", v)} placeholder="React, Node.js, MongoDB" />
            </div>

            {/* Resume */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Resume * <span className="text-slate-400 font-normal">(PDF or DOC, max 10 MB)</span></label>
              {resumeFile ? (
                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-sm text-emerald-700 font-medium flex-1 truncate">{resumeFile.name}</span>
                  <button type="button" onClick={() => setResumeFile(null)} className="text-slate-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-blue-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <Upload className="w-8 h-8 text-blue-400" />
                  <span className="text-sm text-slate-500">Click to upload your resume</span>
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => setResumeFile(e.target.files?.[0] || null)} />
                </label>
              )}
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create Account & Continue"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{" "}
            <Link href={`/candidate-login${next !== "/candidate/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="text-blue-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CandidateRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <CandidateRegisterForm />
    </Suspense>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}
