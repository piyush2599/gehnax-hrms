import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import HiringDocument from "@/models/HiringDocument";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => ["super_admin", "hr_admin"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const formData = await req.formData();
  const file        = formData.get("file") as File | null;
  const candidateId = formData.get("candidateId") as string | null;
  const docType     = formData.get("docType") as string | null;

  if (!file)        return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!candidateId) return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
  if (!docType)     return NextResponse.json({ error: "docType is required" }, { status: 400 });

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url, publicId } = await uploadToCloudinary(
      buffer, file.name, `hrms/hiring/${candidateId}`, file.type
    );

    const document = await HiringDocument.create({
      candidate:    candidateId,
      docType,
      originalName: file.name,
      fileUrl:      url,
      fileSize:     file.size,
      mimeType:     file.type,
      uploadedBy:   session.user.email ?? "hr",
    });

    return NextResponse.json({ url, publicId, document }, { status: 201 });
  } catch (err: any) {
    console.error("Cloudinary upload error:", err);
    return NextResponse.json({ error: "Upload failed: " + (err.message ?? "unknown error") }, { status: 500 });
  }
}
