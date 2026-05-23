"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import useSWR from "swr";
import { Skeleton } from "@/components/ui/skeleton";
import CreatePOForm from "@/components/purchase-orders/CreatePOForm";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function EditPOPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: po, isLoading, error } = useSWR(
    `/api/purchase-orders/${params.id}`,
    fetcher
  );

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
            {isLoading ? "Loading…" : `Edit PO — ${po?.poNumber ?? ""}`}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Update purchase order details</p>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : error || !po || po.error ? (
          <p className="text-sm text-red-500 py-8 text-center">
            {po?.error ?? "Failed to load purchase order."}
          </p>
        ) : (
          <CreatePOForm
            editData={po}
            onSuccess={() => router.push("/purchase-orders")}
            onCancel={() => router.push("/purchase-orders")}
          />
        )}
      </div>
    </div>
  );
}
