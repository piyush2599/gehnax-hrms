import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Candidate from "@/models/Candidate";
import { calculateCRM } from "@/lib/ctc-calculator";
import { generateOfferLetterBuffer } from "@/lib/offer-letter-pdf";

function pad(n: number) { return String(n).padStart(2, "0"); }

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => ["super_admin", "hr_admin"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const candidate = await Candidate.findById(params.id).populate({
    path: "jobPosting",
    select: "title department",
    populate: { path: "department", select: "name" },
  });
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  const offer = candidate.offer;
  if (!offer?.ctcAnnual || !offer.joiningDate || !offer.designation) {
    return NextResponse.json(
      { error: "Offer is incomplete — CTC, joining date and designation are required" },
      { status: 400 }
    );
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
  if (!breakdown) return NextResponse.json({ error: "Invalid CTC amount" }, { status: 400 });

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
      department:        offer.department || (candidate.jobPosting as any)?.department?.name || "—",
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

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `inline; filename="offer-${candidate.firstName}-${candidate.lastName}.pdf"`,
        "Cache-Control":       "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "PDF generation failed" }, { status: 500 });
  }
}
