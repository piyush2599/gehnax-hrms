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

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalEmployees,
    activeEmployees,
    todayAttendance,
    pendingLeaves,
    departments,
    recentAnnouncements,
    openJobs,
    candidatesInPipeline,
    offersExtended,
    recentJobs,
    expenseStats,
  ] = await Promise.all([
    Employee.countDocuments(),
    Employee.countDocuments({ isActive: true }),
    Attendance.countDocuments({ date: today, status: "present" }),
    Leave.countDocuments({ status: "pending" }),
    Department.countDocuments({ isActive: true }),
    Announcement.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("postedBy", "firstName lastName"),
    JobPosting.countDocuments({ status: "open" }),
    Candidate.countDocuments({ stage: { $in: ["applied", "screening", "interview"] } }),
    Candidate.countDocuments({ stage: "offer" }),
    JobPosting.find({ status: "open" })
      .sort({ createdAt: -1 })
      .limit(4)
      .populate("department", "name"),
    Expense.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
    ]),
  ]);

  const expenseByStatus: Record<string, { count: number; amount: number }> = {};
  (expenseStats as any[]).forEach((e) => { expenseByStatus[e._id] = { count: e.count, amount: e.amount }; });

  // Attendance trend (last 7 days) — single aggregation instead of 7 queries
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const attendanceCounts = await Attendance.aggregate([
    { $match: { date: { $gte: sevenDaysAgo }, status: "present" } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        present: { $sum: 1 },
      },
    },
  ]);

  const attendanceMap = new Map(attendanceCounts.map((a) => [a._id, a.present]));

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toISOString().split("T")[0];
    return { date: dateStr, present: attendanceMap.get(dateStr) ?? 0 };
  });

  // Department headcount
  const deptHeadcount = await Employee.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$department", count: { $sum: 1 } } },
    {
      $lookup: {
        from: "departments",
        localField: "_id",
        foreignField: "_id",
        as: "dept",
      },
    },
    { $unwind: "$dept" },
    { $project: { name: "$dept.name", count: 1 } },
  ]);

  return NextResponse.json({
    stats: {
      totalEmployees,
      activeEmployees,
      todayAttendance,
      pendingLeaves,
      departments,
      openJobs,
      candidatesInPipeline,
      offersExtended,
      attendanceRate:
        activeEmployees > 0
          ? Math.round((todayAttendance / activeEmployees) * 100)
          : 0,
      pendingExpenses: expenseByStatus.pending?.count ?? 0,
      pendingExpensesAmount: expenseByStatus.pending?.amount ?? 0,
      approvedExpenses: expenseByStatus.approved?.count ?? 0,
      approvedExpensesAmount: expenseByStatus.approved?.amount ?? 0,
      rejectedExpenses: expenseByStatus.rejected?.count ?? 0,
    },
    attendanceTrend: last7Days,
    deptHeadcount,
    recentAnnouncements,
    recentJobs,
  });
}
