"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge }    from "@/components/ui/badge";
import {
  Users, UserCheck, Calendar, Building2, TrendingUp, Megaphone,
  CheckCircle2, Clock, ArrowUpRight, Briefcase, ChevronRight,
  ReceiptText, ShoppingCart, FolderKanban, UserPlus, ClipboardList,
  CalendarDays, IndianRupee, BarChart3, Layers,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { format } from "date-fns";
import AttendanceWidget from "./AttendanceWidget";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const DEPT_COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899","#f97316"];

/* ─── AnimatedNumber ─────────────────────────────────────────────────── */
function AnimatedNumber({
  value, prefix = "", suffix = "", className = "", decimals = 0,
}: { value: number; prefix?: string; suffix?: string; className?: string; decimals?: number }) {
  const [displayed, setDisplayed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === 0) { setDisplayed(0); return; }
    startRef.current = null;
    const duration = 900;
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(parseFloat((value * eased).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
      else setDisplayed(value);
    };
    requestAnimationFrame(step);
  }, [value, decimals]);

  const formatted = decimals > 0
    ? displayed.toFixed(decimals)
    : Math.round(displayed).toLocaleString("en-IN");

  return <span className={className}>{prefix}{formatted}{suffix}</span>;
}

/* ─── ProgressRing ───────────────────────────────────────────────────── */
function ProgressRing({ pct, size = 64, strokeWidth = 6, color = "#3b82f6", label }: {
  pct: number; size?: number; strokeWidth?: number; color?: string; label?: string;
}) {
  const [animPct, setAnimPct] = useState(0);
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - animPct / 100);

  useEffect(() => {
    const t = setTimeout(() => setAnimPct(Math.min(Math.max(pct, 0), 100)), 200);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.25,0.46,0.45,0.94)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold text-slate-700 leading-none">{Math.round(pct)}%</span>
        {label && <span className="text-[9px] text-slate-400 mt-0.5">{label}</span>}
      </div>
    </div>
  );
}

