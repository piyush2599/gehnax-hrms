"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_COLORS: Record<string, string> = {
  present:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  late:     "bg-amber-50 text-amber-700 border-amber-200",
  absent:   "bg-red-50 text-red-600 border-red-200",
  on_leave: "bg-blue-50 text-blue-700 border-blue-200",
  half_day: "bg-orange-50 text-orange-700 border-orange-200",
};

export default function AttendanceWidget() {
  const [loading, setLoading] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: attendance } = useSWR(`/api/attendance?date=${today}`, fetcher, { refreshInterval: 30000 });
  const record = attendance?.[0];

  const handleAction = async (action: "checkin" | "checkout") => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Action failed");
      else {
        toast.success(action === "checkin" ? "Checked in!" : "Checked out!");
        mutate(`/api/attendance?date=${today}`);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Today&apos;s Attendance</p>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                {record ? (
                  <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[record.status] || ""}`}>
                    {record.status.replace("_", " ")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-slate-50 text-slate-500 border-slate-200">
                    Not marked
                  </Badge>
                )}
                {record?.checkIn && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <LogIn className="w-3 h-3 text-emerald-500" />
                    In: <span className="font-mono font-medium text-slate-700">{record.checkIn}</span>
                  </span>
                )}
                {record?.checkOut && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <LogOut className="w-3 h-3 text-red-500" />
                    Out: <span className="font-mono font-medium text-slate-700">{record.checkOut}</span>
                  </span>
                )}
                {record?.workingHours > 0 && (
                  <span className="text-xs text-slate-400">{record.workingHours}h worked</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {!record?.checkIn && (
              <Button onClick={() => handleAction("checkin")} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 shadow-sm" size="sm">
                <LogIn className="w-4 h-4 mr-1.5" />
                Check In
              </Button>
            )}
            {record?.checkIn && !record?.checkOut && (
              <Button onClick={() => handleAction("checkout")} disabled={loading} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" size="sm">
                <LogOut className="w-4 h-4 mr-1.5" />
                Check Out
              </Button>
            )}
            {record?.checkIn && record?.checkOut && (
              <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold px-2">
                <CheckCircle className="w-4 h-4" />
                Day Complete
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
