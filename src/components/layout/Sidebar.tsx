"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, Users, Building2, Clock, Calendar,
  FileText, DollarSign, Megaphone, UserCircle,
  ChevronLeft, ChevronRight, LogOut, Briefcase, CalendarDays, UserPlus,
} from "lucide-react";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["super_admin", "hr_admin", "manager", "employee"] },
    ],
  },
  {
    label: "HR Management",
    items: [
      { href: "/employees", icon: Users, label: "Employees", roles: ["super_admin", "hr_admin", "manager"] },
      { href: "/hiring", icon: UserPlus, label: "Hiring", roles: ["super_admin", "hr_admin", "manager"] },
      { href: "/departments", icon: Building2, label: "Departments", roles: ["super_admin", "hr_admin"] },
      { href: "/attendance", icon: Clock, label: "Attendance", roles: ["super_admin", "hr_admin", "manager", "employee"] },
      { href: "/leaves", icon: Calendar, label: "Leaves", roles: ["super_admin", "hr_admin", "manager", "employee"] },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/timesheets", icon: FileText, label: "Timesheets", roles: ["super_admin", "hr_admin", "manager", "employee"] },
      { href: "/payroll", icon: DollarSign, label: "Payroll", roles: ["super_admin", "hr_admin", "employee"] },
    ],
  },
  {
    label: "General",
    items: [
      { href: "/holidays", icon: CalendarDays, label: "Holidays", roles: ["super_admin", "hr_admin", "manager", "employee"] },
      { href: "/announcements", icon: Megaphone, label: "Announcements", roles: ["super_admin", "hr_admin", "manager", "employee"] },
      { href: "/profile", icon: UserCircle, label: "My Profile", roles: ["super_admin", "hr_admin", "manager", "employee"] },
    ],
  },
];

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  hr_admin: "HR Admin",
  manager: "Manager",
  employee: "Employee",
};

function SidebarInner({ collapsed }: { collapsed: boolean }) {
  const { setMobileOpen } = useSidebar();
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;
  const userRole = user?.role || "employee";

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={cn(
        "flex items-center h-16 border-b border-slate-700/60 px-4 flex-shrink-0 gap-3",
        collapsed && "justify-center px-2"
      )}>
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
          <Briefcase className="w-[18px] h-[18px] text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-none tracking-tight">HRMS Portal</p>
            <p className="text-slate-400 text-xs mt-1 capitalize leading-none">
              {roleLabels[userRole] ?? userRole.replace("_", " ")}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navGroups.map((group) => {
          const visible = group.items.filter((i) => i.roles.includes(userRole));
          if (!visible.length) return null;
          return (
            <div key={group.label} className="mb-3">
              {!collapsed && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-3 mb-1">
                  {group.label}
                </p>
              )}
              {visible.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group",
                      isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                        : "text-slate-400 hover:bg-slate-700/50 hover:text-white",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon className={cn(
                      "w-[18px] h-[18px] flex-shrink-0 transition-colors",
                      isActive ? "text-white" : "text-slate-500 group-hover:text-slate-200"
                    )} />
                    {!collapsed && (
                      <span className="text-sm font-medium leading-none">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className="border-t border-slate-700/60 p-3 space-y-1 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-1">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-blue-600/20 text-blue-400 text-xs font-bold border border-blue-500/20">
                {user?.name ? getInitials(user.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white leading-none truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 mt-1 truncate">{user?.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "Sign Out" : undefined}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden md:block border-t border-slate-700/60 p-2 flex-shrink-0">
        <button
          onClick={() => {}}
          className="w-full flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { mobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-slate-900 border-r border-slate-700/60 transition-all duration-300 flex-shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex flex-col h-full" onClick={(e) => {
          const btn = (e.target as HTMLElement).closest("[data-collapse]");
          if (btn) setCollapsed((c) => !c);
        }}>
          {/* Override collapse button to use local state */}
          <div className="flex flex-col h-full">
            <div className={cn(
              "flex items-center h-16 border-b border-slate-700/60 px-4 flex-shrink-0 gap-3",
              collapsed && "justify-center px-2"
            )}>
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
                <Briefcase className="w-[18px] h-[18px] text-white" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm leading-none tracking-tight">HRMS Portal</p>
                  <DesktopRole collapsed={collapsed} />
                </div>
              )}
            </div>
            <DesktopNav collapsed={collapsed} />
            <DesktopUser collapsed={collapsed} />
            <div className="border-t border-slate-700/60 p-2 flex-shrink-0">
              <button
                onClick={() => setCollapsed((c) => !c)}
                className="w-full flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-all"
                title={collapsed ? "Expand" : "Collapse"}
              >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 z-50 shadow-2xl md:hidden">
            <SidebarInner collapsed={false} />
          </aside>
        </>
      )}
    </>
  );
}

function DesktopRole({ collapsed }: { collapsed: boolean }) {
  const { data: session } = useSession();
  const user = session?.user as any;
  if (collapsed) return null;
  return (
    <p className="text-slate-400 text-xs mt-1 capitalize leading-none">
      {roleLabels[user?.role] ?? (user?.role || "employee").replace("_", " ")}
    </p>
  );
}

function DesktopNav({ collapsed }: { collapsed: boolean }) {
  const { setMobileOpen } = useSidebar();
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "employee";

  return (
    <nav className="flex-1 overflow-y-auto py-4 px-3">
      {navGroups.map((group) => {
        const visible = group.items.filter((i) => i.roles.includes(userRole));
        if (!visible.length) return null;
        return (
          <div key={group.label} className="mb-3">
            {!collapsed && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-3 mb-1">
                {group.label}
              </p>
            )}
            {visible.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group mb-0.5",
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                      : "text-slate-400 hover:bg-slate-700/50 hover:text-white",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className={cn(
                    "w-[18px] h-[18px] flex-shrink-0",
                    isActive ? "text-white" : "text-slate-500 group-hover:text-slate-200"
                  )} />
                  {!collapsed && <span className="text-sm font-medium leading-none">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

function DesktopUser({ collapsed }: { collapsed: boolean }) {
  const { data: session } = useSession();
  const user = session?.user as any;

  return (
    <div className="border-t border-slate-700/60 p-3 space-y-1 flex-shrink-0">
      {!collapsed && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-1">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-blue-600/20 text-blue-400 text-xs font-bold border border-blue-500/20">
              {user?.name ? getInitials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white leading-none truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 mt-1 truncate">{user?.email}</p>
          </div>
        </div>
      )}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        title={collapsed ? "Sign Out" : undefined}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium",
          collapsed && "justify-center"
        )}
      >
        <LogOut className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span>Sign Out</span>}
      </button>
    </div>
  );
}
