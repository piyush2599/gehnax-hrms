import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import OfferLetter from "@/models/OfferLetter";

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  if (!params.token || params.token.length < 10) {
    return NextResponse.json({ valid: false, message: "Invalid token" });
  }

  await connectDB();
  const ol = await OfferLetter.findOne({ verificationToken: params.token }).lean() as any;

  if (!ol) {
    return NextResponse.json({
      valid: false,
      message: "No offer letter found for this token. Please verify the token and try again.",
    });
  }

  return NextResponse.json({
    valid:        true,
    isActive:     ol.isActive,
    employeeName: ol.employeeName,
    employeeCode: ol.employeeCode,
    designation:  ol.designation,
    department:   ol.department,
    refNumber:    ol.refNumber,
    generatedAt:  ol.generatedAt,
    company:      "Gehnax Technologies LLP",
    revokedAt:    ol.revokedAt || null,
  });
}
