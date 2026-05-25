import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import OfferLetter from "@/models/OfferLetter";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; letterId: string } }
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
  const letter = await OfferLetter.findOne({ _id: params.letterId, employee: params.id }).lean() as any;
  if (!letter) return NextResponse.json({ error: "Offer letter not found" }, { status: 404 });

  const fileRes = await fetch(letter.fileUrl);
  if (!fileRes.ok) return NextResponse.json({ error: "File not available" }, { status: 502 });

  const body = await fileRes.arrayBuffer();

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="offer-letter.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
