import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import OnboardingInvite from "@/models/OnboardingInvite";
import { uploadToDrive } from "@/lib/gdrive";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const EXT_MAP: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
};

function safeFolderName(invite: any): string {
  const code = invite.employeeCode ?? "unknown";
  const first = (invite.firstName ?? "").replace(/[^a-zA-Z0-9]/g, "");
  const last = (invite.lastName ?? "").replace(/[^a-zA-Z0-9]/g, "");
  return first || last ? `${code}_${first}_${last}` : code;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  await connectDB();

  const invite = await OnboardingInvite.findOne({ token: params.token });
  if (!invite) {
    return NextResponse.json({ error: "Invalid onboarding link" }, { status: 404 });
  }
  if (!["pending", "in_progress"].includes(invite.status)) {
    return NextResponse.json({ error: "Documents can no longer be uploaded for this invite" }, { status: 410 });
  }

  const body = await req.formData();
  const file = body.get("file") as File | null;
  const docType = body.get("docType") as string | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!docType || !["pan_card", "aadhaar_card"].includes(docType)) {
    return NextResponse.json({ error: "docType must be pan_card or aadhaar_card" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF, PNG or JPG files are allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = EXT_MAP[file.type] ?? "bin";
  const fileName = `${docType}.${ext}`;
  const subFolder = `onboarding/${safeFolderName(invite)}`;

  try {
    const { url } = await uploadToDrive(buffer, fileName, file.type, subFolder);

    if (!invite.documents) invite.documents = {};
    if (docType === "pan_card") invite.documents.panCard = url;
    else invite.documents.aadhaarCard = url;
    invite.markModified("documents");
    await invite.save();

    return NextResponse.json({ url, docType });
  } catch (err: any) {
    console.error("Onboarding doc upload failed:", err);
    return NextResponse.json({ error: "Upload failed: " + (err.message ?? "unknown") }, { status: 500 });
  }
}
