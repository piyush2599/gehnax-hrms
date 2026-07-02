import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Payroll from "@/models/Payroll";
import Employee from "@/models/Employee";

function canManage(session: any): boolean {
  const roles: string[] = session?.user?.roles || [];
  return roles.some((r) => ["super_admin", "finance_admin"].includes(r));
}

function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) => r.map((c) => {
      const s = String(c ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","))
    .join("\r\n");
}

/**
 * GET /api/reports/statutory?year=&month=&type=pf|esi|tds|summary&format=csv|json
 * Aggregates the period's payrolls into a statutory register.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || "");
  const month = parseInt(searchParams.get("month") || "");
  const type = (searchParams.get("type") || "summary").toLowerCase();
  const format = (searchParams.get("format") || "csv").toLowerCase();
  if (!year || !month) return NextResponse.json({ error: "year and month required" }, { status: 400 });

  const payPeriod = `${year}-${String(month).padStart(2, "0")}`;
  const payrolls = await Payroll.find({ payPeriod })
    .populate("employeeId", "firstName lastName employeeCode statutory")
    .lean() as any[];

  const rowsFor = (): { header: string[]; body: (string | number)[][] } => {
    if (type === "pf") {
      const header = ["Employee Code", "Name", "UAN", "PF Wages (Basic)", "Employee PF", "Employer PF"];
      const body = payrolls.map((p) => {
        const e = p.employeeId || {};
        return [
          e.employeeCode || "", `${e.firstName || ""} ${e.lastName || ""}`.trim(),
          e.statutory?.uan || "", p.earnings?.basic || 0,
          p.deductions?.pf || 0, p.deductions?.pf || 0, // employer mirrors employee
        ];
      });
      return { header, body };
    }
    if (type === "esi") {
      const header = ["Employee Code", "Name", "ESIC IP No", "ESI Wages (Gross)", "Employee ESI (0.75%)", "Employer ESI (3.25%)"];
      const body = payrolls
        .filter((p) => (p.deductions?.esi || 0) > 0)
        .map((p) => {
          const e = p.employeeId || {};
          const esi = p.deductions?.esi || 0;
          const gross = p.grossPay || 0;
          return [
            e.employeeCode || "", `${e.firstName || ""} ${e.lastName || ""}`.trim(),
            e.statutory?.esicNumber || "", gross, esi, Math.round(gross * 0.0325),
          ];
        });
      return { header, body };
    }
    if (type === "tds") {
      const header = ["Employee Code", "Name", "PAN", "Gross Pay", "TDS Deducted"];
      const body = payrolls.map((p) => {
        const e = p.employeeId || {};
        return [
          e.employeeCode || "", `${e.firstName || ""} ${e.lastName || ""}`.trim(),
          e.statutory?.pan || "", p.grossPay || 0, p.deductions?.tax || 0,
        ];
      });
      return { header, body };
    }
    // summary
    const header = ["Employee Code", "Name", "Gross", "PF", "ESI", "TDS", "Other", "Total Deductions", "Net Pay", "Status"];
    const body = payrolls.map((p) => {
      const e = p.employeeId || {};
      return [
        e.employeeCode || "", `${e.firstName || ""} ${e.lastName || ""}`.trim(),
        p.grossPay || 0, p.deductions?.pf || 0, p.deductions?.esi || 0,
        p.deductions?.tax || 0, p.deductions?.other || 0,
        p.totalDeductions || 0, p.netPay || 0, p.status || "",
      ];
    });
    return { header, body };
  };

  const { header, body } = rowsFor();

  if (format === "json") {
    return NextResponse.json({ payPeriod, type, count: body.length, header, rows: body });
  }

  const csv = toCsv([header, ...body]);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="statutory-${type}-${payPeriod}.csv"`,
    },
  });
}