/* ─── MiniBar ────────────────────────────────────────────────────────── */
function MiniBars({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm animate-bar-rise"
          style={{
            height: `${Math.max(10, (v / max) * 100)}%`,
            background: color,
            opacity: 0.3 + (i / data.length) * 0.7,
            animationDelay: `${i * 60}ms`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── StatRow ────────────────────────────────────────────────────────── */
function StatRow({ label, value, dot, bg, textColor, sub }: {
  label: string; value: number | string; dot: string; bg: string; textColor: string; sub?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between px-3 py-2 rounded-xl", bg)}>
      <div className="flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dot)} />
        <span className="text-xs font-medium text-slate-700">{label}</span>
      </div>
      <div className="text-right">
        <span className={cn("text-sm font-bold", textColor)}>{value}</span>
        {sub && <p className={cn("text-[10px] leading-none mt-0.5", textColor, "opacity-80")}>{sub}</p>}
      </div>
    </div>
  );
}

/* ─── KPI StatCard ───────────────────────────────────────────────────── */
const KPI_COLORS = {
  blue:   { grad: "from-blue-500 to-indigo-600",   bg: "bg-blue-50",    icon: "text-blue-600",    glow: "shadow-blue-200" },
  emerald:{ grad: "from-emerald-500 to-teal-600",  bg: "bg-emerald-50", icon: "text-emerald-600", glow: "shadow-emerald-200" },
  amber:  { grad: "from-amber-500 to-orange-500",  bg: "bg-amber-50",   icon: "text-amber-600",   glow: "shadow-amber-200" },
  violet: { grad: "from-violet-500 to-purple-600", bg: "bg-violet-50",  icon: "text-violet-600",  glow: "shadow-violet-200" },
  indigo: { grad: "from-indigo-500 to-blue-600",   bg: "bg-indigo-50",  icon: "text-indigo-600",  glow: "shadow-indigo-200" },
  teal:   { grad: "from-teal-500 to-cyan-600",     bg: "bg-teal-50",    icon: "text-teal-600",    glow: "shadow-teal-200" },
  orange: { grad: "from-orange-500 to-red-500",    bg: "bg-orange-50",  icon: "text-orange-600",  glow: "shadow-orange-200" },
  rose:   { grad: "from-rose-500 to-pink-600",     bg: "bg-rose-50",    icon: "text-rose-600",    glow: "shadow-rose-200" },
};

function StatCard({ title, value, sub, icon: Icon, color, onClick }: {
  title: string; value: number; sub: string;
  icon: React.ElementType; color: keyof typeof KPI_COLORS; onClick?: () => void;
}) {
  const c = KPI_COLORS[color];
  return (
    <div
      className={cn(
        "group bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300",
        onClick && "cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-slate-200"
      )}
      onClick={onClick}
    >
      <div className={cn("h-1 bg-gradient-to-r", c.grad)} />
      <div className="p-4 pt-3.5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("p-2 rounded-xl shadow-sm", c.bg, c.glow)}>
            <Icon className={cn("w-4 h-4", c.icon)} />
          </div>
          {onClick && (
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          )}
        </div>
        <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums">
          <AnimatedNumber value={value} />
        </p>
        <p className="text-xs font-semibold text-slate-700 mt-2 leading-tight">{title}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

/* ─── Widget card wrapper ────────────────────────────────────────────── */
function Widget({ title, icon: Icon, iconBg, iconColor, gradient, href, children, className, badge }: {
  title: string; icon: React.ElementType; iconBg: string; iconColor: string;
  gradient: string; href: string; children: React.ReactNode; className?: string; badge?: string;
}) {
  const router = useRouter();
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer group",
        "hover:shadow-md hover:-translate-y-0.5 hover:border-slate-200 transition-all duration-200",
        className
      )}
      onClick={() => router.push(href)}
    >
      <div className={cn("h-1 bg-gradient-to-r", gradient)} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={cn("p-2 rounded-xl flex-shrink-0", iconBg)}>
              <Icon className={cn("w-4 h-4", iconColor)} />
            </div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{title}</span>
            {badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full">{badge}</span>
            )}
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all duration-200" />
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Currency helper ────────────────────────────────────────────────── */
function lakhs(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}k`;
  return `₹${n.toFixed(0)}`;
}

/* ─── Main Dashboard ─────────────────────────────────────────────────── */
export default function DashboardClient() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "employee";
  const user = session?.user as any;
  const router = useRouter();
  const { data, isLoading } = useSWR("/api/dashboard", fetcher, { refreshInterval: 60000 });

  const [greeting, setGreeting] = useState("Welcome");
  const [dateStr, setDateStr]   = useState("");
  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    setDateStr(format(now, "EEEE, MMMM d, yyyy"));
  }, []);

  const firstName = user?.name?.split(" ")[0] || "there";
  const isAdmin   = ["super_admin","hr_admin"].includes(role);
  const isPower   = ["super_admin","hr_admin","finance_admin","manager"].includes(role);
  const isEmployee = role === "employee";
  const s = data?.stats || {};

  /* attendance trend & dept chart data */
  const attendanceTrend = (data?.attendanceTrend || []).map((d: any) => ({
    day: format(new Date(d.date), "EEE"),
    present: d.present,
  }));
  const deptData = (data?.deptHeadcount || []).map((d: any, i: number) => ({
    name: d.name.length > 12 ? d.name.slice(0, 11) + "…" : d.name,
    count: d.count,
    fill: DEPT_COLORS[i % DEPT_COLORS.length],
  }));

  const taskDonePct = s.tasksTotal > 0 ? Math.round((s.tasksDone / s.tasksTotal) * 100) : 0;
  const attendancePct = s.attendanceRate ?? 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-36 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-violet-800 p-6 text-white shadow-xl shadow-blue-600/20 animate-fade-up">
        {/* decorative orbs */}
        <div className="absolute -top-10 -right-10 w-52 h-52 bg-white/5 rounded-full animate-float" />
        <div className="absolute -bottom-16 right-12 w-72 h-72 bg-white/4 rounded-full animate-float" style={{ animationDelay:"1.3s" }} />
        <div className="absolute top-6 right-40 w-20 h-20 bg-white/6 rounded-full animate-float" style={{ animationDelay:"0.7s" }} />
        <div className="absolute bottom-4 left-1/3 w-12 h-12 bg-white/8 rounded-full animate-float" style={{ animationDelay:"2s" }} />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <p className="text-blue-200 text-sm font-medium">{greeting},</p>
            <h2 className="text-2xl sm:text-3xl font-bold mt-0.5 tracking-tight">{firstName}!</h2>
            <p className="text-blue-200 text-sm mt-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {dateStr}
            </p>
            {isPower && (
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  { label: "Pending Actions", value: (s.pendingLeaves ?? 0) + (s.tsSubmitted ?? 0) + (s.pendingExpenses ?? 0) },
                  { label: "Active Projects", value: s.projectsActive ?? 0 },
                ].map(({ label, value }) => (
                  <span key={label} className="text-xs bg-white/10 px-2.5 py-1 rounded-full border border-white/15 font-medium">
                    <span className="font-bold">{value}</span> {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {isPower && (
            <div className="flex gap-3 flex-shrink-0">
              <button onClick={() => router.push("/employees")} className="bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl px-4 py-3 text-center transition-all hover:scale-105">
                <p className="text-2xl font-bold tabular-nums"><AnimatedNumber value={s.activeEmployees ?? 0} /></p>
                <p className="text-blue-200 text-xs mt-0.5 font-medium">Active Staff</p>
              </button>
              <button onClick={() => router.push("/attendance")} className="bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl px-4 py-3 text-center transition-all hover:scale-105">
                <p className="text-2xl font-bold tabular-nums"><AnimatedNumber value={attendancePct} suffix="%" /></p>
                <p className="text-blue-200 text-xs mt-0.5 font-medium">Present Today</p>
              </button>
              <button onClick={() => router.push("/projects")} className="bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl px-4 py-3 text-center transition-all hover:scale-105 hidden sm:block">
                <p className="text-2xl font-bold tabular-nums"><AnimatedNumber value={s.projectsActive ?? 0} /></p>
                <p className="text-blue-200 text-xs mt-0.5 font-medium">Live Projects</p>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Employee attendance widget ──────────────────────────────── */}
      {isEmployee && (
        <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
          <AttendanceWidget />
        </div>
      )}

      {/* ── KPI Stats (admin/power users) ──────────────────────────── */}
      {isPower && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 stagger">
          <StatCard title="Total Employees"  value={s.totalEmployees  ?? 0} sub={`${s.activeEmployees ?? 0} active`}     icon={Users}         color="blue"   onClick={() => router.push("/employees")} />
          <StatCard title="Present Today"    value={s.todayAttendance ?? 0} sub={`${attendancePct}% rate`}               icon={UserCheck}     color="emerald" onClick={() => router.push("/attendance")} />
          <StatCard title="Pending Leaves"   value={s.leavePending    ?? 0} sub="awaiting review"                        icon={Calendar}      color="amber"  onClick={() => router.push("/leaves")} />
          <StatCard title="Active Projects"  value={s.projectsActive  ?? 0} sub={`${s.projectsTotal ?? 0} total`}        icon={FolderKanban}  color="indigo" onClick={() => router.push("/projects")} />
          <StatCard title="Active POs"       value={s.poActiveCount   ?? 0} sub={lakhs(s.poActiveValue ?? 0) + " value"} icon={ShoppingCart}  color="teal"   onClick={() => router.push("/purchase-orders")} />
          <StatCard title="Pending Expenses" value={s.pendingExpenses  ?? 0} sub={lakhs(s.pendingExpensesAmount ?? 0)}    icon={ReceiptText}   color="orange" onClick={() => router.push("/expenses")} />
        </div>
      )}

      {/* ── Employee personal stats ─────────────────────────────────── */}
      {isEmployee && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger">
          <StatCard title="Leave Balance"   value={14} sub="days remaining"         icon={Calendar}      color="amber"  onClick={() => router.push("/leaves")} />
          <StatCard title="My Tasks"        value={s.tasksTotal  ?? 0} sub="assigned to me"    icon={Layers}        color="indigo" onClick={() => router.push("/projects")} />
          <StatCard title="My Expenses"     value={s.pendingExpenses ?? 0} sub="pending approval" icon={ReceiptText}   color="orange" onClick={() => router.push("/expenses")} />
          <StatCard title="Timesheet Hours" value={s.tsHoursTotal ?? 0} sub="submitted"          icon={Clock}         color="teal"   onClick={() => router.push("/timesheets")} />
        </div>
      )}

      {/* ── Charts: Attendance + Dept (admin/power) ─────────────────── */}
      {isPower && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger">
          {/* Attendance area chart — 2/3 width */}
          <div
            className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 cursor-pointer hover:shadow-md transition-all group"
            onClick={() => router.push("/attendance")}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 rounded-lg"><TrendingUp className="w-4 h-4 text-blue-600" /></div>
                <span className="text-sm font-semibold text-slate-700">Attendance — Last 7 Days</span>
              </div>
              <div className="flex items-center gap-2">
                <ProgressRing pct={attendancePct} size={44} strokeWidth={4} color="#3b82f6" />
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={attendanceTrend} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }} formatter={(v: any) => [`${v} present`, ""]} labelStyle={{ color: "#64748b", fontWeight: 600 }} />
                <Area type="monotone" dataKey="present" stroke="#3b82f6" strokeWidth={2.5} fill="url(#ag)" dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Dept headcount — 1/3 */}
          <div
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 cursor-pointer hover:shadow-md transition-all group"
            onClick={() => router.push("/departments")}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-violet-50 rounded-lg"><Building2 className="w-4 h-4 text-violet-600" /></div>
                <span className="text-sm font-semibold text-slate-700">By Department</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={deptData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={72} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }} formatter={(v: any) => [`${v} employees`, ""]} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={18}>
                  {deptData.map((e: any, i: number) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Module Widgets Row 1 ─────────────────────────────────────── */}
      {isPower && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">

          {/* Leaves */}
          <Widget title="Leave Requests" icon={Calendar} iconBg="bg-amber-50" iconColor="text-amber-600" gradient="from-amber-400 to-orange-500" href="/leaves" badge={s.leavePending > 0 ? String(s.leavePending) : ""}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <p className="text-3xl font-bold text-slate-900 tabular-nums"><AnimatedNumber value={s.leavePending ?? 0} /></p>
                <p className="text-xs text-slate-400 mt-0.5">Pending approval</p>
              </div>
              <ProgressRing
                pct={((s.leavePending ?? 0) + (s.leaveApproved ?? 0)) > 0 ? Math.round((s.leaveApproved / ((s.leavePending ?? 0) + (s.leaveApproved ?? 0))) * 100) : 0}
                size={52} strokeWidth={5} color="#f59e0b" label="approved"
              />
            </div>
            <div className="space-y-1.5">
              <StatRow label="Approved" value={s.leaveApproved ?? 0} dot="bg-emerald-500" bg="bg-emerald-50" textColor="text-emerald-700" />
              <StatRow label="Rejected" value={s.leaveRejected ?? 0} dot="bg-red-400" bg="bg-red-50" textColor="text-red-600" />
            </div>
          </Widget>

          {/* Timesheets */}
          <Widget title="Timesheets" icon={ClipboardList} iconBg="bg-violet-50" iconColor="text-violet-600" gradient="from-violet-500 to-purple-600" href="/timesheets" badge={s.tsSubmitted > 0 ? String(s.tsSubmitted) : ""}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <p className="text-3xl font-bold text-slate-900 tabular-nums"><AnimatedNumber value={s.tsSubmitted ?? 0} /></p>
                <p className="text-xs text-slate-400 mt-0.5">Awaiting review</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-violet-600 tabular-nums"><AnimatedNumber value={s.tsHoursTotal ?? 0} suffix="h" /></p>
                <p className="text-[10px] text-slate-400">hours logged</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <StatRow label="Approved" value={s.tsApproved ?? 0} dot="bg-emerald-500" bg="bg-emerald-50" textColor="text-emerald-700" />
              <StatRow label="Rejected" value={s.tsRejected ?? 0} dot="bg-red-400" bg="bg-red-50" textColor="text-red-600" />
            </div>
          </Widget>

          {/* Payroll */}
          <Widget title="Payroll" icon={IndianRupee} iconBg="bg-teal-50" iconColor="text-teal-600" gradient="from-teal-500 to-cyan-600" href="/payroll">
            <div className="mb-3">
              <p className="text-xs text-slate-400 mb-1">Net Pay Processed (This Month)</p>
              <p className="text-2xl font-bold text-teal-600 tabular-nums"><AnimatedNumber value={s.payrollNetPay ?? 0} prefix="₹" /></p>
            </div>
            <div className="space-y-1.5">
              <StatRow label="Processed" value={s.payrollProcessed ?? 0} dot="bg-teal-500" bg="bg-teal-50" textColor="text-teal-700" />
              <StatRow label="Paid" value={s.payrollPaid ?? 0} dot="bg-emerald-500" bg="bg-emerald-50" textColor="text-emerald-700" />
            </div>
          </Widget>
        </div>
      )}

      {/* ── Module Widgets Row 2 ─────────────────────────────────────── */}
      {isPower && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">

          {/* Projects (spans 2 cols on lg) */}
          <Widget title="Projects" icon={FolderKanban} iconBg="bg-indigo-50" iconColor="text-indigo-600" gradient="from-indigo-500 to-blue-600" href="/projects" className="lg:col-span-2">
            <div className="flex gap-5 items-start">
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Active",    value: s.projectsActive    ?? 0, color: "text-emerald-600 bg-emerald-50" },
                    { label: "Planning",  value: s.projectsPlanning  ?? 0, color: "text-blue-600 bg-blue-50" },
                    { label: "On Hold",   value: s.projectsOnHold    ?? 0, color: "text-amber-600 bg-amber-50" },
                    { label: "Completed", value: s.projectsCompleted ?? 0, color: "text-violet-600 bg-violet-50" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={cn("rounded-xl p-2.5 text-center", color.split(" ")[1])}>
                      <p className={cn("text-xl font-bold tabular-nums", color.split(" ")[0])}><AnimatedNumber value={value} /></p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                {/* Task completion bars */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Tasks Completion</span>
                    <span className="font-semibold">{s.tasksDone ?? 0}/{s.tasksTotal ?? 0}</span>
                  </div>
                  {[
                    { label: "Done", value: s.tasksDone ?? 0, total: s.tasksTotal ?? 1, color: "#10b981" },
                    { label: "In Progress", value: s.tasksInProgress ?? 0, total: s.tasksTotal ?? 1, color: "#3b82f6" },
                    { label: "To Do", value: s.tasksTodo ?? 0, total: s.tasksTotal ?? 1, color: "#94a3b8" },
                  ].map(({ label, value, total, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>{label}</span><span>{value}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${Math.round((value / total) * 100)}%`, background: color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <ProgressRing pct={taskDonePct} size={72} strokeWidth={7} color="#6366f1" label="done" />
            </div>
          </Widget>

          {/* Onboarding */}
          <Widget title="Onboarding" icon={UserPlus} iconBg="bg-pink-50" iconColor="text-pink-600" gradient="from-pink-500 to-rose-600" href="/onboarding" badge={((s.onboardingPending ?? 0) + (s.onboardingSubmitted ?? 0)) > 0 ? String((s.onboardingPending ?? 0) + (s.onboardingSubmitted ?? 0)) : ""}>
            <div className="mb-3">
              <p className="text-3xl font-bold text-slate-900 tabular-nums"><AnimatedNumber value={(s.onboardingPending ?? 0) + (s.onboardingInProgress ?? 0)} /></p>
              <p className="text-xs text-slate-400 mt-0.5">Active invites</p>
            </div>
            <div className="space-y-1.5">
              <StatRow label="Pending"     value={s.onboardingPending    ?? 0} dot="bg-amber-400"   bg="bg-amber-50"   textColor="text-amber-700" />
              <StatRow label="In Progress" value={s.onboardingInProgress ?? 0} dot="bg-blue-500"    bg="bg-blue-50"    textColor="text-blue-700" />
              <StatRow label="Submitted"   value={s.onboardingSubmitted  ?? 0} dot="bg-violet-500"  bg="bg-violet-50"  textColor="text-violet-700" />
              <StatRow label="Completed"   value={s.onboardingCompleted  ?? 0} dot="bg-emerald-500" bg="bg-emerald-50" textColor="text-emerald-700" />
            </div>
          </Widget>
        </div>
      )}

      {/* ── Module Widgets Row 3: PO + Hiring ───────────────────────── */}
      {isPower && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">

          {/* Purchase Orders */}
          <Widget title="Purchase Orders" icon={ShoppingCart} iconBg="bg-teal-50" iconColor="text-teal-600" gradient="from-teal-400 to-cyan-500" href="/purchase-orders">
            <div className="flex items-start gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-400">Active Pipeline</p>
                <p className="text-2xl font-bold text-teal-600 tabular-nums"><AnimatedNumber value={s.poActiveValue ?? 0} prefix="₹" /></p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-400">Total POs</p>
                <p className="text-2xl font-bold text-slate-800 tabular-nums"><AnimatedNumber value={s.poTotal ?? 0} /></p>
              </div>
            </div>
            <div className="space-y-1.5">
              <StatRow label="Active (Received/Ack/WIP)" value={s.poActiveCount ?? 0} dot="bg-teal-500"   bg="bg-teal-50"   textColor="text-teal-700" />
              <StatRow label="Invoiced" value={s.poInvoiced ?? 0} dot="bg-violet-500" bg="bg-violet-50" textColor="text-violet-700" sub={lakhs(s.poInvoicedValue ?? 0)} />
              <StatRow label="Paid"     value={s.poPaid     ?? 0} dot="bg-emerald-500" bg="bg-emerald-50" textColor="text-emerald-700" sub={lakhs(s.poPaidValue ?? 0)} />
            </div>
          </Widget>

          {/* Hiring */}
          <Widget title="Hiring" icon={Briefcase} iconBg="bg-sky-50" iconColor="text-sky-600" gradient="from-sky-400 to-blue-500" href="/hiring">
            <div className="flex items-center gap-4 mb-4">
              <div>
                <p className="text-3xl font-bold text-slate-900 tabular-nums"><AnimatedNumber value={s.openJobs ?? 0} /></p>
                <p className="text-xs text-slate-400 mt-0.5">Open positions</p>
              </div>
              <MiniBars data={[
                s.openJobs ?? 0, s.candidatesInPipeline ?? 0, s.offersExtended ?? 0,
              ]} color="#0ea5e9" />
            </div>
            <div className="space-y-1.5">
              <StatRow label="Open Positions"   value={s.openJobs              ?? 0} dot="bg-sky-500"     bg="bg-sky-50"     textColor="text-sky-700" />
              <StatRow label="In Pipeline"       value={s.candidatesInPipeline  ?? 0} dot="bg-blue-500"    bg="bg-blue-50"    textColor="text-blue-700" />
              <StatRow label="Offers Extended"   value={s.offersExtended        ?? 0} dot="bg-emerald-500" bg="bg-emerald-50" textColor="text-emerald-700" />
            </div>
          </Widget>
        </div>
      )}

      {/* ── Upcoming Holidays + Announcements ───────────────────────── */}
      <div className={cn("grid gap-4 stagger", isPower ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>

        {/* Upcoming Holidays */}
        <div
          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer group hover:shadow-md hover:border-slate-200 transition-all"
          onClick={() => router.push("/holidays")}
        >
          <div className="h-1 bg-gradient-to-r from-rose-400 to-pink-500" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-50 rounded-lg"><CalendarDays className="w-4 h-4 text-rose-500" /></div>
                <span className="text-sm font-bold text-slate-700">Upcoming Holidays</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>

            {data?.upcomingHolidays?.length > 0 ? (
              <div className="space-y-2">
                {(data.upcomingHolidays as any[]).slice(0, 5).map((h: any, i: number) => {
                  const hDate = new Date(h.date);
                  const diff  = Math.ceil((hDate.getTime() - Date.now()) / 86400000);
                  const typeColors: Record<string, string> = {
                    national: "bg-blue-50 text-blue-600", regional: "bg-violet-50 text-violet-600",
                    optional: "bg-amber-50 text-amber-600", company: "bg-emerald-50 text-emerald-600",
                  };
                  return (
                    <div key={h._id ?? i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                      <div className="flex-shrink-0 w-12 text-center bg-rose-50 rounded-xl py-1.5 px-1">
                        <p className="text-xs font-semibold text-rose-400">{format(hDate, "MMM")}</p>
                        <p className="text-lg font-bold text-rose-600 leading-none">{format(hDate, "d")}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{h.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {diff === 0 ? "Today!" : diff === 1 ? "Tomorrow" : `In ${diff} days`}
                        </p>
                      </div>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", typeColors[h.type] ?? "bg-slate-100 text-slate-500")}>
                        {h.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No upcoming holidays</p>
              </div>
            )}
          </div>
        </div>

        {/* Announcements */}
        <div
          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer group hover:shadow-md hover:border-slate-200 transition-all"
          onClick={() => router.push("/announcements")}
        >
          <div className="h-1 bg-gradient-to-r from-amber-400 to-yellow-500" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 rounded-lg"><Megaphone className="w-4 h-4 text-amber-600" /></div>
                <span className="text-sm font-bold text-slate-700">Announcements</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>

            {data?.recentAnnouncements?.length > 0 ? (
              <div className="space-y-2">
                {(data.recentAnnouncements as any[]).slice(0, 5).map((ann: any, i: number) => (
                  <div
                    key={ann._id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors animate-fade-up"
                    style={{ animationDelay: `${i * 60}ms` }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0",
                      ann.priority === "urgent" ? "bg-red-500 animate-ping-dot" :
                      ann.priority === "high"   ? "bg-amber-500" : "bg-blue-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 leading-snug truncate">{ann.title}</p>
                        {ann.priority === "urgent" && (
                          <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200 flex-shrink-0">Urgent</Badge>
                        )}
                      </div>
                      {ann.content && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{ann.content}</p>}
                      <p className="text-[10px] text-slate-400 mt-1">{formatDate(ann.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">All caught up!</p>
                <p className="text-xs text-slate-400 mt-0.5">No announcements right now</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
