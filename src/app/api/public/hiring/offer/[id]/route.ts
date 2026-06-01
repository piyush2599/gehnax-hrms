import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Candidate from "@/models/Candidate";
import { calculateCRM } from "@/lib/ctc-calculator";
import { generateOfferLetterBuffer } from "@/lib/offer-letter-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();

  const candidate = await Candidate.findById(params.id).populate("jobPosting", "title department");
  if (!candidate) return new NextResponse("Offer not found", { status: 404 });

  const offer = candidate.offer;
  if (!offer?.ctcAnnual || !offer.joiningDate || !offer.designation) {
    return new NextResponse("Offer details incomplete", { status: 404 });
  }
  if (offer.approvalStatus !== "approved") {
    return new NextResponse("Offer not yet approved", { status: 403 });
  }

  const pfType  = offer.pfType  ?? "percent";
  const pfValue = offer.pfValue ?? 12;
  const pfConfig = pfType === "fixed"
    ? { type: "fixed" as const,   fixedMonthly: pfValue }
    : pfType === "percent"
    ? { type: "percent" as const, pct: pfValue }
    : { type: "none" as const };
  const includeGratuity = offer.includeGratuity ?? true;

  const breakdown = calculateCRM(offer.ctcAnnual, offer.isMetro ?? true, pfConfig, includeGratuity);
  if (!breakdown) return new NextResponse("Invalid CTC", { status: 400 });

  const ref = offer.offerRefNumber || offer.offerNumber ||
    `GTL/HR/${new Date().getFullYear()}/${params.id.slice(-6).toUpperCase()}`;

  const joiningDateStr = new Date(offer.joiningDate).toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const generatedDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  try {
    const pdfBuffer = await generateOfferLetterBuffer({
      employeeName:      `${candidate.firstName} ${candidate.lastName}`,
      employeeCode:      ref,
      designation:       offer.designation,
      department:        offer.department || (candidate.jobPosting as any)?.department || "—",
      joiningDate:       joiningDateStr,
      salary: {
        basic:           breakdown.basicMonthly,
        hra:             breakdown.hraMonthly,
        allowances:      breakdown.otherAllowancesMonthly,
        grossMonthly:    breakdown.grossMonthly,
        employeePF:      breakdown.employeePFMonthly,
        employerPF:      breakdown.employerPFMonthly,
        esi:             0,
        professionalTax: 0,
        tds:             breakdown.monthlyTDS,
        totalDeductions: breakdown.totalDeductionsMonthly,
        netMonthly:      breakdown.inHandMonthly,
        grossAnnual:     breakdown.grossAnnual,
        gratuity:        breakdown.gratuityMonthly,
        annualCTC:       offer.ctcAnnual,
      },
      verificationUrl:   process.env.NEXTAUTH_URL ?? "https://myapp.gehnax.com",
      verificationToken: ref,
      generatedDate,
      refNumber:         ref,
    });

    const safeName = `Offer-Letter-${candidate.firstName}-${candidate.lastName}.pdf`
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control":       "no-store",
      },
    });
  } catch (err: any) {
    return new NextResponse(err.message || "PDF generation failed", { status: 500 });
  }
}
