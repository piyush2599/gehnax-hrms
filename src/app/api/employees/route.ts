import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const department = searchParams.get("department") || "";
  const status = searchParams.get("status") || "active";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const query: any = {};
  if (status === "active") query.isActive = true;
  if (status === "inactive") query.isActive = false;
  if (department) query.department = department;
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { employeeCode: { $regex: search, $options: "i" } },
    ];
  }

  const roles: string[] = (session.user as any).roles || [];
  const canSeeSalary = roles.some(r => ["super_admin", "finance_admin"].includes(r));

  const [employees, total] = await Promise.all([
    Employee.find(query)
      .populate("department", "name code")
      .populate("reportingManager", "firstName lastName")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Employee.countDocuments(query),
  ]);

  const result = canSeeSalary
    ? employees
    : employees.map((emp) => {
        const e = emp.toObject();
        delete e.salary;
        delete e.bankDetails;
        return e;
      });

  return NextResponse.json({ employees: result, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.some(r => ["super_admin", "hr_admin"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const body = await req.json();
  const {
    firstName, lastName, email, phone, dateOfBirth, gender,
    department, designation, employmentType, joiningDate,
    reportingManager, salary, address, password = "Welcome@123",
  } = body;

  // Check duplicate email
  const existingEmployee = await Employee.findOne({ email });
  if (existingEmployee) {
    return NextResponse.json({ error: "Email already exists" }, { status: 400 });
  }

  // Generate employee code
  const count = await Employee.countDocuments();
  const employeeCode = `EMP${String(count + 1).padStart(4, "0")}`;

  // Create user account
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: `${firstName} ${lastName}`,
    email,
    password: hashedPassword,
    role: "employee",
    mustChangePassword: true,
  });

  // Create employee
  const employee = await Employee.create({
    employeeCode,
    userId: user._id,
    firstName, lastName, email, phone, dateOfBirth, gender,
    department, designation, employmentType,
    joiningDate: new Date(joiningDate),
    reportingManager: reportingManager || undefined,
    salary: salary || { basic: 0, hra: 0, allowances: 0, deductions: 0 },
    address,
  });

  // Link employee to user
  await User.findByIdAndUpdate(user._id, { employeeId: employee._id });

  // Send welcome email with credentials (fire-and-forget — don't fail the request if email fails)
  sendWelcomeEmail(email, `${firstName} ${lastName}`, password).catch(() => {});

  return NextResponse.json({ employee, user }, { status: 201 });
}
