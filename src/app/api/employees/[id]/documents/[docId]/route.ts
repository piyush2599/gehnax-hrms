import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as any;
  const role = sessionUser.role;
  const myEmployeeId = sessionUser.employeeId?.toString();

  if (!["super_admin", "hr_admin"].includes(role) && myEmployeeId !== params.id) {
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
