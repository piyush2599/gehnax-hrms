"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Paperclip, X, FileText, Image } from "lucide-react";

const CATEGORIES = [
  { value: "travel", label: "Travel" },
  { value: "food", label: "Food & Meals" },
  { value: "accommodation", label: "Accommodation" },
  { value: "equipment", label: "Equipment" },
  { value: "training", label: "Training" },
  { value: "medical", label: "Medical" },
  { value: "other", label: "Other" },
];

interface Props {
  onSuccess: () => void;
}

export default function SubmitExpenseForm({ onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedReceipt, setUploadedReceipt] = useState<{ url: string; name: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "",
    amount: "",
    expenseDate: "",
    description: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(f.type)) {
      toast.error("Only JPEG, PNG, WebP images or PDF allowed");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10 MB)");
      return;
    }

    setFile(f);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/expenses/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUploadedReceipt({ url: data.url, name: data.name, type: data.type });
      toast.success("Receipt uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setFile(null);
      setUploadedReceipt(null);
    } finally {
      setUploading(false);
    }
  }

  function removeReceipt() {
    setFile(null);
    setUploadedReceipt(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadedReceipt) {
      toast.error("Please upload a receipt");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          receiptUrl: uploadedReceipt.url,
          receiptName: uploadedReceipt.name,
          receiptType: uploadedReceipt.type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      toast.success("Expense submitted for approval");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit expense");
    } finally {
      setLoading(false);
    }
  }

  const isPdf = uploadedReceipt?.type === "application/pdf";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="exp-title">Title <span className="text-red-500">*</span></Label>
        <Input
          id="exp-title"
          placeholder="e.g. Team lunch, Flight to Mumbai"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Category */}
        <div className="space-y-1.5">
          <Label htmlFor="exp-cat">Category <span className="text-red-500">*</span></Label>
          <select
            id="exp-cat"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            required
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <Label htmlFor="exp-amt">Amount (₹) <span className="text-red-500">*</span></Label>
          <Input
            id="exp-amt"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            required
          />
        </div>
      </div>

      {/* Expense Date */}
      <div className="space-y-1.5">
        <Label htmlFor="exp-date">Expense Date <span className="text-red-500">*</span></Label>
        <Input
          id="exp-date"
          type="date"
          max={new Date().toISOString().split("T")[0]}
          value={form.expenseDate}
          onChange={(e) => set("expenseDate", e.target.value)}
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="exp-desc">Description</Label>
        <Textarea
          id="exp-desc"
          placeholder="Additional details about this expense…"
          rows={2}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className="resize-none"
        />
      </div>

      {/* Receipt Upload */}
      <div className="space-y-1.5">
        <Label>Receipt <span className="text-red-500">*</span></Label>

        {!uploadedReceipt ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
          >
            <Paperclip className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">
              {uploading ? "Uploading…" : "Click to upload receipt"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">JPEG, PNG, WebP or PDF · max 10 MB</p>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            {isPdf ? (
              <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />
            ) : (
              <Image className="w-8 h-8 text-blue-500 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{uploadedReceipt.name}</p>
              <p className="text-xs text-emerald-600">Uploaded successfully</p>
            </div>
            <button type="button" onClick={removeReceipt} className="text-slate-400 hover:text-red-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <Button
        type="submit"
        loading={loading || uploading}
        disabled={uploading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {loading ? "Submitting…" : "Submit for Approval"}
      </Button>
    </form>
  );
}
