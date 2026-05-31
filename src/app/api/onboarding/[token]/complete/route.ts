import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import OnboardingInvite from "@/models/OnboardingInvite";
import User from "@/models/User";
import Employee from "@/models/Employee";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const roles: string[] = (session.user as any).roles || [];
    if (!roles.some(r => ["super_admin", "hr_admin"].includes(r))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const invite = await OnboardingInvite.findOne({ token: params.token }).select(
      "status employeeCode email personalEmail firstName lastName department designation " +
      "employmentType joiningDate formData documents profilePicture"
    );

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

    // Convert Mongoose subdocuments to plain objects to avoid casting issues
    const personal = invite.formData?.personal
      ? (invite.formData.personal as any).toObject
        ? (invite.formData.personal as any).toObject()
        : { ...(invite.formData.personal as any) }
      : {};
    const bank = invite.formData?.bank
      ? (invite.formData.bank as any).toObject
        ? (invite.formData.bank as any).toObject()
        : { ...(invite.formData.bank as any) }
      : {};

    const firstName = personal.firstName || invite.firstName || "";
    const lastName = personal.lastName || invite.lastName || "";
    const personalEmail = invite.personalEmail || "";
    const hashedPassword = await bcrypt.hash(invite.employeeCode, 10);

    // profilePicture is a Cloudinary URL when uploaded via onboarding form
    const hasProfilePic = !!invite.profilePicture;

    // Step 1: create User (employeeId set after employee is created)
    let user;
    try {
      user = await User.create({
        name: `${firstName} ${lastName}`.trim() || invite.email,
        email: invite.email,
        password: hashedPassword,
        roles: ["employee"],
        mustChangePassword: true,
        isActive: true,
      });
    } catch (userErr: any) {
      console.error("[Onboarding Complete] User.create failed:", userErr);
      return NextResponse.json(
        { error: userErr.code === 11000 ? "A user with this email already exists" : `Failed to create user account: ${userErr.message}` },
        { status: userErr.code === 11000 ? 409 : 500 }
      );
    }

    // Build documents array from onboarding uploads (PAN + Aadhaar)
    const onboardingDocs: Array<{ name: string; type: string; fileUrl: string; uploadedAt: Date }> = [];
    if (invite.documents?.panCard) {
      onboardingDocs.push({ name: "PAN Card", type: "pan_card", fileUrl: invite.documents.panCard, uploadedAt: new Date() });
    }
    if (invite.documents?.aadhaarCard) {
      onboardingDocs.push({ name: "Aadhaar Card", type: "aadhaar_card", fileUrl: invite.documents.aadhaarCard, uploadedAt: new Date() });
    }

    // Step 2: create Employee — if this fails, clean up the User to allow retry
    let employee;
    try {
      employee = await Employee.create({
        employeeCode: invite.employeeCode,
        userId: user._id,
        firstName: firstName || "—",
        lastName: lastName || "—",
        email: invite.email,
        personalEmail: personalEmail || undefined,
        phone: personal.phone,
        dateOfBirth: personal.dateOfBirth ? new Date(personal.dateOfBirth) : undefined,
        gender: personal.gender,
        address: personal.address ? {
          street: personal.address.street,
          city: personal.address.city,
          state: personal.address.state,
          country: personal.address.country,
          pincode: personal.address.pincode,
        } : undefined,
        department: invite.department,
        designation: invite.designation,
        employmentType: invite.employmentType,
        joiningDate: invite.joiningDate,
        bankDetails: bank ? {
          accountNumber: bank.accountNumber,
          bankName: bank.bankName,
          ifscCode: bank.ifscCode,
          accountHolderName: bank.accountHolderName,
        } : undefined,
        avatar: hasProfilePic ? invite.profilePicture : undefined,
        documents: onboardingDocs,
        salary: { basic: 0, hra: 0, allowances: 0, deductions: 0 },
      });
    } catch (empErr: any) {
      // Roll back the User creation so admin can retry cleanly
      await User.findByIdAndDelete(user._id).catch(() => {});
      console.error("[Onboarding Complete] Employee.create failed:", empErr);
      return NextResponse.json(
        { error: empErr.code === 11000 ? "An employee with this ID already exists" : `Failed to create employee record: ${empErr.message}` },
        { status: empErr.code === 11000 ? 409 : 500 }
      );
    }

    // Step 3: link employeeId back to user, set Cloudinary avatar URL if uploaded
    const avatarUrl = hasProfilePic ? invite.profilePicture : undefined;
    await User.findByIdAndUpdate(user._id, { employeeId: employee._id, ...(avatarUrl ? { avatar: avatarUrl } : {}) });

    // Use updateOne to avoid sending the full invite document back to MongoDB
    await OnboardingInvite.updateOne(
      { token: params.token },
      { $set: { status: "completed", completedAt: new Date(), employeeId: employee._id } }
    );

    const fullName = `${firstName} ${lastName}`.trim() || invite.email;
    const emailTarget = personalEmail || invite.email;
    try {
      await sendWelcomeEmail(emailTarget, fullName, invite.employeeCode, invite.email);
    } catch (emailErr) {
      console.error("[Onboarding] Failed to send welcome email to", emailTarget, emailErr);
    }

    return NextResponse.json(
      { employee, credentials: { email: invite.email, password: invite.employeeCode } },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[Onboarding Complete] Unexpected error:", err);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${err.message ?? String(err)}` },
      { status: 500 }
    );
  }
}
