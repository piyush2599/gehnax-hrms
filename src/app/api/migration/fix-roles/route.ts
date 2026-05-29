import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";

const SECRET = process.env.MIGRATION_SECRET;

export async function POST(req: NextRequest) {
  if (!SECRET) return NextResponse.json({ error: "Disabled" }, { status: 403 });

  const authHeader = req.headers.get("x-migration-secret");
  if (authHeader !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, roles } = await req.json();
  if (!email || !Array.isArray(roles)) {
    return NextResponse.json({ error: "email and roles required" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { $set: { roles } },
    { new: true }
  ).select("email roles");

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ ok: true, email: user.email, roles: user.roles });
}
