import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as any;
  const roles: string[] = sessionUser.roles || [];
  const myEmployeeId = sessionUser.employeeId?.toString();

  if (!roles.some(r => ["super_admin", "hr_admin"].includes(r)) && myEmployeeId !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const emp = await Employee.findById(params.id).select("documents");
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const doc = (emp.documents as any[]).find((d) => d._id.toString() === params.docId);
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  // Fetch the file from its stored URL and stream it back — never expose the raw URL to the client
  const fileRes = await fetch(doc.fileUrl);
  if (!fileRes.ok) return NextResponse.json({ error: "File not available" }, { status: 502 });

  const contentType = fileRes.headers.get("content-type") || "application/octet-stream";
  const body = await fileRes.arrayBuffer();

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.name)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as any;
  const roles: string[] = sessionUser.roles || [];
  const myEmployeeId = sessionUser.employeeId?.toString();

  if (!roles.some(r => ["super_admin", "hr_admin"].includes(r)) && myEmployeeId !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const emp = await Employee.findById(params.id);
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const docIndex = (emp.documents as any[]).findIndex(
    (d) => d._id.toString() === params.docId
  );
  if (docIndex === -1) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  emp.documents.splice(docIndex, 1);
  await emp.save();

  return NextResponse.json({ success: true });
}
