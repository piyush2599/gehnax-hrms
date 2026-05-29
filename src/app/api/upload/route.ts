import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const FILE_SERVER_URL = process.env.FILE_SERVER_URL!;
const FILE_SERVER_API_KEY = process.env.FILE_SERVER_API_KEY!;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const folder = (formData.get("folder") as string) || "general";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const allowedTypes = [
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  try {
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("folder", `hrms/${folder}`);

    const response = await fetch(`${FILE_SERVER_URL}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FILE_SERVER_API_KEY}`,
      },
      body: uploadFormData,
    });

    if (!response.ok) {
      throw new Error("File server upload failed");
    }

    const result = await response.json();
    return NextResponse.json({ url: result.url, name: file.name, size: file.size });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
