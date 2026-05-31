"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import { useActiveRole } from "./active-role-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, Users, Building2, Clock, Calendar,
  FileText, DollarSign, Megaphone, UserCircle,
  ChevronLeft, ChevronRight, LogOut,
  CalendarDays, UserPlus, ClipboardCheck, ShieldCheck, X, ReceiptText, ShoppingCart, FolderKanban,
  ChevronsUpDown, Check, BadgeCheck,
} from "lucide-react";

const navGroups = [
  {
    label: "Overview",
    color: { dot: "bg-blue-500", label: "text-blue-400/80" },
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["super_admin","hr_admin","manager","employee"] },
    ],
  },
  {
    label: "HR Management",
    color: { dot: "bg-violet-500", label: "text-violet-400/80" },
    items: [
      { href: "/employees",   icon: Users,          label: "Employees",   roles: ["super_admin","hr_admin","manager"] },
      { href: "/hiring",      icon: UserPlus,       label: "Hiring",      roles: ["super_admin","hr_admin","manager"] },
      { href: "/onboarding",  icon: ClipboardCheck, label: "Onboarding",  roles: ["super_admin","hr_admin"] },
      { href: "/departments", icon: Building2,      label: "Departments", roles: ["super_admin","hr_admin"] },
      { href: "/roles",       icon: ShieldCheck,    label: "Roles",       roles: ["super_admin","hr_admin"] },
      { href: "/approvals",   icon: BadgeCheck,     label: "Approvals",   roles: ["super_admin"] },
      { href: "/attendance",  icon: Clock,          label: "Attendance",  roles: ["super_admin","hr_admin","manager","employee"] },
      { href: "/leaves",      icon: Calendar,       label: "Leaves",      roles: ["super_admin","hr_admin","manager","employee"] },
    ],
  },
  {
    label: "Work",
    color: { dot: "bg-emerald-500", label: "text-emerald-400/80" },
    items: [
      { href: "/timesheets",      icon: FileText,     label: "Timesheets",      roles: ["super_admin","hr_admin","manager","employee"] },
      { href: "/payroll",         icon: DollarSign,   label: "Payroll",         roles: ["super_admin","employee"] },
      { href: "/expenses",        icon: ReceiptText,  label: "Expenses",        roles: ["super_admin","hr_admin","manager","employee"] },
      { href: "/purchase-orders", icon: ShoppingCart,  label: "Purchase Orders", roles: ["super_admin","finance_admin","manager","hr_admin"] },
      { href: "/projects",        icon: FolderKanban, label: "Projects",         roles: ["super_admin","finance_admin","hr_admin","manager","employee"] },
    ],
  },
  {
    label: "General",
    color: { dot: "bg-amber-500", label: "text-amber-400/80" },
    items: [
      { href: "/holidays",      icon: CalendarDays, label: "Holidays",      roles: ["super_admin","hr_admin","manager","employee"] },
      { href: "/announcements", icon: Megaphone,    label: "Announcements", roles: ["super_admin","hr_admin","manager","employee"] },
      { href: "/profile",       icon: UserCircle,   label: "My Profile",    roles: ["super_admin","hr_admin","manager","employee"] },
    ],
  },
];

const roleLabels: Record<string, string> = {
  super_admin:   "Super Admin",
  finance_admin: "Finance Admin",
  hr_admin:      "HR Admin",
  manager:       "Manager",
  employee:      "Employee",
};

const ROLE_BADGE: Record<string, string> = {
  super_admin:   "bg-red-500/20 text-red-300 border-red-500/20",
  finance_admin: "bg-teal-500/20 text-teal-300 border-teal-500/20",
  hr_admin:      "bg-violet-500/20 text-violet-300 border-violet-500/20",
  manager:       "bg-blue-500/20 text-blue-300 border-blue-500/20",
  employee:      "bg-emerald-500/20 text-emerald-300 border-emerald-500/20",
};

