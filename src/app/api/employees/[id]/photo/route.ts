import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import User from "@/models/User";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  const myEmployeeId = (session.user as any).employeeId?.toString();
  const isHR = roles.some(r => ["super_admin", "hr_admin"].includes(r));
  const isOwner = myEmployeeId === params.id;

  if (!isHR && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const emp = await Employee.findById(params.id);
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const body = await req.formData();
  const file = body.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG or WebP images are allowed" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url } = await uploadToCloudinary(buffer, `${params.id}.jpg`, "hrms/employee-photos", file.type);

  emp.avatar = url;
  emp.avatarData = undefined;
  await emp.save();
  await User.findByIdAndUpdate(emp.userId, { avatar: url });

  return NextResponse.json({ avatar: url });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  await connectDB();

  const employee = await Employee.findById(params.id).select("avatar avatarData");
  if (!employee) return new NextResponse("Not found", { status: 404 });

  // Cloudinary or any external URL — redirect directly
  if (employee.avatar?.startsWith("http")) {
    return NextResponse.redirect(employee.avatar);
  }

  // Legacy base64 fallback for existing records
  if (!employee.avatarData) return new NextResponse("No photo", { status: 404 });

  const dataUrl = employee.avatarData;
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) return new NextResponse("Invalid photo data", { status: 500 });

  const mimeType = dataUrl.slice(5, commaIdx).split(";")[0] || "image/jpeg";
  const base64 = dataUrl.slice(commaIdx + 1);
  const imgBuffer = Buffer.from(base64, "base64");

  return new NextResponse(imgBuffer, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
