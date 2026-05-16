import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import OnboardingInvite from "@/models/OnboardingInvite";
import User from "@/models/User";
import Employee from "@/models/Employee";
import bcrypt from "bcryptjs";

export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["super_admin", "hr_admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const invite = await OnboardingInvite.findOne({ token: params.token });

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.status !== "submitted") {
    return NextResponse.json({ error: "Employee must submit the form first" }, { status: 400 });
  }

  const existingUser = await User.findOne({ email: invite.email });
  if (existingUser) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const existingEmployee = await Employee.findOne({ employeeCode: invite.employeeCode });
  if (existingEmployee) {
    return NextResponse.json({ error: "An employee with this ID already exists" }, { status: 409 });
  }

  const personal = invite.formData?.personal || {};
  const bank = invite.formData?.bank || {};

  const firstName = (personal as any).firstName || invite.firstName || "";
  const lastName = (personal as any).lastName || invite.lastName || "";
  const hashedPassword = await bcrypt.hash(invite.employeeCode, 12);

  const avatarUrl = invite.profilePicture || undefined;

  // Step 1: create User (employeeId set after employee is created)
  const user = await User.create({
    name: `${firstName} ${lastName}`.trim() || invite.email,
    email: invite.email,
    password: hashedPassword,
    role: "employee",
    avatar: avatarUrl,
    mustChangePassword: true,
  });

  // Step 2: create Employee
  const employee = await Employee.create({
    employeeCode: invite.employeeCode,
    userId: user._id,
    firstName: firstName || "—",
    lastName: lastName || "—",
    email: invite.email,
    phone: (personal as any).phone,
    dateOfBirth: (personal as any).dateOfBirth ? new Date((personal as any).dateOfBirth) : undefined,
    gender: (personal as any).gender,
    address: (personal as any).address,
    department: invite.department,
    designation: invite.designation,
    employmentType: invite.employmentType,
    joiningDate: invite.joiningDate,
    bankDetails: bank,
    avatar: avatarUrl,
    salary: { basic: 0, hra: 0, allowances: 0, deductions: 0 },
  });

  // Step 3: link employeeId back to user
  await User.findByIdAndUpdate(user._id, { employeeId: employee._id });

  invite.status = "completed";
  invite.completedAt = new Date();
  invite.employeeId = employee._id;
  await invite.save();

  return NextResponse.json(
    { employee, credentials: { email: invite.email, password: invite.employeeCode } },
    { status: 201 }
  );
}
