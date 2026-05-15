import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // port 465 = SSL
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail({ to, subject, html, text }: MailOptions) {
  return transporter.sendMail({
    from: `"Gehnax HRMS" <${process.env.SMTP_USER}>`,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
    text: text ?? html.replace(/<[^>]+>/g, ""),
  });
}

// ── Prebuilt templates ──────────────────────────────────────────────────────

export function sendWelcomeEmail(to: string, name: string, password: string) {
  return sendMail({
    to,
    subject: "Welcome to Gehnax HRMS — Your Account is Ready",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#f8fafc;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1e40af,#4f46e5);padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">Gehnax HRMS</h1>
          <p style="color:#bfdbfe;margin:8px 0 0">Human Resource Management System</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1e293b;margin-top:0">Welcome, ${name}!</h2>
          <p style="color:#475569">Your employee account has been created. Use the credentials below to log in.</p>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0">
            <p style="margin:0 0 8px;color:#64748b;font-size:13px">LOGIN URL</p>
            <p style="margin:0 0 16px;color:#1e40af;font-weight:600">${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/login</p>
            <p style="margin:0 0 8px;color:#64748b;font-size:13px">EMAIL</p>
            <p style="margin:0 0 16px;color:#1e293b;font-weight:600">${to}</p>
            <p style="margin:0 0 8px;color:#64748b;font-size:13px">TEMPORARY PASSWORD</p>
            <p style="margin:0;color:#1e293b;font-weight:600;font-family:monospace;font-size:16px;background:#f1f5f9;padding:8px 12px;border-radius:6px;display:inline-block">${password}</p>
          </div>
          <p style="color:#ef4444;font-size:13px">⚠️ Please change your password after your first login.</p>
        </div>
        <div style="background:#f1f5f9;padding:16px;text-align:center;color:#94a3b8;font-size:12px">
          © ${new Date().getFullYear()} Gehnax HRMS. This is an automated email, please do not reply.
        </div>
      </div>
    `,
  });
}

export function sendPasswordResetEmail(to: string, name: string, newPassword: string) {
  return sendMail({
    to,
    subject: "Gehnax HRMS — Your Password Has Been Reset",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#f8fafc;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1e40af,#4f46e5);padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">Gehnax HRMS</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1e293b;margin-top:0">Password Reset</h2>
          <p style="color:#475569">Hi ${name}, your password has been reset by an administrator.</p>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0">
            <p style="margin:0 0 8px;color:#64748b;font-size:13px">NEW TEMPORARY PASSWORD</p>
            <p style="margin:0;color:#1e293b;font-weight:600;font-family:monospace;font-size:16px;background:#f1f5f9;padding:8px 12px;border-radius:6px;display:inline-block">${newPassword}</p>
          </div>
          <p style="color:#ef4444;font-size:13px">⚠️ Please change your password immediately after logging in.</p>
        </div>
        <div style="background:#f1f5f9;padding:16px;text-align:center;color:#94a3b8;font-size:12px">
          © ${new Date().getFullYear()} Gehnax HRMS. This is an automated email, please do not reply.
        </div>
      </div>
    `,
  });
}
