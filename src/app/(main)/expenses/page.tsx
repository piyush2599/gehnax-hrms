import { Metadata } from "next";
import ExpensesClient from "@/components/expenses/ExpensesClient";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return <ExpensesClient />;
}
