import type { Metadata } from "next";
import HiringClient from "@/components/hiring/HiringClient";

export const metadata: Metadata = { title: "Hiring" };

export default function HiringPage() {
  return <HiringClient />;
}
