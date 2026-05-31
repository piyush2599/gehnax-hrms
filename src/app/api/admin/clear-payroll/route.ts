import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Payroll from "@/models/Payroll";

const SECRET = process.env.MIGRATION_SECRET;

export async function POST(req: NextRequest) {
  if (!SECRET) return NextResponse.json({ error: "Disabled" }, { status: 403 });
  if (req.headers.get("x-migration-secret") !== SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const result = await Payroll.deleteMany({});
  return NextResponse.json({ ok: true, deleted: result.deletedCount });
}
