import type { Metadata } from "next";
import DepartmentsClient from "@/components/DepartmentsClient";

export const metadata: Metadata = { title: "Departments" };

export default function DepartmentsPage() {
  return <DepartmentsClient />;
}
