import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import Attendance from "@/models/Attendance";
import Leave from "@/models/Leave";
import Announcement from "@/models/Announcement";
import Department from "@/models/Department";
import JobPosting from "@/models/JobPosting";
import Candidate from "@/models/Candidate";
import Expense from "@/models/Expense";
import Timesheet from "@/models/Timesheet";
import Payroll from "@/models/Payroll";
import PurchaseOrder from "@/models/PurchaseOrder";
import Project from "@/models/Project";
import Task from "@/models/Task";
import Holiday from "@/models/Holiday";
import OnboardingInvite from "@/models/OnboardingInvite";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const [
    totalEmployees, activeEmployees, todayAttendance, pendingLeaves, departments,
    recentAnnouncements, openJobs, candidatesInPipeline, offersExtended, recentJobs,
    expenseStats,
    leaveAgg,
    timesheetAgg,
    timesheetHours,
    payrollAgg,
    poAgg,
    projectAgg,
    taskAgg,
    upcomingHolidays,
    onboardingAgg,
  ] = await Promise.all([
    Employee.countDocuments(),
    Employee.countDocuments({ isActive: true }),
    Attendance.countDocuments({ date: today, status: "present" }),
    Leave.countDocuments({ status: "pending" }),
    Department.countDocuments({ isActive: true }),
    Announcement.find({ isActive: true }).sort({ createdAt: -1 }).limit(5).populate("postedBy","firstName lastName"),
    JobPosting.countDocuments({ status: "open" }),
    Candidate.countDocuments({ stage: { $in: ["applied","screening","interview"] } }),
    Candidate.countDocuments({ stage: "offer" }),
    JobPosting.find({ status: "open" }).sort({ createdAt: -1 }).limit(4).populate("department","name"),
    Expense.aggregate([{ $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } }]),
    // new
    Leave.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Timesheet.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Timesheet.aggregate([
      { $match: { status: { $in: ["submitted","approved"] } } },
      { $group: { _id: null, total: { $sum: "$totalHours" } } },
    ]),
    Payroll.aggregate([
      { $match: { month, year } },
      { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$netPay" } } },
    ]),
    PurchaseOrder.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$totalAmount" } } },
    ]),
    Project.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Task.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Holiday.find({ date: { $gte: today }, isActive: true }).sort({ date: 1 }).limit(6).select("name date type"),
    OnboardingInvite.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  // Reshape aggregates into maps
  const byStatus = <T>(agg: any[], valueFn?: (x: any) => any): Record<string, T> => {
    const map: Record<string, any> = {};
    agg.forEach((x) => { map[x._id] = valueFn ? valueFn(x) : x.count; });
    return map;
  };

  const expenseByStatus = byStatus<{ count: number; amount: number }>(expenseStats, (x) => ({ count: x.count, amount: x.amount }));
  const leaveByStatus   = byStatus<number>(leaveAgg);
  const tsStatus        = byStatus<number>(timesheetAgg);
  const payByStatus     = byStatus<{ count: number; total: number }>(payrollAgg, (x) => ({ count: x.count, total: x.total }));
  const poByStatus      = byStatus<{ count: number; value: number }>(poAgg, (x) => ({ count: x.count, value: x.value }));
  const projectByStatus = byStatus<number>(projectAgg);
  const taskByStatus    = byStatus<number>(taskAgg);
  const obByStatus      = byStatus<number>(onboardingAgg);

  const activePoValue = ["received","acknowledged","in_progress"].reduce((s, k) => s + (poByStatus[k]?.value ?? 0), 0);
  const totalPoValue  = Object.values(poByStatus).reduce((s, v) => s + v.value, 0);
  const totalTasks    = Object.values(taskByStatus).reduce((s, v) => s + v, 0);

  // Attendance trend (last 7 days)
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); sevenDaysAgo.setHours(0,0,0,0);
  const attendanceCounts = await Attendance.aggregate([
    { $match: { date: { $gte: sevenDaysAgo }, status: "present" } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, present: { $sum: 1 } } },
  ]);
  const attendanceMap = new Map(attendanceCounts.map((a) => [a._id, a.present]));
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0,0,0,0);
    const ds = d.toISOString().split("T")[0];
    return { date: ds, present: attendanceMap.get(ds) ?? 0 };
  });

  // Dept headcount
  const deptHeadcount = await Employee.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$department", count: { $sum: 1 } } },
    { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "dept" } },
    { $unwind: "$dept" },
    { $project: { name: "$dept.name", count: 1 } },
  ]);

  return NextResponse.json({
    stats: {
      // existing
      totalEmployees, activeEmployees, todayAttendance, pendingLeaves, departments,
      openJobs, candidatesInPipeline, offersExtended,
      attendanceRate: activeEmployees > 0 ? Math.round((todayAttendance / activeEmployees) * 100) : 0,
      pendingExpenses: expenseByStatus.pending?.count ?? 0,
      pendingExpensesAmount: expenseByStatus.pending?.amount ?? 0,
      approvedExpenses: expenseByStatus.approved?.count ?? 0,
      approvedExpensesAmount: expenseByStatus.approved?.amount ?? 0,
      rejectedExpenses: expenseByStatus.rejected?.count ?? 0,
      // leaves
      leavePending:  leaveByStatus.pending  ?? 0,
      leaveApproved: leaveByStatus.approved ?? 0,
      leaveRejected: leaveByStatus.rejected ?? 0,
      // timesheets
      tsSubmitted: tsStatus.submitted ?? 0,
      tsApproved:  tsStatus.approved  ?? 0,
      tsDraft:     tsStatus.draft     ?? 0,
      tsRejected:  tsStatus.rejected  ?? 0,
      tsHoursTotal: timesheetHours[0]?.total ?? 0,
      // payroll (this month)
      payrollProcessed: payByStatus.processed?.count ?? 0,
      payrollPaid:      payByStatus.paid?.count      ?? 0,
      payrollNetPay:    (payByStatus.processed?.total ?? 0) + (payByStatus.paid?.total ?? 0),
      // purchase orders
      poTotal: Object.values(poByStatus).reduce((s, v) => s + v.count, 0),
      poActiveCount: (poByStatus.received?.count ?? 0) + (poByStatus.acknowledged?.count ?? 0) + (poByStatus.in_progress?.count ?? 0),
      poActiveValue: activePoValue,
      poTotalValue:  totalPoValue,
      poInvoiced: poByStatus.invoiced?.count ?? 0,
      poInvoicedValue: poByStatus.invoiced?.value ?? 0,
      poPaid:     poByStatus.paid?.count ?? 0,
      poPaidValue: poByStatus.paid?.value ?? 0,
      // projects
      projectsActive:    projectByStatus.active    ?? 0,
      projectsPlanning:  projectByStatus.planning  ?? 0,
      projectsOnHold:    projectByStatus.on_hold   ?? 0,
      projectsCompleted: projectByStatus.completed ?? 0,
      projectsTotal:     Object.values(projectByStatus).reduce((s, v) => s + v, 0),
      tasksDone:         taskByStatus.done         ?? 0,
      tasksInProgress:   taskByStatus.in_progress  ?? 0,
      tasksTodo:         taskByStatus.todo         ?? 0,
      tasksTotal:        totalTasks,
      // onboarding
      onboardingPending:    obByStatus.pending     ?? 0,
      onboardingInProgress: obByStatus.in_progress ?? 0,
      onboardingSubmitted:  obByStatus.submitted   ?? 0,
      onboardingCompleted:  obByStatus.completed   ?? 0,
    },
    attendanceTrend: last7Days,
    deptHeadcount,
    recentAnnouncements,
    recentJobs,
    upcomingHolidays,
  });
}
