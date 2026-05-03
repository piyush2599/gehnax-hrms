import type { Metadata } from "next";
import AttendanceClient from "@/components/attendance/AttendanceClient";

export const metadata: Metadata = { title: "Attendance" };

export default function AttendancePage() {
  return <AttendanceClient />;
}
