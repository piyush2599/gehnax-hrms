import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

// POST /api/admin/migrate
// Migrates all users from single role: string -> roles: [string] array.
// Idempotent — safe to run multiple times.
// Requires super_admin session.
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.includes("super_admin")) {
    return NextResponse.json({ error: "Forbidden — super_admin only" }, { status: 403 });
  }

  await connectDB();

  // Update users who have a legacy `role` field but no `roles` array (or empty array)
  const result = await (User as any).collection.updateMany(
    { $or: [{ roles: { $exists: false } }, { roles: { $size: 0 } }] },
    [{ $set: { roles: ["$role"] } }]
  );

  return NextResponse.json({
    message: "Migration complete",
    matched: result.matchedCount,
    modified: result.modifiedCount,
  });
}
