"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import CreatePOForm from "@/components/purchase-orders/CreatePOForm";

export default function NewPOPage() {
  const router = useRouter();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/purchase-orders"
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            New Purchase Order
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Fill in the details to create a new PO</p>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <CreatePOForm
          onSuccess={() => router.push("/purchase-orders")}
          onCancel={() => router.push("/purchase-orders")}
        />
      </div>
    </div>
  );
}
