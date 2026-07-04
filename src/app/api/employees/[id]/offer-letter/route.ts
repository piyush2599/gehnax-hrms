import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import OfferLetter from "@/models/OfferLetter";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { generateOfferLetterBuffer } from "@/lib/offer-letter-pdf";
import { computeOfferSalary } from "@/lib/payroll-calc";
import crypto from "crypto";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
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
  const raw = await OfferLetter.find({ employee: params.id })
    .sort({ generatedAt: -1 })
    .lean();

  // Strip raw fileUrl — clients use the /offer-letter/[letterId] proxy endpoint
  const offerLetters = raw.map(({ fileUrl, ...rest }: any) => rest);

  return NextResponse.json({ offerLetters });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as any;
  const roles: string[] = sessionUser.roles || [];

  if (!roles.some(r => ["super_admin", "hr_admin"].includes(r))) {
    return NextResponse.json({ error: "Forbidden — HR/Admin only" }, { status: 403 });
  }

  await connectDB();
  const emp = await Employee.findById(params.id)
    .populate("department", "name")
    .lean() as any;

  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  // ── Salary breakdown — SINGLE engine shared with the payslip ──────────────
  // Guarantees the offer-letter annexure equals a full-month payslip.
  // Professional Tax = 0 (Delhi has no PT).
  const sv = computeOfferSalary(emp.salary || { basic: 0, hra: 0, allowances: 0 }, 0);
  const {
    basic, hra, allowances,
    grossMonthly, grossAnnual,
    employeePF, employerPF, esi,
    professionalTax, tds,
    totalDeductions, netMonthly, gratuity, annualCTC,
  } = sv;

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
      professionalTax, tds,
      totalDeductions, netMonthly, grossAnnual,
      gratuity, annualCTC,
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

  // ── Upload to Cloudinary ─────────────────────────────────────
  const fileName = `offer-letter-${emp.employeeCode}-${verificationToken.slice(0, 10)}`;
  let fileUrl: string;
  try {
    const result = await uploadToCloudinary(
      pdfBuffer,
      fileName,
      `hrms/offer-letters/${params.id}`,
      "application/pdf"
    );
    fileUrl = result.url;
  } catch (err: any) {
    console.error("Cloudinary upload failed:", err);
    return NextResponse.json({ error: "Upload failed: " + err.message }, { status: 500 });
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
  if (!(sessionUser.roles || []).some((r: string) => ["super_admin", "hr_admin"].includes(r))) {
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
