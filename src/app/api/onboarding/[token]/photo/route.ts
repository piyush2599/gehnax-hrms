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

  const role = (session.user as any).role;
  if (!["super_admin", "hr_admin"].includes(role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  await connectDB();

  const invite = await OnboardingInvite.findOne({ token: params.token }).select("profilePicture");

  if (!invite?.profilePicture) {
    return new NextResponse("No photo uploaded", { status: 404 });
  }

  try {
    const upstream = await fetch(invite.profilePicture);
    if (!upstream.ok) {
      return new NextResponse("Photo not found at storage URL", { status: 404 });
    }

    const buffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "image/jpeg";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("[photo proxy] Failed to fetch from storage:", invite.profilePicture, err?.message);
    return new NextResponse("Failed to load photo", { status: 502 });
  }
}
