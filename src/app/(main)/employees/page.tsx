import type { Metadata } from "next";
import EmployeesClient from "@/components/employees/EmployeesClient";

export const metadata: Metadata = { title: "Employees" };

export default function EmployeesPage() {
  return <EmployeesClient />;
}
