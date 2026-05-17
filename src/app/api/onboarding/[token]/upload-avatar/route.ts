import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import OnboardingInvite from "@/models/OnboardingInvite";
import { uploadToCloudinary } from "@/lib/cloudinary";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

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
    return NextResponse.json({ error: "Profile picture can no longer be uploaded for this invite" }, { status: 410 });
  }

  const body = await req.formData();
  const file = body.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG or WebP images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Image too large (max 5 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url } = await uploadToCloudinary(buffer, `${invite.token}.jpg`, "hrms/onboarding-avatars", file.type);

  invite.profilePicture = url;
  await invite.save();

  return NextResponse.json({ url });
}
