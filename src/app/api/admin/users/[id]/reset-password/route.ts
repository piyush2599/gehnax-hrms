import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionRoles: string[] = (session.user as any).roles || [];
  if (!sessionRoles.includes("super_admin")) {
    return NextResponse.json({ error: "Only Super Admin can reset passwords" }, { status: 403 });
  }

  const { newPassword, adminPassword } = await req.json();

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
  }
  if (!adminPassword) {
    return NextResponse.json({ error: "Admin password is required" }, { status: 400 });
  }

  await connectDB();

  // Verify super admin's own password
  const admin = await User.findById((session.user as any).id).select("+password");
  if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 });

  const passwordMatch = await bcrypt.compare(adminPassword, admin.password);
  if (!passwordMatch) {
    return NextResponse.json({ error: "Incorrect admin password" }, { status: 401 });
  }

  const target = await User.findById(params.id);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const hashed = await bcrypt.hash(newPassword, 12);
  await User.findByIdAndUpdate(params.id, {
    password: hashed,
    mustChangePassword: true,
  });

  return NextResponse.json({ message: "Password reset successfully" });
}
