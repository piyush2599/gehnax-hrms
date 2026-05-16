import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }
  if ((session.user as any).id === params.id) {
    return NextResponse.json({ error: "Cannot reset your own password here" }, { status: 400 });
  }

  const { newPassword, adminPassword } = await req.json();

  if (!adminPassword) return NextResponse.json({ error: "Your password is required to confirm" }, { status: 400 });
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
  }

  await connectDB();

  const admin = await User.findById((session.user as any).id).select("+password");
  if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  const valid = await bcrypt.compare(adminPassword, admin.password);
  if (!valid) return NextResponse.json({ error: "Incorrect admin password" }, { status: 401 });

  const hashed = await bcrypt.hash(newPassword, 12);
  const user = await User.findByIdAndUpdate(params.id, { password: hashed, mustChangePassword: true }, { new: true }).select("name email");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ success: true, userName: user.name });
}
