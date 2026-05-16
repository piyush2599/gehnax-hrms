import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { newPassword, confirmPassword } = await req.json();

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById((session.user as any).id).select("+password");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Prevent reusing the same password
  const isSame = await bcrypt.compare(newPassword, user.password);
  if (isSame) {
    return NextResponse.json({ error: "New password must be different from the current password" }, { status: 400 });
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.mustChangePassword = false;
  await user.save();

  return NextResponse.json({ success: true });
}
