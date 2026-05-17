"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ReceiptText,
  Plus,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  IndianRupee,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import SubmitExpenseForm from "./SubmitExpenseForm";
import ReviewExpenseDialog from "./ReviewExpenseDialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_COLORS: Record<string, string> = {
  pending:  "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  travel: "Travel",
  food: "Food & Meals",
  accommodation: "Accommodation",
  equipment: "Equipment",
  training: "Training",
  medical: "Medical",
  other: "Other",
};

const FILTERS = ["all", "pending", "approved", "rejected"] as const;
type Filter = (typeof FILTERS)[number];

function currency(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function StatCard({
  label,
  amount,
  count,
  icon: Icon,
  iconClass,
  amountClass,
}: {
  label: string;
  amount: number;
  count: number;
  icon: any;
  iconClass: string;
  amountClass: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-lg font-bold leading-tight ${amountClass}`}>{currency(amount)}</p>
        <p className="text-xs text-slate-400">{count} expense{count !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}

export default function ExpensesClient() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role ?? "employee";
  const isAdminOrManager = ["super_admin", "hr_admin", "manager"].includes(role);

  const [filter, setFilter] = useState<Filter>("all");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [reviewExpense, setReviewExpense] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const url = `/api/expenses${filter !== "all" ? `?status=${filter}` : ""}`;
  const { data, isLoading, mutate } = useSWR(url, fetcher, { refreshInterval: 30000 });
  const expenses: any[] = Array.isArray(data) ? data : [];

  const pending  = expenses.filter((e) => e.status === "pending");
  const approved = expenses.filter((e) => e.status === "approved");
  const rejected = expenses.filter((e) => e.status === "rejected");
  const totalAmt  = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
  const pendingAmt = pending.reduce((s, e) => s + (e.amount ?? 0), 0);
  const approvedAmt = approved.reduce((s, e) => s + (e.amount ?? 0), 0);

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Expense deleted");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-blue-600" />
            Expenses
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdminOrManager ? "Manage and approve employee expense claims" : "Submit and track your expense claims"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && isAdminOrManager && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-semibold">
              {pending.length} pending
            </Badge>
          )}
          {!isAdminOrManager && (
            <Button
              onClick={() => setSubmitOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-1.5"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              Submit Expense
            </Button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      {!isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total"
            amount={totalAmt}
            count={expenses.length}
            icon={IndianRupee}
            iconClass="bg-blue-100 text-blue-600"
            amountClass="text-slate-800"
          />
          <StatCard
            label="Pending"
            amount={pendingAmt}
            count={pending.length}
            icon={Clock}
            iconClass="bg-amber-100 text-amber-600"
            amountClass="text-amber-700"
          />
          <StatCard
            label="Approved"
            amount={approvedAmt}
            count={approved.length}
            icon={CheckCircle2}
            iconClass="bg-emerald-100 text-emerald-600"
            amountClass="text-emerald-700"
          />
          <StatCard
            label="Rejected"
            amount={rejected.reduce((s, e) => s + (e.amount ?? 0), 0)}
            count={rejected.length}
            icon={XCircle}
            iconClass="bg-red-100 text-red-500"
            amountClass="text-red-600"
          />
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all capitalize ${
              filter === f
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-14">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ReceiptText className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No expenses found</p>
            <p className="text-xs text-slate-400 mt-1">
              {filter !== "all" ? `No ${filter} expenses` : "Submit your first expense to get started"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                {isAdminOrManager && (
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</TableHead>
                )}
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Amount</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Receipt</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((exp) => {
                const emp = exp.employeeId;
                return (
                  <TableRow key={exp._id} className="hover:bg-slate-50">
                    {isAdminOrManager && (
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {emp ? `${emp.firstName} ${emp.lastName}` : "—"}
                          </p>
                          <p className="text-xs text-slate-400">{emp?.employeeCode}</p>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <p className="text-sm font-medium text-slate-800 max-w-[160px] truncate">{exp.title}</p>
                      {exp.description && (
                        <p className="text-xs text-slate-400 truncate max-w-[160px]">{exp.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">
                        {CATEGORY_LABELS[exp.category] ?? exp.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{formatDate(exp.expenseDate)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-semibold text-slate-800">{currency(exp.amount)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${STATUS_COLORS[exp.status] ?? ""}`}
                      >
                        {exp.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <a
                        href={exp.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {isAdminOrManager && exp.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => setReviewExpense(exp)}
                            className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2"
                          >
                            Review
                          </Button>
                        )}
                        {!isAdminOrManager && exp.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(exp._id)}
                            loading={deleting === exp._id}
                            className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {exp.status !== "pending" && exp.managerNote && (
                          <span className="text-xs text-slate-400 max-w-[120px] truncate" title={exp.managerNote}>
                            {exp.managerNote}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Submit dialog (employees) */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Expense</DialogTitle>
          </DialogHeader>
          <SubmitExpenseForm
            onSuccess={() => {
              setSubmitOpen(false);
              mutate();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Review dialog (managers/HR) */}
      {reviewExpense && (
        <ReviewExpenseDialog
          expense={reviewExpense}
          onClose={() => setReviewExpense(null)}
          onDone={() => {
            setReviewExpense(null);
            mutate();
          }}
        />
      )}
    </div>
  );
}
