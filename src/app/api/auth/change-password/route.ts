import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { checkPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { newPassword, confirmPassword, currentPassword } = await req.json();

  const pwError = checkPassword(newPassword ?? "");
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById((session.user as any).id).select("+password");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // If caller supplies current password (voluntary change from profile), verify it
  if (currentPassword !== undefined) {
    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
  }

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
