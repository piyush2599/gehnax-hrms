"use client";

import useSWR from "swr";
import { useSession } from "next-auth/react";
import CandidateDetail from "@/components/hiring/CandidateDetail";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CandidateDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const roles: string[] = (session?.user as any)?.roles || [];
  const canManage = roles.some(r => ["super_admin", "hr_admin"].includes(r));

  const { data, isLoading } = useSWR(
    `/api/hiring/candidates/${params.id}`,
    fetcher
  );
  const candidate = data?.candidate;
  const { data: jobsData } = useSWR("/api/hiring/jobs", fetcher);
  const jobs: any[] = jobsData?.jobs || [];

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="text-center py-20 text-slate-500">
        Candidate not found.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <CandidateDetail
        candidate={candidate}
        jobs={jobs}
        canManage={canManage}
      />
    </div>
  );
}
