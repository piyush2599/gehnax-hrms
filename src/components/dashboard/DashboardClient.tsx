"use client";

import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users, UserCheck, Calendar, Building2,
  TrendingUp, Megaphone, CheckCircle2, Clock,
  ArrowUpRight, UserPlus, Briefcase,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { format } from "date-fns";
import AttendanceWidget from "./AttendanceWidget";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardClient() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "employee";
  const { data, isLoading } = useSWR("/api/dashboard", fetcher, { refreshInterval: 60000 });
  const user = session?.user as any;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] || "there";

  const isAdminOrHR = ["super_admin", "hr_admin"].includes(role);
  const stats = data?.stats || {};

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -bottom-12 -right-4 w-56 h-56 bg-white/5 rounded-full" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <p className="text-blue-200 text-sm font-medium">{greeting},</p>
            <h2 className="text-2xl font-bold mt-0.5">{firstName}!</h2>
            <p className="text-blue-200 text-sm mt-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {format(now, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          {isAdminOrHR && (
            <div className="flex gap-3">
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3 text-center">
                <p className="text-2xl font-bold">{stats.activeEmployees ?? 0}</p>
                <p className="text-blue-200 text-xs mt-0.5 font-medium">Active Staff</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3 text-center">
                <p className="text-2xl font-bold">{stats.attendanceRate ?? 0}%</p>
                <p className="text-blue-200 text-xs mt-0.5 font-medium">Present Today</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Employee attendance widget */}
      {role === "employee" && <AttendanceWidget />}

      {/* KPI Stats (Admin/HR) */}
      {isAdminOrHR && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Employees"
              value={stats.totalEmployees ?? 0}
              sub={`${stats.activeEmployees ?? 0} active`}
              icon={Users}
              color="blue"
            />
            <StatCard
              title="Present Today"
              value={stats.todayAttendance ?? 0}
              sub={`${stats.attendanceRate ?? 0}% attendance`}
              icon={UserCheck}
              color="emerald"
            />
            <StatCard
              title="Pending Leaves"
              value={stats.pendingLeaves ?? 0}
              sub="awaiting review"
              icon={Calendar}
              color="amber"
            />
            <StatCard
              title="Departments"
              value={stats.departments ?? 0}
              sub="active teams"
              icon={Building2}
              color="violet"
            />
          </div>

          {/* Hiring Stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              title="Open Positions"
              value={stats.openJobs ?? 0}
              sub="active job postings"
              icon={Briefcase}
              color="blue"
            />
            <StatCard
              title="In Pipeline"
              value={stats.candidatesInPipeline ?? 0}
              sub="applied / screening / interview"
              icon={Users}
              color="violet"
            />
            <StatCard
              title="Offers Extended"
              value={stats.offersExtended ?? 0}
              sub="awaiting acceptance"
              icon={UserPlus}
              color="emerald"
            />
          </div>
        </>
      )}

      {/* Charts row */}
      <div className={cn(
        "grid gap-6",
        isAdminOrHR ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
      )}>
        {/* Attendance trend */}
        {isAdminOrHR && (
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                </div>
                Attendance — Last 7 Days
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              {data?.attendanceTrend?.length > 0 ? (
                <div className="space-y-3">
                  {data.attendanceTrend.map((day: any) => {
                    const pct =
                      stats.activeEmployees > 0
                        ? Math.round((day.present / stats.activeEmployees) * 100)
                        : 0;
                    return (
                      <div key={day.date} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-16 flex-shrink-0 font-medium">
                          {format(new Date(day.date), "EEE d")}
                        </span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 w-6 text-right">
                          {day.present}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center py-8">No attendance data</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dept headcount */}
        {isAdminOrHR && (
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="p-1.5 bg-violet-50 rounded-lg">
                  <Building2 className="w-3.5 h-3.5 text-violet-600" />
                </div>
                Headcount by Department
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              {data?.deptHeadcount?.length > 0 ? (
                <div className="space-y-3">
                  {data.deptHeadcount.map((dept: any) => {
                    const maxCount = Math.max(...data.deptHeadcount.map((d: any) => d.count), 1);
                    const pct = Math.round((dept.count / maxCount) * 100);
                    return (
                      <div key={dept._id} className="flex items-center gap-3">
                        <span className="text-xs text-slate-600 font-medium truncate flex-1 min-w-0">
                          {dept.name}
                        </span>
                        <div className="w-28 bg-slate-100 rounded-full h-2 flex-shrink-0">
                          <div
                            className="bg-violet-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 w-8 text-right flex-shrink-0">
                          {dept.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center py-8">No department data</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Open Job Postings */}
        {isAdminOrHR && data?.recentJobs?.length > 0 && (
          <Card className="border border-slate-200 shadow-sm lg:col-span-2">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                </div>
                Open Positions
                <Badge variant="outline" className="ml-auto text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                  {stats.openJobs ?? 0} open
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.recentJobs.map((job: any) => (
                  <div key={job._id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{job.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{job.department?.name ?? "—"}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-xs bg-white border-slate-200 text-slate-500 capitalize">
                          {job.jobType?.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-slate-400">{job.positions} position{job.positions !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Announcements */}
        <Card className={cn("border border-slate-200 shadow-sm", isAdminOrHR && "lg:col-span-2")}>
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
                {data.recentAnnouncements.map((ann: any) => (
                  <div
                    key={ann._id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-default"
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                        ann.priority === "urgent"
                          ? "bg-red-500"
                          : ann.priority === "high"
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 leading-snug">
                          {ann.title}
                        </p>
                        {ann.priority === "urgent" && (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200 flex-shrink-0">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{ann.content}</p>
                      <p className="text-xs text-slate-400 mt-1.5">{formatDate(ann.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
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
    </div>
  );
}

const COLOR_MAP = {
  blue:   { bg: "bg-blue-50",   icon: "text-blue-600",   value: "text-slate-900" },
  emerald:{ bg: "bg-emerald-50",icon: "text-emerald-600",value: "text-slate-900" },
  amber:  { bg: "bg-amber-50",  icon: "text-amber-600",  value: "text-slate-900" },
  violet: { bg: "bg-violet-50", icon: "text-violet-600", value: "text-slate-900" },
};

function StatCard({
  title, value, sub, icon: Icon, color,
}: {
  title: string;
  value: number;
  sub: string;
  icon: React.ElementType;
  color: keyof typeof COLOR_MAP;
}) {
  const c = COLOR_MAP[color];
  return (
    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-2.5 rounded-xl", c.bg)}>
            <Icon className={cn("w-5 h-5", c.icon)} />
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-300" />
        </div>
        <p className={cn("text-2xl font-bold leading-none", c.value)}>{value}</p>
        <p className="text-sm font-semibold text-slate-700 mt-2 leading-tight">{title}</p>
        <p className="text-xs text-slate-400 mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}
