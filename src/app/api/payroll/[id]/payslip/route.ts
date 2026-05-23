import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Payroll from "@/models/Payroll";
import Employee from "@/models/Employee";
import Department from "@/models/Department";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { generateSalarySlipBuffer } from "@/lib/salary-slip-pdf";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as any;
  if (!["super_admin", "hr_admin"].includes(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden — HR/Admin only" }, { status: 403 });
  }

  await connectDB();

  const payroll = await Payroll.findById(params.id)
    .populate("employeeId", "firstName lastName employeeCode designation department")
    .lean() as any;

  if (!payroll) return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });

  const emp = payroll.employeeId;
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  let department = "—";
  if (emp.department) {
    const dept = await Department.findById(emp.department).lean() as any;
    department = dept?.name || "—";
  }

  const now = new Date();
  const generatedDate = now.toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthName = MONTH_NAMES[payroll.month] || String(payroll.month);

  const slipData = {
    employeeName: `${emp.firstName} ${emp.lastName}`,
    employeeCode: emp.employeeCode,
    designation:  emp.designation,
    department,
    month:        payroll.month,
    year:         payroll.year,
    payPeriod:    payroll.payPeriod,
    presentDays:  payroll.presentDays,
    workingDays:  payroll.workingDays,
    leaveDays:    payroll.leaveDays,
    earnings:     payroll.earnings,
    deductions:   payroll.deductions,
    grossPay:     payroll.grossPay,
    totalDeductions: payroll.totalDeductions,
    netPay:       payroll.netPay,
    status:       payroll.status,
    generatedDate,
  };

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateSalarySlipBuffer(slipData);
  } catch (err: any) {
    console.error("Salary slip PDF generation failed:", err);
    return NextResponse.json({ error: "PDF generation failed: " + err.message }, { status: 500 });
  }

  const fileName = `salary-slip-${emp.employeeCode}-${payroll.year}-${String(payroll.month).padStart(2, "0")}`;
  let payslipUrl: string;
  try {
    const result = await uploadToCloudinary(
      pdfBuffer,
      fileName,
      "hrms/payslips",
      "application/pdf"
    );
    payslipUrl = result.url;
  } catch (err: any) {
    console.error("Cloudinary upload failed:", err);
    return NextResponse.json({ error: "Upload failed: " + err.message }, { status: 500 });
  }

  // Save URL on payroll record
  await Payroll.findByIdAndUpdate(params.id, { payslipUrl });

  // Append to employee.documents
  await Employee.findByIdAndUpdate(emp._id, {
    $push: {
      documents: {
        name:       `Salary Slip — ${monthName} ${payroll.year}`,
        type:       "Salary Slip",
        fileUrl:    payslipUrl,
        uploadedAt: now,
      },
    },
  });

  return NextResponse.json({ payslipUrl }, { status: 201 });
}
