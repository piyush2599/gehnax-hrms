import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

const VALID_ROLES = ["super_admin", "finance_admin", "hr_admin", "manager", "employee"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionRoles: string[] = (session.user as any).roles || [];
  if (!sessionRoles.includes("super_admin")) {
    return NextResponse.json({ error: "Only Super Admin can change roles" }, { status: 403 });
  }

  if ((session.user as any).id === params.id) {
    return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
  }

  const { roles, password } = await req.json();

  if (!password) {
    return NextResponse.json({ error: "Password is required to change roles" }, { status: 400 });
  }

  if (!Array.isArray(roles) || roles.length === 0) {
    return NextResponse.json({ error: "At least one role is required" }, { status: 400 });
  }

  if (roles.some((r: string) => !VALID_ROLES.includes(r))) {
    return NextResponse.json({ error: "Invalid role(s) provided" }, { status: 400 });
  }

  await connectDB();

  // Verify super admin's password
  const admin = await User.findById((session.user as any).id).select("+password");
  if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 });

  const passwordMatch = await bcrypt.compare(password, admin.password);
  if (!passwordMatch) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const user = await User.findByIdAndUpdate(
    params.id,
    { roles },
    { new: true }
  ).select("-password -avatarData");

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ user });
}
