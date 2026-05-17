import { Metadata } from "next";
import ExpensesClient from "@/components/expenses/ExpensesClient";

export const metadata: Metadata = { title: "Expenses | Gehnax HRMS" };

export default function ExpensesPage() {
  return <ExpensesClient />;
}