function NavContent({ collapsed, onNav }: { collapsed: boolean; onNav?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;
  const { activeRole, switchRole, userRoles } = useActiveRole();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const handleRoleSwitch = (role: string) => {
    switchRole(role);
    setSwitcherOpen(false);
  };

  const hasMultipleRoles = userRoles.length > 1;

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={cn(
        "flex items-center h-16 px-4 flex-shrink-0 gap-3 border-b border-white/6",
        collapsed && "justify-center px-0"
      )}>
        <div className="relative flex-shrink-0">
          <div className={cn(
            "bg-white rounded-xl flex items-center justify-center shadow-md overflow-hidden",
            collapsed ? "w-9 h-9 p-1" : "h-9 px-2.5 py-1"
          )}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.gehnax.com/Gehnax-logo.png"
              alt="Gehnax"
              className={collapsed ? "w-full h-full object-contain" : "h-full w-auto"}
            />
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0d1117] shadow-sm" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-white font-bold text-sm leading-none tracking-tight">Gehnax HRMS</p>
          </div>
        )}
      </div>

      {/* Role Switcher — below brand, above nav */}
      {!collapsed && (
        <div className="px-2.5 pt-3 pb-1 flex-shrink-0 relative">
          <button
            onClick={() => hasMultipleRoles && setSwitcherOpen(v => !v)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
              ROLE_BADGE[activeRole] ?? "bg-slate-500/20 text-slate-300 border-slate-500/20",
              hasMultipleRoles ? "cursor-pointer hover:brightness-110" : "cursor-default"
            )}
          >
            <span className="text-xs font-semibold flex-1 text-left truncate">
              {roleLabels[activeRole] ?? activeRole.replace("_", " ")}
            </span>
            {hasMultipleRoles && (
              <ChevronsUpDown className="w-3 h-3 opacity-70 flex-shrink-0" />
            )}
          </button>

          {/* Dropdown */}
          {switcherOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSwitcherOpen(false)} />
              <div className="absolute left-2.5 right-2.5 top-full mt-1 bg-[#161b22] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 px-3 pt-2.5 pb-1">Switch Role</p>
                {userRoles.map(role => (
                  <button
                    key={role}
                    onClick={() => handleRoleSwitch(role)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/6 transition-colors text-left"
                  >
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-md border flex-1",
                      ROLE_BADGE[role] ?? "bg-slate-500/20 text-slate-300 border-slate-500/20"
                    )}>
                      {roleLabels[role] ?? role.replace("_", " ")}
                    </span>
                    {activeRole === role && <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2.5 space-y-0.5 scrollbar-thin">
        {navGroups.map((group) => {
          const visible = group.items.filter((i) => i.roles.includes(activeRole));
          if (!visible.length) return null;
          return (
            <div key={group.label} className="mb-1">
              {!collapsed && (
                <div className="flex items-center gap-1.5 px-2.5 mb-1 mt-2">
                  <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", group.color.dot)} />
                  <p className={cn("text-[9px] font-bold uppercase tracking-widest", group.color.label)}>
                    {group.label}
                  </p>
                </div>
              )}
              {visible.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNav}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 group mb-0.5",
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30"
                        : "text-slate-400 hover:bg-white/6 hover:text-white",
                      collapsed && "justify-center px-0 py-3"
                    )}
                  >
                    <item.icon className={cn(
                      "flex-shrink-0 transition-all duration-200",
                      isActive ? "w-[17px] h-[17px] text-white" : "w-[17px] h-[17px] text-slate-500 group-hover:text-slate-200"
                    )} />
                    {!collapsed && (
                      <>
                        <span className="text-sm font-medium leading-none flex-1">{item.label}</span>
                        {isActive && (
                          <ChevronRight className="w-3 h-3 text-white/60 ml-auto" />
                        )}
                      </>
                    )}
                    {isActive && collapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-400 rounded-r-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/6 p-3 flex-shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors mb-1 group cursor-default">
            <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-white/10">
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold">
                {user?.name ? getInitials(user.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white leading-none truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 mt-1 truncate">{user?.email}</p>
            </div>
          </div>
        ) : null}
        <button
          onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); signOut({ callbackUrl: "/login" }); }}
          title={collapsed ? "Sign Out" : undefined}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/8 transition-all text-sm font-medium",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
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
      <aside className={cn(
        "hidden md:flex flex-col bg-[#0d1117] border-r border-white/6 transition-all duration-300 ease-in-out flex-shrink-0 h-full",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}>
        <div className="flex flex-col h-full">
          <NavContent collapsed={collapsed} />
          {/* Collapse toggle */}
          <div className="border-t border-white/6 p-2 flex-shrink-0">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="w-full flex items-center justify-center p-2 rounded-xl text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed
                ? <ChevronRight className="w-4 h-4" />
                : <ChevronLeft className="w-4 h-4" />
              }
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-[240px] bg-[#0d1117] z-50 shadow-2xl md:hidden animate-slide-right">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <NavContent collapsed={false} onNav={() => setMobileOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
