import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import User from "@/models/User";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const employee = await Employee.findById(params.id)
    .populate("department", "name code")
    .populate("reportingManager", "firstName lastName employeeCode");

  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(employee);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const sessionEmployeeId = (session.user as any).employeeId;

  // Allow employee to update own profile (limited fields)
  const isOwnProfile = sessionEmployeeId === params.id;
  if (!["super_admin", "hr_admin"].includes(role) && !isOwnProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const body = await req.json();

  // Employees can only update limited fields on their own profile
  const allowedFields = isOwnProfile && !["super_admin", "hr_admin"].includes(role)
    ? { phone: body.phone, address: body.address, avatar: body.avatar }
    : body;

  const employee = await Employee.findByIdAndUpdate(params.id, allowedFields, {
    new: true,
    runValidators: true,
  }).populate("department", "name code");

  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update user name if name changed
  if (body.firstName || body.lastName) {
    await User.findByIdAndUpdate(employee.userId, {
      name: `${employee.firstName} ${employee.lastName}`,
    });
  }

  return NextResponse.json(employee);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const employee = await Employee.findByIdAndUpdate(
    params.id,
    { isActive: false, terminationDate: new Date() },
    { new: true }
  );

  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await User.findByIdAndUpdate(employee.userId, { isActive: false });

  return NextResponse.json({ message: "Employee deactivated" });
}
