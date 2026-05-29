import { NextRequest, NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { extractTextFromBuffer, parseResumeText } from "@/lib/resume-parser";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/x-pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
];

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("resume") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: "Only PDF, DOCX, or TXT files are accepted" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse text first (always works locally)
    const text = await extractTextFromBuffer(buffer, mimeType);
    const parsed = parseResumeText(text);

    // Try Cloudinary upload; if not configured or unavailable, skip gracefully
    let fileUrl = "";
    let fileName = file.name;
    try {
      const result = await uploadToCloudinary(buffer, file.name, "hrms/resumes", mimeType);
      fileUrl  = result.url;
    } catch (uploadErr: any) {
      console.warn("Cloudinary upload skipped:", uploadErr.message);
    }

    return NextResponse.json({ fileUrl, fileName, parsed });
  } catch (err: any) {
    console.error("Resume parse error:", err);
    return NextResponse.json({ error: "Failed to process resume: " + (err.message ?? "unknown") }, { status: 500 });
  }
}
