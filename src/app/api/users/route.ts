import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => ["super_admin", "hr_admin"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const filterRole = searchParams.get("role") || "";

  const query: any = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  // MongoDB array field: { roles: "super_admin" } matches docs where the array contains the value
  if (filterRole) query.roles = filterRole;

  const users = await User.find(query)
    .select("-password -avatarData -mfaSecret")
    .populate("employeeId", "firstName lastName employeeCode department")
    .sort({ createdAt: -1 })
    .lean();

  const counts = await User.aggregate([
    { $unwind: "$roles" },
    { $group: { _id: "$roles", count: { $sum: 1 } } },
  ]);

  const roleCounts: Record<string, number> = {
    super_admin: 0, finance_admin: 0, hr_admin: 0, manager: 0, employee: 0,
  };
  counts.forEach(({ _id, count }) => { roleCounts[_id] = count; });

  return NextResponse.json({ users, roleCounts });
}
