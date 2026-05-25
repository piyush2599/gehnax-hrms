import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Department from "@/models/Department";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => ["super_admin", "hr_admin"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();

  const allowed: any = {};
  if (body.name !== undefined)        allowed.name        = body.name;
  if (body.description !== undefined) allowed.description = body.description;
  if (body.managerId !== undefined)   allowed.managerId   = body.managerId || null;
  if (body.isActive !== undefined)    allowed.isActive    = body.isActive;

  const dept = await Department.findByIdAndUpdate(params.id, allowed, { new: true })
    .populate("managerId", "firstName lastName");

  if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dept);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.includes("super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const dept = await Department.findByIdAndUpdate(
    params.id,
    { isActive: false },
    { new: true }
  );
  if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
