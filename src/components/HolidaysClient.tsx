"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, isBefore, startOfDay } from "date-fns";
import { CalendarDays, Plus, Trash2, PartyPopper } from "lucide-react";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TYPE_COLORS: Record<string, string> = {
  national: "bg-blue-50 text-blue-700 border-blue-200",
  regional: "bg-violet-50 text-violet-700 border-violet-200",
  optional: "bg-amber-50 text-amber-700 border-amber-200",
  company:  "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const TYPE_LABELS: Record<string, string> = {
  national: "National Holiday",
  regional: "Regional Holiday",
  optional: "Optional Holiday",
  company:  "Company Event",
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function HolidaysClient() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "employee";
  const canManage = ["super_admin", "hr_admin"].includes(role);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [addOpen, setAddOpen] = useState(false);

  const { data: holidays, isLoading } = useSWR(`/api/holidays?year=${year}`, fetcher);
  const list: any[] = Array.isArray(holidays) ? holidays : [];

  const upcoming = list.filter((h) => !isBefore(new Date(h.date), startOfDay(today)));
  const past = list.filter((h) => isBefore(new Date(h.date), startOfDay(today)));

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`/api/holidays/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Holiday deleted");
      mutate(`/api/holidays?year=${year}`);
    } else {
      toast.error("Failed to delete");
    }
  };

  const grouped = groupByMonth(list);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v ?? String(today.getFullYear())))}>
            <SelectTrigger className="w-28 bg-white border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-slate-500">{list.length} holidays</p>
        </div>
        {canManage && (
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Holiday
          </Button>
        )}
      </div>

      {/* Add Holiday Dialog */}
      {canManage && (
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Holiday</DialogTitle>
            </DialogHeader>
            <AddHolidayForm
              onSuccess={() => {
                setAddOpen(false);
                mutate(`/api/holidays?year=${year}`);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Summary badges */}
      {!isLoading && list.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(
            list.reduce((acc: Record<string, number>, h) => {
              acc[h.type] = (acc[h.type] || 0) + 1;
              return acc;
            }, {})
          ).map(([type, count]) => (
            <Badge key={type} variant="outline" className={`text-xs ${TYPE_COLORS[type]}`}>
              {TYPE_LABELS[type]}: {count}
            </Badge>
          ))}
        </div>
      )}

      {/* Upcoming holidays highlight */}
      {upcoming.length > 0 && (
        <Card className="border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <PartyPopper className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-semibold text-blue-800">Upcoming Holidays</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {upcoming.slice(0, 6).map((h) => (
                <div key={h._id} className="flex items-center gap-2.5 bg-white/70 rounded-xl px-3 py-2.5 border border-blue-100">
                  <div className="flex-shrink-0 text-center min-w-[36px]">
                    <p className="text-xs font-bold text-blue-600">{format(new Date(h.date), "MMM")}</p>
                    <p className="text-lg font-black text-blue-700 leading-none">{format(new Date(h.date), "d")}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{h.name}</p>
                    <p className="text-xs text-slate-400">{format(new Date(h.date), "EEEE")}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* By month list */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : list.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No holidays for {year}</p>
            {canManage && (
              <Button onClick={() => setAddOpen(true)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                Add First Holiday
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {MONTHS.map((monthName, idx) => {
            const monthHolidays = grouped[idx + 1] || [];
            if (!monthHolidays.length) return null;
            return (
              <div key={monthName}>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">{monthName}</p>
                <div className="space-y-2">
                  {monthHolidays.map((h: any) => {
                    const isPast = isBefore(new Date(h.date), startOfDay(today));
                    return (
                      <Card
                        key={h._id}
                        className={`border-slate-200 shadow-sm transition-all ${isPast ? "opacity-60" : ""}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Date block */}
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border border-blue-100">
                              <p className="text-xs font-bold text-blue-600">{format(new Date(h.date), "MMM")}</p>
                              <p className="text-lg font-black text-blue-700 leading-none">{format(new Date(h.date), "d")}</p>
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-slate-800">{h.name}</p>
                                <Badge variant="outline" className={`text-xs ${TYPE_COLORS[h.type]}`}>
                                  {TYPE_LABELS[h.type]}
                                </Badge>
                                {isPast && (
                                  <Badge variant="outline" className="text-xs bg-slate-50 text-slate-400 border-slate-200">
                                    Past
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">{format(new Date(h.date), "EEEE, MMMM d, yyyy")}</p>
                              {h.description && <p className="text-xs text-slate-500 mt-1">{h.description}</p>}
                            </div>

                            {/* Delete (admin only) */}
                            {canManage && (
                              <button
                                onClick={() => handleDelete(h._id, h.name)}
                                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                                title="Delete holiday"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function groupByMonth(holidays: any[]): Record<number, any[]> {
  return holidays.reduce((acc, h) => {
    const m = new Date(h.date).getMonth() + 1;
    if (!acc[m]) acc[m] = [];
    acc[m].push(h);
    return acc;
  }, {} as Record<number, any[]>);
}

function AddHolidayForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", date: "", type: "national", description: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.date) {
      toast.error("Name and date are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed to add holiday");
      else { toast.success("Holiday added!"); onSuccess(); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label>Holiday Name *</Label>
        <Input
          placeholder="e.g. Republic Day"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>Date *</Label>
        <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <NativeSelect value={form.type} onChange={(e) => set("type", e.target.value)}>
          <option value="national">National Holiday</option>
          <option value="regional">Regional Holiday</option>
          <option value="optional">Optional Holiday</option>
          <option value="company">Company Event</option>
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Input
          placeholder="Optional description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>
      <Button type="submit" loading={loading} className="w-full">
        {loading ? "Adding…" : "Add Holiday"}
      </Button>
    </form>
  );
}
