import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import OnboardingInvite from "@/models/OnboardingInvite";

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => ["super_admin", "hr_admin"].includes(r))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  await connectDB();

  const invite = await OnboardingInvite.findOne({ token: params.token }).select(
    "profilePicture profilePictureData"
  );

  if (!invite) return new NextResponse("No photo uploaded", { status: 404 });

  // FTP/external URL — redirect directly
  if (invite.profilePicture?.startsWith("http")) {
    return NextResponse.redirect(invite.profilePicture);
  }

  // Legacy base64 fallback
  if (!invite.profilePictureData) return new NextResponse("No photo uploaded", { status: 404 });

  const dataUrl = invite.profilePictureData;
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) return new NextResponse("Invalid photo data", { status: 500 });

  const meta = dataUrl.slice(5, commaIdx);
  const mimeType = meta.split(";")[0] || "image/jpeg";
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
