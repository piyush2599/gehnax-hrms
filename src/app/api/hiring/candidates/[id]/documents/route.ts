import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import HiringDocument from "@/models/HiringDocument";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const documents = await HiringDocument.find({ candidate: params.id }).sort({
    createdAt: -1,
  });

  return NextResponse.json({ documents });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["super_admin", "hr_admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const body = await req.json();
  const { docId } = body;

  if (!docId) {
    return NextResponse.json({ error: "docId is required" }, { status: 400 });
  }

  const document = await HiringDocument.findOneAndDelete({
    _id: docId,
    candidate: params.id,
  });

  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  return NextResponse.json({ message: "Document deleted" });
}
