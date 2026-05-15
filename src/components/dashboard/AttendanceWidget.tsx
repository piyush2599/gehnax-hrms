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
    <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
      <CardContent className="px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/15 backdrop-blur-sm rounded-xl flex-shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Today&apos;s Attendance</p>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                {record ? (
                  <Badge className={`text-xs capitalize border font-semibold ${STATUS_COLORS[record.status] || ""}`} variant="outline">
                    {record.status.replace("_", " ")}
                  </Badge>
                ) : (
                  <Badge className="text-xs bg-white/15 text-white border-white/20 font-medium" variant="outline">
                    Not marked yet
                  </Badge>
                )}
                {record?.checkIn && (
                  <span className="text-xs text-blue-100 flex items-center gap-1">
                    <LogIn className="w-3 h-3 text-emerald-300" />
                    In: <span className="font-mono font-semibold text-white">{record.checkIn}</span>
                  </span>
                )}
                {record?.checkOut && (
                  <span className="text-xs text-blue-100 flex items-center gap-1">
                    <LogOut className="w-3 h-3 text-red-300" />
                    Out: <span className="font-mono font-semibold text-white">{record.checkOut}</span>
                  </span>
                )}
                {record?.workingHours > 0 && (
                  <span className="text-xs text-blue-200">{record.workingHours}h worked</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {!record?.checkIn && (
              <Button
                onClick={() => handleAction("checkin")}
                loading={loading}
                className="bg-white text-emerald-700 hover:bg-blue-50 font-bold shadow-sm"
                size="sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                Check In
              </Button>
            )}
            {record?.checkIn && !record?.checkOut && (
              <Button
                onClick={() => handleAction("checkout")}
                loading={loading}
                className="bg-white/15 text-white border border-white/30 hover:bg-white/25 font-semibold"
                size="sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                Check Out
              </Button>
            )}
            {record?.checkIn && record?.checkOut && (
              <div className="flex items-center gap-1.5 text-white text-sm font-semibold bg-white/15 px-3 py-1.5 rounded-xl">
                <CheckCircle className="w-4 h-4 text-emerald-300" />
                Day Complete
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
