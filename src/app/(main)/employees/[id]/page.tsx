import type { Metadata } from "next";
import EmployeeDetail from "@/components/employees/EmployeeDetail";

export const metadata: Metadata = { title: "Employee Details" };

export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
  return <EmployeeDetail employeeId={params.id} />;
}
