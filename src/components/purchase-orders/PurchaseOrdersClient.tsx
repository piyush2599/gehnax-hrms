"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Input }    from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ShoppingCart, Plus, Search, Eye, Pencil, Trash2,
  TrendingUp, Clock, CheckCircle2, IndianRupee, AlertCircle,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import PODetailDialog  from "./PODetailDialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/* ── constants ──────────────────────────────────────────────────────────── */
export const STATUS_LABEL: Record<string, string> = {
  received:     "Received",
  acknowledged: "Acknowledged",
  in_progress:  "In Progress",
  on_hold:      "On Hold",
  delivered:    "Delivered",
  invoiced:     "Invoiced",
  paid:         "Paid",
  cancelled:    "Cancelled",
};

export const STATUS_COLORS: Record<string, string> = {
  received:     "bg-blue-50 text-blue-700 border-blue-200",
  acknowledged: "bg-indigo-50 text-indigo-700 border-indigo-200",
  in_progress:  "bg-amber-50 text-amber-700 border-amber-200",
  on_hold:      "bg-slate-50 text-slate-600 border-slate-200",
  delivered:    "bg-teal-50 text-teal-700 border-teal-200",
  invoiced:     "bg-violet-50 text-violet-700 border-violet-200",
  paid:         "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled:    "bg-red-50 text-red-600 border-red-200",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low:    "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high:   "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

const STATUS_FILTERS = ["all", "received", "acknowledged", "in_progress", "on_hold", "delivered", "invoiced", "paid", "cancelled"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function currency(n: number) {
  return "₹" + (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0 });
}

function StatCard({
  label, value, sub, icon: Icon, iconClass, valueClass,
}: {
  label: string; value: string; sub: string;
  icon: any; iconClass: string; valueClass: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-lg font-bold leading-tight ${valueClass}`}>{value}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

/* ── main component ─────────────────────────────────────────────────────── */
export default function PurchaseOrdersClient() {
  const { data: session } = useSession();
  const router = useRouter();
  const roles: string[] = (session?.user as any)?.roles || ["employee"];
  const canWrite  = roles.some(r => ["super_admin", "finance_admin", "manager"].includes(r));
  const canDelete = roles.some(r => ["super_admin", "finance_admin"].includes(r));

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch]             = useState("");
  const [viewPO, setViewPO]             = useState<any | null>(null);
  const [deleting, setDeleting]         = useState<string | null>(null);

  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (search)                  params.set("search", search);

  const { data, isLoading, mutate } = useSWR(
    `/api/purchase-orders?${params.toString()}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  const pos:   any[]  = data?.pos   ?? [];
  const stats: any    = data?.stats ?? {};

  const activeValue   = (stats.byStatus?.received?.value ?? 0)
    + (stats.byStatus?.acknowledged?.value ?? 0)
    + (stats.byStatus?.in_progress?.value  ?? 0);
  const activeCount   = (stats.byStatus?.received?.count ?? 0)
    + (stats.byStatus?.acknowledged?.count ?? 0)
    + (stats.byStatus?.in_progress?.count  ?? 0);
  const invoicedValue = (stats.byStatus?.invoiced?.value ?? 0);
  const invoicedCount = (stats.byStatus?.invoiced?.count ?? 0);
  const paidValue     = (stats.byStatus?.paid?.value ?? 0);
  const paidCount     = (stats.byStatus?.paid?.count ?? 0);

  async function handleDelete(id: string) {
    if (!confirm("Delete this purchase order? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res  = await fetch(`/api/purchase-orders/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Delete failed");
      toast.success("Purchase order deleted");
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Purchase Orders
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track and manage client purchase orders end-to-end
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={() => router.push("/purchase-orders/new")}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-1.5 flex-shrink-0"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            New PO
          </Button>
        )}
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Orders"
            value={String(stats.total ?? 0)}
            sub={currency(stats.totalValue ?? 0) + " total value"}
            icon={ShoppingCart}
            iconClass="bg-blue-100 text-blue-600"
            valueClass="text-slate-800"
          />
          <StatCard
            label="Active"
            value={String(activeCount)}
            sub={currency(activeValue) + " in pipeline"}
            icon={TrendingUp}
            iconClass="bg-amber-100 text-amber-600"
            valueClass="text-amber-700"
          />
          <StatCard
            label="Pending Payment"
            value={String(invoicedCount)}
            sub={currency(invoicedValue) + " invoiced"}
            icon={Clock}
            iconClass="bg-violet-100 text-violet-600"
            valueClass="text-violet-700"
          />
          <StatCard
            label="Paid"
            value={String(paidCount)}
            sub={currency(paidValue) + " received"}
            icon={CheckCircle2}
            iconClass="bg-emerald-100 text-emerald-600"
            valueClass="text-emerald-700"
          />
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search PO #, client, title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all capitalize whitespace-nowrap",
                statusFilter === f
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              )}
            >
              {f === "all" ? "All" : STATUS_LABEL[f]}
              {f !== "all" && stats.byStatus?.[f]?.count > 0 && (
                <span className={cn(
                  "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  statusFilter === f ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                )}>
                  {stats.byStatus[f].count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : pos.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No purchase orders found</p>
            <p className="text-xs text-slate-400 mt-1">
              {search || statusFilter !== "all"
                ? "Try adjusting your filters"
                : canWrite
                  ? "Create your first PO to get started"
                  : "No purchase orders have been created yet"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">PO Number</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">PO Date</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Value</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pos.map((po) => {
                const isOverdue = po.dueDate && new Date(po.dueDate) < new Date() && !["paid","cancelled","delivered"].includes(po.status);
                return (
                  <TableRow key={po._id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setViewPO(po)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setViewPO(po)}
                        className="text-sm font-mono font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {po.poNumber}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{po.clientName}</p>
                        {po.clientEmail && (
                          <p className="text-xs text-slate-400 truncate max-w-[140px]">{po.clientEmail}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-700 max-w-[180px] truncate">{po.title}</p>
                      {po.assignedTo && (
                        <p className="text-xs text-slate-400">
                          {po.assignedTo.firstName} {po.assignedTo.lastName}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold capitalize",
                        PRIORITY_COLORS[po.priority]
                      )}>
                        {po.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{formatDate(po.poDate)}</span>
                    </TableCell>
                    <TableCell>
                      {po.dueDate ? (
                        <span className={cn(
                          "text-sm",
                          isOverdue ? "text-red-600 font-semibold" : "text-slate-600"
                        )}>
                          {isOverdue && <AlertCircle className="w-3 h-3 inline mr-1" />}
                          {formatDate(po.dueDate)}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-xs whitespace-nowrap", STATUS_COLORS[po.status])}
                      >
                        {STATUS_LABEL[po.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <IndianRupee className="w-3 h-3 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-800">
                          {(po.totalAmount ?? 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewPO(po)}
                          className="h-7 w-7 p-0 border-slate-200 text-slate-500 hover:text-blue-600"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {canWrite && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/purchase-orders/${po._id}/edit`)}
                            className="h-7 w-7 p-0 border-slate-200 text-slate-500 hover:text-amber-600"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(po._id)}
                            disabled={deleting === po._id}
                            className="h-7 w-7 p-0 border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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

      {/* Detail dialog */}
      {viewPO && (
        <PODetailDialog
          po={viewPO}
          canWrite={canWrite}
          canDelete={canDelete}
          onClose={() => setViewPO(null)}
          onEdit={(po) => { setViewPO(null); router.push(`/purchase-orders/${po._id}/edit`); }}
          onDelete={(id) => { setViewPO(null); handleDelete(id); }}
          onStatusChange={(updated) => { setViewPO(updated); mutate(); }}
        />
      )}
    </div>
  );
}
