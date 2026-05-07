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
import { LogOut, User, Bell, Menu } from "lucide-react";
import { toast } from "sonner";
import { useSidebar } from "./sidebar-context";

const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/employees": "Employees",
  "/departments": "Departments",
  "/attendance": "Attendance",
  "/leaves": "Leave Management",
  "/timesheets": "Timesheets",
  "/payroll": "Payroll",
  "/holidays": "Holiday Calendar",
  "/announcements": "Announcements",
  "/profile": "My Profile",
  "/hiring": "Hiring",
  "/onboarding": "Onboarding",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  hr_admin: "HR Admin",
  manager: "Manager",
  employee: "Employee",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-50 text-red-700 border-red-200",
  hr_admin: "bg-violet-50 text-violet-700 border-violet-200",
  manager: "bg-blue-50 text-blue-700 border-blue-200",
  employee: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function Header() {
  const { setMobileOpen } = useSidebar();
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const user = session?.user as any;

  const pageTitle =
    PAGE_NAMES[pathname] ??
    PAGE_NAMES[Object.keys(PAGE_NAMES).find((k) => pathname.startsWith(k + "/")) ?? ""] ??
    "HRMS Portal";

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    toast.success("Signed out");
    router.push("/login");
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 md:px-6 gap-3 flex-shrink-0 z-30">
      {/* Mobile menu trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden p-2 -ml-1 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-bold text-slate-900 truncate">{pageTitle}</h1>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white" />
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
                  {user?.name ? getInitials(user.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-sm font-semibold text-slate-900 leading-tight truncate max-w-[120px]">
                  {user?.name}
                </p>
                <p className="text-xs text-slate-500 leading-tight truncate max-w-[120px]">
                  {ROLE_LABELS[user?.role] ?? user?.role}
                </p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="py-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-blue-600 text-white text-sm font-bold">
                    {user?.name ? getInitials(user.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  <Badge
                    className={`w-fit text-xs mt-1.5 ${ROLE_COLORS[user?.role] ?? ""}`}
                    variant="outline"
                  >
                    {ROLE_LABELS[user?.role] ?? user?.role}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")} className="gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <span>My Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
