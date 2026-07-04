import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ApprovalsClient from "@/components/approvals/ApprovalsClient";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.includes("super_admin")) redirect("/dashboard");

  return <ApprovalsClient />;
}
