import type { Metadata } from "next";
import TimesheetsClient from "@/components/timesheets/TimesheetsClient";

export const metadata: Metadata = { title: "Timesheets" };

export default function TimesheetsPage() {
  return <TimesheetsClient />;
}
