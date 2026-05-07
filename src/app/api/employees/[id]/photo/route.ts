import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  await connectDB();

  const employee = await Employee.findById(params.id).select("avatarData");

  if (!employee?.avatarData) {
    return new NextResponse("No photo", { status: 404 });
  }

  const dataUrl = employee.avatarData;
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) return new NextResponse("Invalid photo data", { status: 500 });

  const mimeType = dataUrl.slice(5, commaIdx).split(";")[0] || "image/jpeg";
  const base64 = dataUrl.slice(commaIdx + 1);
  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
