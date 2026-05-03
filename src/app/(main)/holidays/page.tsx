import type { Metadata } from "next";
import HolidaysClient from "@/components/HolidaysClient";

export const metadata: Metadata = { title: "Holiday Calendar" };

export default function HolidaysPage() {
  return <HolidaysClient />;
}
