import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["super_admin", "hr_admin"].includes(role)) {
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
  if (filterRole) query.role = filterRole;

  const users = await User.find(query)
    .select("-password -avatarData -mfaSecret")
    .populate("employeeId", "firstName lastName employeeCode department")
    .sort({ createdAt: -1 })
    .lean();

  const counts = await User.aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);

  const roleCounts: Record<string, number> = {
    super_admin: 0, finance_admin: 0, hr_admin: 0, manager: 0, employee: 0,
  };
  counts.forEach(({ _id, count }) => { roleCounts[_id] = count; });

  return NextResponse.json({ users, roleCounts });
}
