import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import OfferLetter from "@/models/OfferLetter";
import { uploadToFTP } from "@/lib/ftp-upload";
import { generateOfferLetterBuffer } from "@/lib/offer-letter-pdf";
import crypto from "crypto";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
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
  const offerLetters = await OfferLetter.find({ employee: params.id })
    .sort({ generatedAt: -1 })
    .lean();

  return NextResponse.json({ offerLetters });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as any;
  const role = sessionUser.role;

  if (!["super_admin", "hr_admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden — HR/Admin only" }, { status: 403 });
  }

  await connectDB();
  const emp = await Employee.findById(params.id)
    .populate("department", "name")
    .lean() as any;

  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  // ── Salary breakdown (no Gratuity, no Professional Tax; both PF deducted) ──
  const basic       = emp.salary?.basic || 0;
  const hra         = emp.salary?.hra || 0;
  const allowances  = emp.salary?.allowances || 0;
  const storedDeductions = emp.salary?.deductions || 0;

  const grossMonthly = basic + hra + allowances;
  const grossAnnual  = grossMonthly * 12;
  const employeePF   = Math.round(basic * 0.12);
  const employerPF   = Math.round(basic * 0.12);
  const esi          = grossMonthly <= 21_000 ? Math.round(grossMonthly * 0.0075) : 0;
  // PF base (no professional tax)
  const computedBase = employeePF + employerPF + esi;
  const tds          = Math.max(0, storedDeductions - computedBase);
  const totalDeductions = storedDeductions > 0 ? storedDeductions : computedBase;
  const netMonthly   = grossMonthly - totalDeductions;
  // CTC = Gross + Employer PF only (no Gratuity)
  const annualCTC    = Math.round(grossAnnual + employerPF * 12);

  // ── Token & URL ─────────────────────────────────────────────
  const verificationToken = crypto.randomBytes(20).toString("hex");
  const baseUrl = (process.env.NEXTAUTH_URL || "https://myapp.gehnax.com").replace(/\/$/, "");
  const verificationUrl = `${baseUrl}/verify-offer/${verificationToken}`;

  // ── Formatted strings ────────────────────────────────────────
  const now = new Date();
  const generatedDate = now.toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const joiningDate = emp.joiningDate
    ? new Date(emp.joiningDate).toLocaleDateString("en-IN", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : "—";

  const employeeName = `${emp.firstName} ${emp.lastName}`;
  const department   = emp.department?.name || "—";
  const refNumber    = `GEH-OL-${emp.employeeCode}-${now.getFullYear()}`;

  // ── Generate PDF ─────────────────────────────────────────────
  const offerData = {
    employeeName,
    employeeCode: emp.employeeCode,
    designation:  emp.designation,
    department,
    joiningDate,
    salary: {
      basic, hra, allowances,
      grossMonthly, employeePF, employerPF, esi,
      professionalTax: 0, tds,
      totalDeductions, netMonthly, grossAnnual,
      gratuity: 0, annualCTC,
    },
    verificationUrl,
    verificationToken,
    generatedDate,
    refNumber,
  };

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateOfferLetterBuffer(offerData);
  } catch (err: any) {
    console.error("PDF generation failed:", err);
    return NextResponse.json({ error: "PDF generation failed: " + err.message }, { status: 500 });
  }

  // ── Upload to FTP ─────────────────────────────────────────────
  const fileName = `offer-letter-${verificationToken.slice(0, 10)}.pdf`;
  let fileUrl: string;
  try {
    const result = await uploadToFTP(pdfBuffer, fileName, `employee-docs/${params.id}/offer-letters`);
    fileUrl = result.url;
  } catch (err: any) {
    console.error("FTP upload failed:", err);
    return NextResponse.json({ error: "FTP upload failed: " + err.message }, { status: 500 });
  }

  // ── Save OfferLetter record ──────────────────────────────────
  const offerLetter = await OfferLetter.create({
    employee:     params.id,
    employeeName,
    employeeCode: emp.employeeCode,
    designation:  emp.designation,
    department,
    joiningDate:  emp.joiningDate,
    salary:       offerData.salary,
    verificationToken,
    fileUrl,
    refNumber,
    generatedBy:  sessionUser.id,
  });

  // ── Append to employee.documents ─────────────────────────────
  await Employee.findByIdAndUpdate(params.id, {
    $push: {
      documents: {
        name:       `Offer Letter — ${emp.designation} (${now.getFullYear()})`,
        type:       "Offer Letter",
        fileUrl,
        uploadedAt: now,
      },
    },
  });

  return NextResponse.json({ offerLetter, verificationUrl }, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as any;
  if (!["super_admin", "hr_admin"].includes(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { olId, action } = body;
  if (!olId || action !== "revoke") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectDB();
  const ol = await OfferLetter.findOneAndUpdate(
    { _id: olId, employee: params.id },
    { isActive: false, revokedAt: new Date(), revokedBy: sessionUser.id },
    { new: true }
  );

  if (!ol) return NextResponse.json({ error: "Offer letter not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
