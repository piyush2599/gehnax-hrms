import type { Metadata } from "next";
import LeavesClient from "@/components/leaves/LeavesClient";

export const metadata: Metadata = { title: "Leave Management" };

export default function LeavesPage() {
  return <LeavesClient />;
}
