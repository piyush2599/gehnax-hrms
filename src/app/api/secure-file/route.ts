import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isOurCloudinaryUrl } from "@/lib/cloudinary";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return new NextResponse(
      "401 Unauthorized — please log in to view this document.",
      { status: 401, headers: { "Content-Type": "text/plain" } }
    );
  }

  const { searchParams } = new URL(req.url);
  const encoded = searchParams.get("u");
  if (!encoded) return new NextResponse("Bad Request", { status: 400 });

  let url: string;
  try {
    // base64url decode — handle both base64url and base64 variants
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    url = Buffer.from(b64, "base64").toString("utf-8");
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // Only serve files from our own Cloudinary account
  if (!isOurCloudinaryUrl(url)) {
    return new NextResponse("Forbidden — only internal documents can be accessed this way.", {
      status: 403, headers: { "Content-Type": "text/plain" },
    });
  }

  const fileRes = await fetch(url);
  if (!fileRes.ok) {
    return new NextResponse("File not found", { status: 404 });
  }

  const contentType = fileRes.headers.get("content-type") || "application/octet-stream";
  const buffer = await fileRes.arrayBuffer();
  const fileName = decodeURIComponent(url.split("/").pop()?.split("?")[0] ?? "document");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
