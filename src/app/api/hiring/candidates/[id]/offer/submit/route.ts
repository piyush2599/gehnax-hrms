import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Candidate from "@/models/Candidate";
import { calculateCRM } from "@/lib/ctc-calculator";
import { generateOfferLetterBuffer } from "@/lib/offer-letter-pdf";
import { uploadToCloudinary } from "@/lib/cloudinary";

function pad(n: number) { return String(n).padStart(2, "0"); }
function refNumber() {
  const d = new Date();
  return `OFR-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function POST(
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

  const candidate = await Candidate.findById(params.id).populate("jobPosting", "title department");
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  const offer = candidate.offer;
  if (!offer?.ctcAnnual || !offer.joiningDate || !offer.designation) {
    return NextResponse.json({ error: "Please fill CTC, joining date and designation before submitting" }, { status: 400 });
  }

  if (offer.approvalStatus === "pending_approval") {
    return NextResponse.json({ error: "Offer is already pending approval" }, { status: 400 });
  }

  // Compute salary breakdown from CTC
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

  const ref = offer.offerRefNumber || refNumber();
  const joiningDateStr = new Date(offer.joiningDate).toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const generatedDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const pdfBuffer = await generateOfferLetterBuffer({
    employeeName:      `${candidate.firstName} ${candidate.lastName}`,
    employeeCode:      ref,
    designation:       offer.designation,
    department:        offer.department || (candidate.jobPosting as any)?.department || "—",
    joiningDate:       joiningDateStr,
    salary: {
      basic:            breakdown.basicMonthly,
      hra:              breakdown.hraMonthly,
      allowances:       breakdown.otherAllowancesMonthly,
      grossMonthly:     breakdown.grossMonthly,
      employeePF:       breakdown.employeePFMonthly,
      employerPF:       breakdown.employerPFMonthly,
      esi:              0,
      professionalTax:  0,
      tds:              breakdown.monthlyTDS,
      totalDeductions:  breakdown.totalDeductionsMonthly,
      netMonthly:       breakdown.inHandMonthly,
      grossAnnual:      breakdown.grossAnnual,
      gratuity:         breakdown.gratuityMonthly,
      annualCTC:        offer.ctcAnnual,
    },
    verificationUrl:   `${process.env.NEXTAUTH_URL ?? "https://myapp.gehnax.com"}`,
    verificationToken: ref,
    generatedDate,
    refNumber:         ref,
  });

  const { url } = await uploadToCloudinary(
    pdfBuffer as Buffer,
    `offer-${ref}.pdf`,
    "hrms/candidate-offers",
    "application/pdf"
  );

  await Candidate.findByIdAndUpdate(params.id, {
    $set: {
      "offer.offerPdfUrl":      url,
      "offer.offerRefNumber":   ref,
      "offer.approvalStatus":   "pending_approval",
      "offer.approvalComments": undefined,
      "offer.approvedBy":       undefined,
      "offer.approvedAt":       undefined,
    },
  });

  return NextResponse.json({ ok: true, pdfUrl: url, refNumber: ref });
}
