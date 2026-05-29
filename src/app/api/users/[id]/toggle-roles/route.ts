import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionRoles: string[] = (session.user as any).roles || [];
  if (!sessionRoles.includes("super_admin")) {
    return NextResponse.json({ error: "Only Super Admin can toggle role access" }, { status: 403 });
  }

  if ((session.user as any).id === params.id) {
    return NextResponse.json({ error: "You cannot restrict your own role access" }, { status: 400 });
  }

  await connectDB();

  const user = await User.findById(params.id).lean();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // treat undefined (existing docs without field) as true (active)
  const currentlyActive = (user as any).rolesActive !== false;
  const nextValue = !currentlyActive;

  await User.findByIdAndUpdate(params.id, { $set: { rolesActive: nextValue } }, { strict: false });

  return NextResponse.json({ rolesActive: nextValue });
}
