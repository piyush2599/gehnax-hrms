import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import SalaryAdvance from "@/models/SalaryAdvance";

function canManage(session: any): boolean {
  const roles: string[] = session?.user?.roles || [];
  return roles.some((r) => ["super_admin", "finance_admin"].includes(r));
}

// GET — list advances (optionally by employee / status)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const query: any = {};
  if (searchParams.get("employeeId")) query.employeeId = searchParams.get("employeeId");
  if (searchParams.get("status")) query.status = searchParams.get("status");

  const advances = await SalaryAdvance.find(query)
    .populate("employeeId", "firstName lastName employeeCode")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json({ advances });
}

// POST — create an advance/loan
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session)) {
    return NextResponse.json({ error: "Forbidden — Admin/Finance only" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const { employeeId, principal, emiAmount, startPeriod, reason } = body;

  if (!employeeId || !principal || !emiAmount || !startPeriod) {
    return NextResponse.json(
      { error: "employeeId, principal, emiAmount and startPeriod are required" },
      { status: 400 },
    );
  }
  if (Number(emiAmount) > Number(principal)) {
    return NextResponse.json({ error: "EMI cannot exceed the principal" }, { status: 400 });
  }

  const advance = await SalaryAdvance.create({
    employeeId,
    principal: Number(principal),
    emiAmount: Number(emiAmount),
    balance: Number(principal),
    startPeriod,
    reason,
    status: "active",
    createdBy: (session.user as any).id,
  });

  return NextResponse.json({ advance }, { status: 201 });
}
