import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ApprovalsClient from "@/components/approvals/ApprovalsClient";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.includes("super_admin")) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Offer Approvals</h1>
        <p className="text-slate-500 text-sm mt-1">Review and approve offer letters before they are sent to candidates</p>
      </div>
      <ApprovalsClient />
    </div>
  );
}
