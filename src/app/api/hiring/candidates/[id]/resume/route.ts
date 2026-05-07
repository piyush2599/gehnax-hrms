import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Candidate from "@/models/Candidate";
import { uploadToFTP } from "@/lib/ftp-upload";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["super_admin", "hr_admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const formData = await req.formData();
  const file = formData.get("resume") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });

  const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i))
    return NextResponse.json({ error: "Only PDF or Word documents are allowed" }, { status: 400 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadToFTP(buffer, file.name, "resumes");

    const candidate = await Candidate.findByIdAndUpdate(
      params.id,
      { resumeUrl: url },
      { new: true }
    ).populate("jobPosting", "title");

    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    return NextResponse.json({ resumeUrl: url, candidate });
  } catch (err: any) {
    console.error("Resume FTP upload error:", err);
    return NextResponse.json({ error: "Upload failed: " + (err.message ?? "unknown error") }, { status: 500 });
  }
}
