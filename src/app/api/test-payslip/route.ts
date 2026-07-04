// DEV-ONLY endpoint — generates a payslip PDF from raw JSON body (no auth, no DB)
// Used to preview the PDF template during local development
import { NextRequest, NextResponse } from "next/server";
import { generateSalarySlipBuffer } from "@/lib/salary-slip-pdf";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }
  const data = await req.json();
  const buf  = await generateSalarySlipBuffer(data);
  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": 'inline; filename="test-payslip.pdf"',
    },
  });
}
