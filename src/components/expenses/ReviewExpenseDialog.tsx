"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ExternalLink, FileText, Image } from "lucide-react";
import { formatDate } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  travel: "Travel",
  food: "Food & Meals",
  accommodation: "Accommodation",
  equipment: "Equipment",
  training: "Training",
  medical: "Medical",
  other: "Other",
};

interface Props {
  expense: any;
  onClose: () => void;
  onDone: () => void;
}

export default function ReviewExpenseDialog({ expense, onClose, onDone }: Props) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<"approved" | "rejected" | null>(null);

  async function handleReview(status: "approved" | "rejected") {
    setLoading(status);
    try {
      const res = await fetch(`/api/expenses/${expense._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, managerNote: note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(status === "approved" ? "Expense approved" : "Expense rejected");
      onDone();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setLoading(null);
    }
  }

  const emp = expense.employeeId;
  const empName = emp ? `${emp.firstName} ${emp.lastName}` : "—";
  const isPdf = expense.receiptType === "application/pdf" || expense.receiptUrl?.includes(".pdf");

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Review Expense</AlertDialogTitle>
          <AlertDialogDescription>
            Submitted by <strong>{empName}</strong> · {formatDate(expense.expenseDate)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-1">
          {/* Summary */}
          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Title</span>
              <span className="text-sm font-semibold text-slate-800">{expense.title}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Category</span>
              <Badge variant="outline" className="text-xs capitalize">
                {CATEGORY_LABELS[expense.category] ?? expense.category}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Amount</span>
              <span className="text-base font-bold text-slate-900">
                ₹{Number(expense.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {expense.description && (
              <div className="pt-1 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-0.5">Description</p>
                <p className="text-sm text-slate-700">{expense.description}</p>
              </div>
            )}
          </div>

          {/* Receipt */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-wide">Receipt</Label>
            <a
              href={expense.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              {isPdf ? (
                <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
              ) : (
                <Image className="w-5 h-5 text-blue-500 flex-shrink-0" />
              )}
              <span className="text-sm text-slate-700 flex-1 truncate">
                {expense.receiptName || "View Receipt"}
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </a>
          </div>

          {/* Manager note */}
          <div className="space-y-1.5">
            <Label htmlFor="manager-note">Note (optional)</Label>
            <Textarea
              id="manager-note"
              placeholder="Add a note for the employee…"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none"
            />
          </div>
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={!!loading}>Cancel</AlertDialogCancel>
          <Button
            onClick={() => handleReview("rejected")}
            loading={loading === "rejected"}
            disabled={!!loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Reject
          </Button>
          <Button
            onClick={() => handleReview("approved")}
            loading={loading === "approved"}
            disabled={!!loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Approve
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
