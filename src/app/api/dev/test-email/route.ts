import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles: string[] = (session.user as any).roles || [];
  if (!roles.includes("super_admin")) {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }

  const to = new URL(req.url).searchParams.get("to") || "piyush.agarwal@gehnax.com";

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    debug: true,
    logger: false,
  });

  // Verify connection first
  await transporter.verify();

  const info = await transporter.sendMail({
    from: `"Gehnax HRMS" <${process.env.SMTP_USER}>`,
    to,
    subject: "Gehnax HRMS — SMTP Test",
    text: "SMTP test from Gehnax HRMS. If you see this, email delivery is working.",
    html: "<p>SMTP test from <b>Gehnax HRMS</b>. If you see this, email delivery is working.</p>",
  });

  return NextResponse.json({
    ok: true,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
    smtpUser: process.env.SMTP_USER,
    smtpHost: process.env.SMTP_HOST,
  });
}
