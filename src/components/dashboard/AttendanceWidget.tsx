"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { captureGPS, type GpsCoords } from "@/lib/gps";
import GpsPermissionModal from "@/components/attendance/GpsPermissionModal";

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
  const [status, setStatus] = useState("");
  const [pendingAction, setPendingAction] = useState<"checkin" | "checkout" | null>(null);
  const [gpsModal, setGpsModal] = useState<"permission" | "mock" | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: attendance } = useSWR(`/api/attendance?date=${today}`, fetcher, { refreshInterval: 30000 });
  const { data: selfEmployee } = useSWR("/api/employees/me", fetcher, { revalidateOnFocus: false });
  const gpsRequired: boolean = selfEmployee?.gpsRequired === true;
  const record = attendance?.[0];

  const submitAction = async (action: "checkin" | "checkout", gpsCoords?: GpsCoords) => {
    setStatus("Submitting…");
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(gpsCoords ? { location: gpsCoords } : {}) }),
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
      setStatus("");
      setPendingAction(null);
    }
  };

  const handleAction = async (action: "checkin" | "checkout") => {
    setLoading(true);
    setPendingAction(action);

    // Skip GPS entirely if not required for this employee
    if (!gpsRequired) {
      await submitAction(action, undefined);
      return;
    }

    setStatus("Getting location…");
    try {
      const result = await captureGPS();

      if ("error" in result) {
        setLoading(false);
        setStatus("");
        if (result.code === "permission_denied") {
          setGpsModal("permission");
          return;
        }
        if (result.code === "mock_detected") {
          setGpsModal("mock");
          return;
        }
        toast.warning(result.error, { duration: 5000 });
        await submitAction(action, undefined);
        return;
      }

      await submitAction(action, result.coords);
    } catch {
      setLoading(false);
      setStatus("");
      setPendingAction(null);
    }
  };

  return (
    <>
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

          <div className="flex flex-col items-end gap-1">
            {loading && status && (
              <span className="flex items-center gap-1 text-xs text-blue-200">
                <Loader2 className="w-3 h-3 animate-spin" />
                {status}
              </span>
            )}
            <div className="flex gap-2">
              {!record?.checkIn && (
                <Button
                  onClick={() => handleAction("checkin")}
                  disabled={loading}
                  className="bg-white text-emerald-700 hover:bg-blue-50 font-bold shadow-sm"
                  size="sm"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                  Check In
                </Button>
              )}
              {record?.checkIn && !record?.checkOut && (
                <Button
                  onClick={() => handleAction("checkout")}
                  disabled={loading}
                  className="bg-white/15 text-white border border-white/30 hover:bg-white/25 font-semibold"
                  size="sm"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
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
        </div>
      </CardContent>
    </Card>

    {gpsModal && pendingAction && (
      <GpsPermissionModal
        isMockBlocked={gpsModal === "mock"}
        onGranted={(coords) => {
          setGpsModal(null);
          setLoading(true);
          submitAction(pendingAction, coords);
        }}
        onCancel={() => {
          setGpsModal(null);
          setPendingAction(null);
        }}
      />
    )}
    </>
  );
}
