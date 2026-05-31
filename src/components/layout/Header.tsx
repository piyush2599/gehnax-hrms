"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { LogOut, User, Bell, Menu, UserX } from "lucide-react";
import { toast } from "sonner";
import { useSidebar } from "./sidebar-context";
import { useImpersonate } from "./impersonate-context";

const PAGE_NAMES: Record<string, string> = {
  "/dashboard":     "Dashboard",
  "/employees":     "Employees",
  "/departments":   "Departments",
  "/attendance":    "Attendance",
  "/leaves":        "Leave Management",
  "/timesheets":    "Timesheets",
  "/payroll":       "Payroll",
  "/holidays":      "Holiday Calendar",
  "/announcements": "Announcements",
  "/profile":       "My Profile",
  "/hiring":        "Hiring",
  "/onboarding":    "Onboarding",
  "/roles":            "Roles & Permissions",
  "/approvals":        "Offer Approvals",
  "/purchase-orders":  "Purchase Orders",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin:   "Super Admin",
  finance_admin: "Finance Admin",
  hr_admin:      "HR Admin",
  manager:       "Manager",
  employee:      "Employee",
};

const ROLE_STYLES: Record<string, string> = {
  super_admin:   "bg-red-50 text-red-700 border-red-200",
  finance_admin: "bg-teal-50 text-teal-700 border-teal-200",
  hr_admin:      "bg-violet-50 text-violet-700 border-violet-200",
  manager:       "bg-blue-50 text-blue-700 border-blue-200",
  employee:      "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function Header() {
  const { setMobileOpen } = useSidebar();
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const user = session?.user as any;
  const { impersonating, stopImpersonation } = useImpersonate();

  const pageTitle =
    PAGE_NAMES[pathname] ??
    PAGE_NAMES[Object.keys(PAGE_NAMES).find((k) => pathname.startsWith(k + "/")) ?? ""] ??
    "Gehnax HRMS";

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await signOut({ redirect: false });
    toast.success("Signed out successfully");
    router.push("/login");
  };

  return (
    <>
    {/* Impersonation banner */}
    {impersonating && (
      <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between gap-3 text-sm z-50 relative">
        <div className="flex items-center gap-2">
          <UserX className="w-4 h-4 flex-shrink-0" />
          <span>
            Viewing as <strong>{impersonating.name}</strong>
            <span className="opacity-75 ml-1">({impersonating.employeeCode})</span>
            {" "}— you are in employee preview mode
          </span>
        </div>
        <button
          onClick={() => { stopImpersonation(); router.refresh(); }}
          className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
        >
          Exit Preview
        </button>
      </div>
    )}
    <header className="sticky top-0 z-30 h-16 flex-shrink-0">
      {/* Glass background */}
      <div className="absolute inset-0 bg-white/85 backdrop-blur-xl border-b border-slate-200/60" />
      {/* Gradient accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 opacity-60" />

      <div className="relative h-full flex items-center px-4 md:px-6 gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-2 -ml-1 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-bold text-slate-900 truncate animate-fade-in">{pageTitle}</h1>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Notification bell */}
          <button className="relative p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 transition-all duration-150">
            <Bell className="w-4.5 h-4.5" />
            {/* animated pulse badge */}
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping-dot absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl hover:bg-slate-100/80 transition-all duration-150 cursor-pointer group">
                <div className="relative">
                  <Avatar className="w-8 h-8 ring-2 ring-white shadow-sm">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
                      {user?.name ? getInitials(user.name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border border-white" />
                </div>
                <div className="text-left min-w-0 max-w-[100px] sm:max-w-[140px]">
                  <p className="text-[13px] font-semibold text-slate-900 leading-tight truncate">
                    {user?.name ?? "—"}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight truncate">
                    {user?.email ?? (user?.roles || []).map((r: string) => ROLE_LABELS[r] ?? r).join(" · ") ?? ""}
                  </p>
                </div>
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 p-1.5">
              {/* Profile header */}
              <DropdownMenuLabel className="px-3 py-3 bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-xl mb-1 border border-blue-100/50">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-11 h-11 ring-2 ring-white shadow-md">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-bold">
                        {user?.name ? getInitials(user.name) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    <Badge
                      className={`w-fit text-[10px] mt-1.5 font-semibold ${ROLE_STYLES[(user?.roles || [])[0]] ?? ""}`}
                      variant="outline"
                    >
                      {(user?.roles || []).map((r: string) => ROLE_LABELS[r] ?? r).join(" · ")}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="w-4 h-4 text-slate-400" />
                <span>My Profile</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleSignOut} data-variant="destructive">
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
    </>
  );
}
