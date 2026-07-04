import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import SalaryAdvance from "@/models/SalaryAdvance";

function canManage(session: any): boolean {
  const roles: string[] = session?.user?.roles || [];
  return roles.some((r) => ["super_admin", "finance_admin"].includes(r));
}

// PATCH — close / cancel / adjust an advance
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const advance = await SalaryAdvance.findById(params.id);
  if (!advance) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  if (body.status && ["active", "closed", "cancelled"].includes(body.status)) {
    advance.status = body.status;
  }
  if (body.emiAmount != null) advance.emiAmount = Math.max(0, Number(body.emiAmount));
  await advance.save();
  return NextResponse.json({ advance });
}

// DELETE — remove an advance with no installments recovered yet
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const advance = await SalaryAdvance.findById(params.id);
  if (!advance) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (advance.installments.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete — recovery has already started. Cancel it instead." },
      { status: 409 },
    );
  }
  await advance.deleteOne();
  return NextResponse.json({ ok: true });
}
