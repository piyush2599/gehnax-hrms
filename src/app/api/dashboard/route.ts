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
  ]);

  // Attendance trend (last 7 days)
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const present = await Attendance.countDocuments({
      date: { $gte: date, $lt: nextDate },
      status: "present",
    });

    last7Days.push({
      date: date.toISOString().split("T")[0],
      present,
    });
  }

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
    },
    attendanceTrend: last7Days,
    deptHeadcount,
    recentAnnouncements,
    recentJobs,
  });
}
