import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import { uploadToCloudinary } from "@/lib/cloudinary";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg", "image/jpg", "image/png", "image/webp",
];
const MAX_SIZE = 10 * 1024 * 1024;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as any;
  const roles: string[] = sessionUser.roles || [];
  const myEmployeeId = sessionUser.employeeId?.toString();

  if (!roles.some(r => ["super_admin", "hr_admin"].includes(r)) && myEmployeeId !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const emp = await Employee.findById(params.id).select("documents");
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  // Strip the raw fileUrl — clients should use the /documents/[docId] proxy endpoint instead
  const documents = (emp.documents || []).map((d: any) => {
    const { fileUrl, ...rest } = d.toObject ? d.toObject() : d;
    return rest;
  });

  return NextResponse.json({ documents });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as any;
  const roles: string[] = sessionUser.roles || [];
  const myEmployeeId = sessionUser.employeeId?.toString();

  if (!roles.some(r => ["super_admin", "hr_admin"].includes(r)) && myEmployeeId !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const emp = await Employee.findById(params.id);
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const body = await req.formData();
  const file = body.get("file") as File | null;
  const docName = (body.get("name") as string | null)?.trim();
  const docType = (body.get("type") as string | null)?.trim();

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!docName) return NextResponse.json({ error: "Document name is required" }, { status: 400 });
  if (!docType) return NextResponse.json({ error: "Document type is required" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF and image files are allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadToCloudinary(buffer, file.name, `hrms/employee-docs/${params.id}`, file.type);

    emp.documents.push({ name: docName, type: docType, fileUrl: url, uploadedAt: new Date() });
    await emp.save();

    const doc = emp.documents[emp.documents.length - 1];
    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (err: any) {
    console.error("Document upload failed:", err);
    return NextResponse.json({ error: "Upload failed: " + (err.message ?? "unknown") }, { status: 500 });
  }
}
