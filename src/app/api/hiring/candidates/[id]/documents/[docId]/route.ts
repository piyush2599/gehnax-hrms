import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import HiringDocument from "@/models/HiringDocument";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => ["super_admin", "hr_admin", "manager"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const doc = await HiringDocument.findOne({ _id: params.docId, candidate: params.id }).lean() as any;
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const fileRes = await fetch(doc.fileUrl);
  if (!fileRes.ok) return NextResponse.json({ error: "File not available" }, { status: 502 });

  const contentType = fileRes.headers.get("content-type") || "application/octet-stream";
  const body = await fileRes.arrayBuffer();

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.originalName || doc.filename || "document")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
