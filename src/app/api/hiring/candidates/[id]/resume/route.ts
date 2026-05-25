import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Candidate from "@/models/Candidate";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => ["super_admin", "hr_admin"].includes(r))) {
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
    const { url } = await uploadToCloudinary(buffer, file.name, "hrms/resumes", file.type);

    const candidate = await Candidate.findByIdAndUpdate(
      params.id,
      { resumeUrl: url },
      { new: true }
    ).populate("jobPosting", "title");

    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    return NextResponse.json({ resumeUrl: url, candidate });
  } catch (err: any) {
    console.error("Resume upload error:", err);
    return NextResponse.json({ error: "Upload failed: " + (err.message ?? "unknown error") }, { status: 500 });
  }
}
