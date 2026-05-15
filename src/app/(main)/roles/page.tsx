import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import RolesClient from "@/components/roles/RolesClient";

export const metadata: Metadata = { title: "Roles & Permissions" };

export default async function RolesPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (!["super_admin", "hr_admin"].includes(role)) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Role Management</h1>
        <p className="text-sm text-slate-500 mt-1">View all users and assign roles across the system.</p>
      </div>
      <RolesClient />
    </div>
  );
}
