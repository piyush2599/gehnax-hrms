import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginForm from "@/components/auth/LoginForm";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const session = await auth();
  if (session) redirect(searchParams.callbackUrl || "/dashboard");

  const callbackUrl = searchParams.callbackUrl || "/dashboard";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-white rounded-2xl px-6 py-3 mb-4 shadow-lg shadow-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://www.gehnax.com/Gehnax-logo.png" alt="Gehnax" className="h-10 w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-white">Gehnax HRMS</h1>
          <p className="text-blue-200 mt-1">Human Resource Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-1">Welcome back</h2>
          <p className="text-blue-200 text-sm mb-6">Sign in to your account to continue</p>
          <LoginForm callbackUrl={callbackUrl} />
        </div>

        <p className="text-center text-blue-300 text-xs mt-6">
          © {new Date().getFullYear()} Gehnax HRMS. All rights reserved.
        </p>
      </div>
    </div>
  );
}
