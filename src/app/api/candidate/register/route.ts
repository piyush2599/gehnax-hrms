import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import CandidateAccount from "@/models/CandidateAccount";
import { signCandidateToken, CANDIDATE_COOKIE } from "@/lib/candidate-auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  await connectDB();

  const body = await req.formData();
  const email            = (body.get("email") as string)?.toLowerCase().trim();
  const password         = body.get("password") as string;
  const firstName        = (body.get("firstName") as string)?.trim();
  const lastName         = (body.get("lastName") as string)?.trim();
  const phone            = body.get("phone") as string | null;
  const currentCompany   = body.get("currentCompany") as string | null;
  const currentDesignation = body.get("currentDesignation") as string | null;
  const totalExperience  = parseFloat(body.get("totalExperience") as string) || 0;
  const skillsRaw        = body.get("skills") as string | null;
  const skills           = skillsRaw ? skillsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const resumeFile       = body.get("resume") as File | null;

  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json({ error: "Email, password, first name and last name are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const existing = await CandidateAccount.findOne({ email });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  let resumeUrl: string | undefined;
  let resumeFileName: string | undefined;

  if (resumeFile && resumeFile.size > 0) {
    if (resumeFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Resume file too large (max 10 MB)" }, { status: 400 });
    }
    const buffer = Buffer.from(await resumeFile.arrayBuffer());
    const { url } = await uploadToCloudinary(buffer, resumeFile.name, "hrms/candidate-resumes", resumeFile.type);
    resumeUrl      = url;
    resumeFileName = resumeFile.name;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const account = await CandidateAccount.create({
    email,
    password:           hashedPassword,
    firstName,
    lastName,
    phone:              phone || undefined,
    currentCompany:     currentCompany || undefined,
    currentDesignation: currentDesignation || undefined,
    totalExperience,
    skills,
    resumeUrl,
    resumeFileName,
  });

  const token = await signCandidateToken({ id: account._id.toString(), email: account.email });

  const res = NextResponse.json({
    account: { id: account._id, email: account.email, firstName: account.firstName, lastName: account.lastName },
  }, { status: 201 });

  res.cookies.set(CANDIDATE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  return res;
}
