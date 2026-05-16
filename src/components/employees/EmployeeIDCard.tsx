"use client";

import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials, formatDate } from "@/lib/utils";
import { Download, IdCard } from "lucide-react";

interface Props {
  emp: {
    firstName: string;
    lastName: string;
    employeeCode: string;
    designation: string;
    department?: { name: string } | string;
    email: string;
    phone?: string;
    joiningDate: string;
    avatar?: string;
    employmentType?: string;
  };
}

function deptName(d: any) {
  if (!d) return "—";
  return typeof d === "string" ? d : d.name;
}

function barcodeStripes(code: string) {
  // Deterministic stripe widths from employee code chars
  const chars = (code + "GEHNAX").split("");
  return chars.map((c, i) => ({
    width: (c.charCodeAt(0) % 3) + 1,
    gap: i % 4 === 0 ? 3 : 1,
  }));
}

export default function EmployeeIDCard({ emp }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const fullName = `${emp.firstName} ${emp.lastName}`;
  const stripes = barcodeStripes(emp.employeeCode);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `${emp.employeeCode}-ID-Card.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Card */}
      <div
        ref={cardRef}
        className="w-80 rounded-2xl overflow-hidden shadow-2xl select-none"
        style={{ background: "#fff" }}
      >
        {/* Header */}
        <div
          className="relative px-5 pt-5 pb-14 flex flex-col items-center gap-1"
          style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)" }}
        >
          {/* Company name */}
          <div className="w-full flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                <IdCard className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-xs leading-tight tracking-wide">GEHNAX</p>
                <p className="text-blue-200 text-[9px] leading-tight tracking-widest uppercase">Technologies LLP</p>
              </div>
            </div>
            <p className="text-blue-200 text-[9px] tracking-widest uppercase font-medium">Employee ID</p>
          </div>

          {/* Avatar */}
          <div className="relative mt-2">
            <Avatar key={emp.avatar || "no-photo"} className="w-24 h-24 ring-4 ring-white shadow-xl">
              <AvatarImage src={emp.avatar} />
              <AvatarFallback className="bg-blue-700 text-white text-3xl font-bold">
                {getInitials(fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pt-0 pb-4 -mt-10">
          {/* Name block */}
          <div className="flex flex-col items-center text-center mb-5">
            <h2 className="text-lg font-extrabold text-slate-900 leading-tight">{fullName}</h2>
            <p className="text-blue-600 font-semibold text-sm mt-0.5">{emp.designation}</p>
            <p className="text-slate-400 text-xs mt-0.5">{deptName(emp.department)}</p>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-slate-200 mb-4" />

          {/* Info rows */}
          <div className="space-y-2.5">
            <InfoRow label="Employee ID" value={emp.employeeCode} mono />
            <InfoRow label="Email" value={emp.email} />
            {emp.phone && <InfoRow label="Phone" value={emp.phone} />}
            <InfoRow label="Joined" value={formatDate(emp.joiningDate)} />
            <InfoRow
              label="Type"
              value={emp.employmentType?.replace("_", " ") ?? "Full Time"}
              capitalize
            />
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-slate-200 mt-4 mb-3" />

          {/* Barcode */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-end gap-0" style={{ height: 36 }}>
              {stripes.map((s, i) => (
                <div
                  key={i}
                  style={{
                    width: s.width,
                    marginRight: s.gap,
                    height: i % 5 === 0 ? 36 : i % 3 === 0 ? 30 : 36,
                    background: "#1e293b",
                    borderRadius: 1,
                  }}
                />
              ))}
            </div>
            <p className="text-[10px] text-slate-400 tracking-[0.25em] font-mono">{emp.employeeCode}</p>
          </div>
        </div>

        {/* Footer strip */}
        <div className="h-2 w-full" style={{ background: "linear-gradient(90deg, #1e3a8a, #2563eb, #3b82f6)" }} />
      </div>

      {/* Download button */}
      <Button
        onClick={handleDownload}
        loading={downloading}
        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2"
        size="sm"
      >
        <Download className="w-4 h-4" />
        {downloading ? "Generating…" : "Download ID Card"}
      </Button>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  capitalize,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide shrink-0">{label}</span>
      <span
        className={`text-xs text-slate-800 font-semibold text-right truncate ${mono ? "font-mono" : ""} ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
