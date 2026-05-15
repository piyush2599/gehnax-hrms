import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Candidate from "@/models/Candidate";
import User from "@/models/User";
import Employee from "@/models/Employee";
import bcrypt from "bcryptjs";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["super_admin", "hr_admin"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const candidate = await Candidate.findById(params.id).populate("jobPosting", "department");
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  if (candidate.convertedEmployeeId) {
    return NextResponse.json({ error: "This candidate has already been converted to an employee" }, { status: 409 });
  }

  const {
    employeeCode, department, designation, joiningDate, employmentType,
    salary, reportingManager,
  } = await req.json();

  if (!employeeCode || !department || !designation || !joiningDate || !employmentType || !salary) {
    return NextResponse.json({ error: "employeeCode, department, designation, joiningDate, employmentType and salary are required" }, { status: 400 });
  }

  const [existingUser, existingEmp] = await Promise.all([
    User.findOne({ email: candidate.email }),
    Employee.findOne({ employeeCode }),
  ]);
  if (existingUser)  return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  if (existingEmp)   return NextResponse.json({ error: "Employee code already in use" }, { status: 409 });

  const hashedPassword = await bcrypt.hash(employeeCode, 12);
  const fullName = `${candidate.firstName} ${candidate.lastName}`.trim();

  const user = await User.create({
    name: fullName,
    email: candidate.email,
    password: hashedPassword,
    role: "employee",
    avatar: undefined,
  });

  const employee = await Employee.create({
    employeeCode,
    userId: user._id,
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    email: candidate.email,
    phone: candidate.phone,
    department,
    designation,
    joiningDate: new Date(joiningDate),
    employmentType,
    salary: {
      basic:      salary.basic || 0,
      hra:        salary.hra || 0,
      allowances: salary.allowances || 0,
      deductions: salary.deductions || 0,
    },
    reportingManager: reportingManager || undefined,
  });

  await User.findByIdAndUpdate(user._id, { employeeId: employee._id });

  // Mark candidate as hired + record converted employee
  candidate.stage = "hired";
  candidate.convertedEmployeeId = employee._id as any;
  if (candidate.offer) {
    candidate.offer.status = "accepted";
    if (!candidate.offer.acceptedAt) candidate.offer.acceptedAt = new Date();
  }
  await candidate.save();

  return NextResponse.json(
    { employee, credentials: { email: candidate.email, password: employeeCode } },
    { status: 201 }
  );
}
