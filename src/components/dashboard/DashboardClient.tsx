"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users, UserCheck, Calendar, Building2,
  TrendingUp, Megaphone, CheckCircle2, Clock,
  ArrowUpRight, UserPlus, Briefcase, ChevronRight, ReceiptText,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { format } from "date-fns";
import AttendanceWidget from "./AttendanceWidget";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const DEPT_COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899","#f97316"];

export default function DashboardClient() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "employee";
  const { data, isLoading } = useSWR("/api/dashboard", fetcher, { refreshInterval: 60000 });
  const user = session?.user as any;
  const router = useRouter();

  const [greeting, setGreeting] = useState("Welcome");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");
    setDateStr(format(now, "EEEE, MMMM d, yyyy"));
  }, []);

  const firstName = user?.name?.split(" ")[0] || "there";
  const isAdminOrHR = ["super_admin", "hr_admin"].includes(role);
  const stats = data?.stats || {};

  const attendanceTrend = (data?.attendanceTrend || []).map((d: any) => ({
    day: format(new Date(d.date), "EEE"),
    present: d.present,
    pct: stats.activeEmployees > 0 ? Math.round((d.present / stats.activeEmployees) * 100) : 0,
  }));

  const deptData = (data?.deptHeadcount || []).map((d: any, i: number) => ({
    name: d.name.length > 14 ? d.name.slice(0, 13) + "…" : d.name,
    count: d.count,
    fill: DEPT_COLORS[i % DEPT_COLORS.length],
  }));

  const hiringPipeline = stats.candidatesInPipeline > 0 || stats.offersExtended > 0 ? [
    { name: "Pipeline", value: stats.candidatesInPipeline ?? 0, fill: "#3b82f6" },
    { name: "Offers", value: stats.offersExtended ?? 0, fill: "#10b981" },
  ].filter(d => d.value > 0) : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white shadow-lg shadow-blue-600/20">
        <div className="absolute -top-8 -right-8 w-48 h-48 bg-white/5 rounded-full animate-float" />
        <div className="absolute -bottom-12 -right-4 w-64 h-64 bg-white/4 rounded-full animate-float" style={{animationDelay:"1.2s"}} />
        <div className="absolute top-4 right-32 w-24 h-24 bg-white/5 rounded-full animate-float" style={{animationDelay:"0.6s"}} />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <p className="text-blue-200 text-sm font-medium">{greeting},</p>
            <h2 className="text-2xl font-bold mt-0.5">{firstName}!</h2>
            <p className="text-blue-200 text-sm mt-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {dateStr}
            </p>
          </div>
          {isAdminOrHR && (
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/employees")}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3 text-center transition-colors"
              >
                <p className="text-2xl font-bold">{stats.activeEmployees ?? 0}</p>
                <p className="text-blue-200 text-xs mt-0.5 font-medium">Active Staff</p>
              </button>
              <button
                onClick={() => router.push("/attendance")}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3 text-center transition-colors"
              >
                <p className="text-2xl font-bold">{stats.attendanceRate ?? 0}%</p>
                <p className="text-blue-200 text-xs mt-0.5 font-medium">Present Today</p>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Employee attendance widget */}
      {role === "employee" && <AttendanceWidget />}

      {/* KPI Stats */}
      {isAdminOrHR && (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 stagger">
          <StatCard
            title="Total Employees"
            value={stats.totalEmployees ?? 0}
            sub={`${stats.activeEmployees ?? 0} active`}
            icon={Users}
            color="blue"
            onClick={() => router.push("/employees")}
          />
          <StatCard
            title="Present Today"
            value={stats.todayAttendance ?? 0}
            sub={`${stats.attendanceRate ?? 0}% rate`}
            icon={UserCheck}
            color="emerald"
            onClick={() => router.push("/attendance")}
          />
          <StatCard
            title="Pending Leaves"
            value={stats.pendingLeaves ?? 0}
            sub="awaiting review"
            icon={Calendar}
            color="amber"
            onClick={() => router.push("/leaves")}
          />
          <StatCard
            title="Departments"
            value={stats.departments ?? 0}
            sub="active teams"
            icon={Building2}
            color="violet"
            onClick={() => router.push("/departments")}
          />
          <StatCard
            title="Pending Expenses"
            value={stats.pendingExpenses ?? 0}
            sub={`₹${((stats.pendingExpensesAmount ?? 0) / 1000).toFixed(1)}k pending`}
            icon={ReceiptText}
            color="orange"
            onClick={() => router.push("/expenses")}
          />
        </div>
      )}

      {/* Charts row */}
      {isAdminOrHR && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance trend area chart */}
          <Card
            className="border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/attendance")}
          >
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                </div>
                Attendance — Last 7 Days
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              {attendanceTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={attendanceTrend} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <defs>
                      <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }}
                      formatter={(v: any) => [`${v} present`, ""]}
                      labelStyle={{ color: "#64748b", fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="present"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fill="url(#attendGrad)"
                      dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-sm text-center py-8">No attendance data</p>
              )}
            </CardContent>
          </Card>

          {/* Department headcount bar chart */}
          <Card
            className="border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/departments")}
          >
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="p-1.5 bg-violet-50 rounded-lg">
                  <Building2 className="w-3.5 h-3.5 text-violet-600" />
                </div>
                Headcount by Department
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              {deptData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={deptData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      width={82}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }}
                      formatter={(v: any) => [`${v} employees`, ""]}
                      labelStyle={{ color: "#64748b", fontWeight: 600 }}
                      cursor={{ fill: "#f8fafc" }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={20}>
                      {deptData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-sm text-center py-8">No department data</p>
              )}
            </CardContent>
          </Card>

          {/* Hiring overview */}
          <Card
            className="border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/hiring")}
          >
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                </div>
                Hiring Overview
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center gap-6">
                {/* Donut chart */}
                {hiringPipeline.length > 0 ? (
                  <div className="flex-shrink-0">
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie
                          data={hiringPipeline}
                          cx="50%"
                          cy="50%"
                          innerRadius={34}
                          outerRadius={52}
                          dataKey="value"
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {hiringPipeline.map((entry: any, i: number) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }}
                          formatter={(v: any, name: any) => [`${v}`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="w-[120px] h-[120px] flex-shrink-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full border-4 border-slate-100 flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-slate-300" />
                    </div>
                  </div>
                )}
                {/* Legend + stats */}
                <div className="flex-1 space-y-3">
                  <div
                    className="flex items-center justify-between p-2.5 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={(e) => { e.stopPropagation(); router.push("/hiring"); }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="text-xs font-medium text-slate-700">Open Positions</span>
                    </div>
                    <span className="text-sm font-bold text-blue-700">{stats.openJobs ?? 0}</span>
                  </div>
                  <div
                    className="flex items-center justify-between p-2.5 bg-violet-50 rounded-xl cursor-pointer hover:bg-violet-100 transition-colors"
                    onClick={(e) => { e.stopPropagation(); router.push("/hiring"); }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                      <span className="text-xs font-medium text-slate-700">In Pipeline</span>
                    </div>
                    <span className="text-sm font-bold text-violet-700">{stats.candidatesInPipeline ?? 0}</span>
                  </div>
                  <div
                    className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors"
                    onClick={(e) => { e.stopPropagation(); router.push("/hiring"); }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-medium text-slate-700">Offers Extended</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-700">{stats.offersExtended ?? 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expense Overview */}
          <Card
            className="border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/expenses")}
          >
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="p-1.5 bg-orange-50 rounded-lg">
                  <ReceiptText className="w-3.5 h-3.5 text-orange-600" />
                </div>
                Expense Overview
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div
                  className="flex items-center justify-between p-2.5 bg-amber-50 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={(e) => { e.stopPropagation(); router.push("/expenses?status=pending"); }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-medium text-slate-700">Pending Approval</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-700">{stats.pendingExpenses ?? 0}</span>
                    <p className="text-xs text-amber-600 leading-none mt-0.5">
                      ₹{((stats.pendingExpensesAmount ?? 0)).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
                <div
                  className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors"
                  onClick={(e) => { e.stopPropagation(); router.push("/expenses?status=approved"); }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium text-slate-700">Approved</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-700">{stats.approvedExpenses ?? 0}</span>
                    <p className="text-xs text-emerald-600 leading-none mt-0.5">
                      ₹{((stats.approvedExpensesAmount ?? 0)).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
                <div
                  className="flex items-center justify-between p-2.5 bg-red-50 rounded-xl cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={(e) => { e.stopPropagation(); router.push("/expenses?status=rejected"); }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="text-xs font-medium text-slate-700">Rejected</span>
                  </div>
                  <span className="text-sm font-bold text-red-600">{stats.rejectedExpenses ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Announcements */}
          <Card
            className="border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/announcements")}
          >
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 rounded-lg">
                  <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                </div>
                Recent Announcements
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {data?.recentAnnouncements?.length > 0 ? (
                <div className="space-y-2">
                  {data.recentAnnouncements.slice(0, 4).map((ann: any) => (
                    <div
                      key={ann._id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                          ann.priority === "urgent" ? "bg-red-500" :
                          ann.priority === "high" ? "bg-amber-500" : "bg-blue-500"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800 leading-snug truncate">
                            {ann.title}
                          </p>
                          {ann.priority === "urgent" && (
                            <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200 flex-shrink-0">
                              Urgent
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{formatDate(ann.createdAt)}</p>
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Non-admin announcements */}
      {!isAdminOrHR && (
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 rounded-lg">
                <Megaphone className="w-3.5 h-3.5 text-amber-600" />
              </div>
              Recent Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {data?.recentAnnouncements?.length > 0 ? (
              <div className="space-y-2">
                {data.recentAnnouncements.slice(0, 5).map((ann: any) => (
                  <div key={ann._id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                      ann.priority === "urgent" ? "bg-red-500" :
                      ann.priority === "high" ? "bg-amber-500" : "bg-blue-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 leading-snug">{ann.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{ann.content}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(ann.createdAt)}</p>
                    </div>
                    {ann.priority === "urgent" && (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200 flex-shrink-0">
                        Urgent
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">All caught up!</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const COLOR_MAP = {
  blue:   { grad: "from-blue-500 to-indigo-600",   bg: "bg-blue-50",    icon: "text-blue-600",    bar: "bg-blue-500",    glow: "shadow-blue-500/25" },
  emerald:{ grad: "from-emerald-500 to-teal-600",  bg: "bg-emerald-50", icon: "text-emerald-600", bar: "bg-emerald-500", glow: "shadow-emerald-500/25" },
  amber:  { grad: "from-amber-500 to-orange-600",  bg: "bg-amber-50",   icon: "text-amber-600",   bar: "bg-amber-500",   glow: "shadow-amber-500/25" },
  violet: { grad: "from-violet-500 to-purple-600", bg: "bg-violet-50",  icon: "text-violet-600",  bar: "bg-violet-500",  glow: "shadow-violet-500/25" },
  orange: { grad: "from-orange-500 to-red-500",    bg: "bg-orange-50",  icon: "text-orange-600",  bar: "bg-orange-500",  glow: "shadow-orange-500/25" },
};

function StatCard({
  title, value, sub, icon: Icon, color, onClick,
}: {
  title: string;
  value: number;
  sub: string;
  icon: React.ElementType;
  color: keyof typeof COLOR_MAP;
  onClick?: () => void;
}) {
  const c = COLOR_MAP[color];
  return (
    <div
      className={cn(
        "group relative bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden transition-all duration-300",
        onClick && "cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-slate-200"
      )}
      onClick={onClick}
    >
      {/* Top gradient bar */}
      <div className={cn("h-1 w-full bg-gradient-to-r", c.grad)} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-2.5 rounded-xl shadow-sm", c.bg, `shadow-sm ${c.glow}`)}>
            <Icon className={cn("w-5 h-5", c.icon)} />
          </div>
          {onClick && (
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          )}
        </div>
        <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums animate-count-up">{value}</p>
        <p className="text-sm font-semibold text-slate-700 mt-2 leading-tight">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
