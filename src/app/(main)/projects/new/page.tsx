"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FolderKanban } from "lucide-react";
import CreateProjectForm from "@/components/projects/CreateProjectForm";

export default function NewProjectPage() {
  const router = useRouter();
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/projects"
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-blue-600" />
            New Project
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Set up a new project and invite your team</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <CreateProjectForm
          onSuccess={(project) => router.push(`/projects/${project._id}`)}
          onCancel={() => router.push("/projects")}
        />
      </div>
    </div>
  );
}
