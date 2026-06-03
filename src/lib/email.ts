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

const ADMIN_CC = "piyush.agarwal@gehnax.com";

export async function sendMail({ to, subject, html, text }: MailOptions) {
  return transporter.sendMail({
    from: `"Gehnax HRMS" <${process.env.SMTP_USER}>`,
    to: Array.isArray(to) ? to.join(", ") : to,
    bcc: ADMIN_CC,
    subject,
    html,
    text: text ?? html.replace(/<[^>]+>/g, ""),
  });
}

// ── Prebuilt templates ──────────────────────────────────────────────────────

export function sendWelcomeEmail(to: string, name: string, password: string, loginEmail?: string) {
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
            <p style="margin:0 0 16px;color:#1e293b;font-weight:600">${loginEmail ?? to}</p>
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

export function sendOnboardingInviteEmail(to: string, name: string, inviteLink: string, employeeCode: string, designation: string) {
  return sendMail({
    to,
    subject: "You're invited to join Gehnax Technologies — Complete Your Onboarding",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#f8fafc;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1e40af,#4f46e5);padding:32px;text-align:center">
          <img src="https://www.gehnax.com/Gehnax-logo.png" alt="Gehnax" style="height:36px;margin-bottom:12px" />
          <p style="color:#bfdbfe;margin:4px 0 0;font-size:14px">Human Resource Management System</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1e293b;margin-top:0">Welcome${name ? `, ${name}` : ""}!</h2>
          <p style="color:#475569">You have been invited to join <strong>Gehnax Technologies LLP</strong> as <strong>${designation}</strong>.</p>
          <p style="color:#475569">Please complete your onboarding by clicking the button below and filling in your details.</p>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0">
            <p style="margin:0 0 8px;color:#64748b;font-size:13px">EMPLOYEE ID</p>
            <p style="margin:0 0 16px;color:#1e293b;font-weight:600;font-family:monospace">${employeeCode}</p>
            <p style="margin:0 0 8px;color:#64748b;font-size:13px">ONBOARDING LINK (valid for 7 days)</p>
            <a href="${inviteLink}" style="color:#1e40af;font-weight:600;word-break:break-all">${inviteLink}</a>
          </div>
          <a href="${inviteLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Start Onboarding</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">This link expires in 7 days. If you did not expect this email, please ignore it.</p>
        </div>
        <div style="background:#f1f5f9;padding:16px;text-align:center;color:#94a3b8;font-size:12px">
          © ${new Date().getFullYear()} Gehnax Technologies LLP. This is an automated email, please do not reply.
        </div>
      </div>
    `,
  });
}

export function sendResignationNotificationEmail(
  to: string | string[],
  employeeName: string,
  employeeCode: string,
  designation: string,
  lastWorkingDay: string,
  reason?: string
) {
  return sendMail({
    to,
    subject: `Resignation Notice — ${employeeName} (${employeeCode})`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#f8fafc;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1e40af,#4f46e5);padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">Gehnax HRMS</h1>
          <p style="color:#bfdbfe;margin:8px 0 0">Resignation Notification</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1e293b;margin-top:0">Resignation Submitted</h2>
          <p style="color:#475569">An employee has submitted their resignation. Please review the details below.</p>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0">
            <p style="margin:0 0 8px;color:#64748b;font-size:13px">EMPLOYEE</p>
            <p style="margin:0 0 16px;color:#1e293b;font-weight:600">${employeeName} <span style="color:#64748b;font-weight:400">(${employeeCode})</span></p>
            <p style="margin:0 0 8px;color:#64748b;font-size:13px">DESIGNATION</p>
            <p style="margin:0 0 16px;color:#1e293b;font-weight:600">${designation}</p>
            <p style="margin:0 0 8px;color:#64748b;font-size:13px">LAST WORKING DAY</p>
            <p style="margin:0 0 ${reason ? "16px" : "0"};color:#ef4444;font-weight:600">${lastWorkingDay}</p>
            ${reason ? `<p style="margin:0 0 8px;color:#64748b;font-size:13px">REASON</p><p style="margin:0;color:#475569">${reason}</p>` : ""}
          </div>
          <p style="color:#475569;font-size:14px">Please log in to the HRMS to review and take action on this resignation.</p>
        </div>
        <div style="background:#f1f5f9;padding:16px;text-align:center;color:#94a3b8;font-size:12px">
          © ${new Date().getFullYear()} Gehnax HRMS. This is an automated email, please do not reply.
        </div>
      </div>
    `,
  });
}

export function sendLeaveConfirmationEmail(
  to: string,
  employeeName: string,
  startDate: string,
  endDate: string,
  totalDays: number,
  reason: string,
) {
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  return sendMail({
    to,
    subject: `Leave Application Submitted — ${fmt(startDate)} to ${fmt(endDate)}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#f8fafc;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1e40af,#4f46e5);padding:32px;text-align:center">
          <img src="https://www.gehnax.com/Gehnax-logo.png" alt="Gehnax" style="height:36px;margin-bottom:12px"/>
          <p style="color:#bfdbfe;margin:4px 0 0;font-size:14px">Leave Management</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1e293b;margin-top:0">Hi ${employeeName},</h2>
          <p style="color:#475569">Your leave application has been submitted and is <strong>pending approval</strong>.</p>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:120px">From</td><td style="padding:6px 0;color:#1e293b;font-weight:600">${fmt(startDate)}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-size:13px">To</td><td style="padding:6px 0;color:#1e293b;font-weight:600">${fmt(endDate)}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Duration</td><td style="padding:6px 0;color:#1e293b;font-weight:600">${totalDays} working day${totalDays !== 1 ? "s" : ""}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-size:13px;vertical-align:top">Reason</td><td style="padding:6px 0;color:#475569">${reason}</td></tr>
            </table>
          </div>
          <p style="color:#475569;font-size:14px">You will receive an email once your leave is reviewed by your manager or HR.</p>
        </div>
        <div style="background:#f1f5f9;padding:16px;text-align:center;color:#94a3b8;font-size:12px">
          © ${new Date().getFullYear()} Gehnax Technologies LLP
        </div>
      </div>
    `,
  });
}

export function sendLeaveStatusEmail(
  to: string,
  employeeName: string,
  status: "approved" | "rejected",
  startDate: string,
  endDate: string,
  totalDays: number,
  comments?: string,
) {
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  const isApproved = status === "approved";
  return sendMail({
    to,
    subject: `Leave ${isApproved ? "Approved" : "Rejected"} — ${fmt(startDate)} to ${fmt(endDate)}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#f8fafc;border-radius:12px;overflow:hidden">
        <div style="background:${isApproved ? "linear-gradient(135deg,#065f46,#059669)" : "linear-gradient(135deg,#991b1b,#dc2626)"};padding:32px;text-align:center">
          <img src="https://www.gehnax.com/Gehnax-logo.png" alt="Gehnax" style="height:36px;margin-bottom:12px"/>
          <p style="color:${isApproved ? "#a7f3d0" : "#fecaca"};margin:4px 0 0;font-size:14px">Leave ${isApproved ? "Approved ✓" : "Rejected ✗"}</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1e293b;margin-top:0">Hi ${employeeName},</h2>
          <p style="color:#475569">Your leave application has been <strong style="color:${isApproved ? "#059669" : "#dc2626"}">${status}</strong>.</p>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:120px">From</td><td style="padding:6px 0;color:#1e293b;font-weight:600">${fmt(startDate)}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-size:13px">To</td><td style="padding:6px 0;color:#1e293b;font-weight:600">${fmt(endDate)}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Duration</td><td style="padding:6px 0;color:#1e293b;font-weight:600">${totalDays} working day${totalDays !== 1 ? "s" : ""}</td></tr>
              ${comments ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;vertical-align:top">Comments</td><td style="padding:6px 0;color:#475569">${comments}</td></tr>` : ""}
            </table>
          </div>
          ${isApproved
            ? `<p style="color:#475569;font-size:14px">Your leave has been approved. Enjoy your time off!</p>`
            : `<p style="color:#475569;font-size:14px">If you have questions, please contact your HR or manager.</p>`}
        </div>
        <div style="background:#f1f5f9;padding:16px;text-align:center;color:#94a3b8;font-size:12px">
          © ${new Date().getFullYear()} Gehnax Technologies LLP
        </div>
      </div>
    `,
  });
}

export function sendLeaveApplicationEmail(
  to: string[],
  employeeName: string,
  employeeCode: string,
  startDate: string,
  endDate: string,
  totalDays: number,
  reason: string,
) {
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  return sendMail({
    to: to.join(", "),
    subject: `Leave Application — ${employeeName} (${fmt(startDate)} to ${fmt(endDate)})`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#f8fafc;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1e40af,#4f46e5);padding:32px;text-align:center">
          <img src="https://www.gehnax.com/Gehnax-logo.png" alt="Gehnax" style="height:36px;margin-bottom:12px" />
          <p style="color:#bfdbfe;margin:4px 0 0;font-size:14px">Leave Application</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1e293b;margin-top:0">New Leave Request</h2>
          <p style="color:#475569">The following employee has applied for leave and requires your review.</p>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:130px">Employee</td><td style="padding:6px 0;color:#1e293b;font-weight:600">${employeeName} <span style="color:#64748b;font-weight:400">(${employeeCode})</span></td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-size:13px">From</td><td style="padding:6px 0;color:#1e293b;font-weight:600">${fmt(startDate)}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-size:13px">To</td><td style="padding:6px 0;color:#1e293b;font-weight:600">${fmt(endDate)}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Duration</td><td style="padding:6px 0;color:#1e293b;font-weight:600">${totalDays} working day${totalDays !== 1 ? "s" : ""}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-size:13px;vertical-align:top">Reason</td><td style="padding:6px 0;color:#475569">${reason}</td></tr>
            </table>
          </div>
          <a href="${process.env.NEXTAUTH_URL ?? "https://myapp.gehnax.com"}/leaves" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Review Leave Request</a>
        </div>
        <div style="background:#f1f5f9;padding:16px;text-align:center;color:#94a3b8;font-size:12px">
          © ${new Date().getFullYear()} Gehnax Technologies LLP. This is an automated email.
        </div>
      </div>
    `,
  });
}

export function sendInterviewScheduledEmail(
  to: string,
  candidateName: string,
  jobTitle: string,
  round: number,
  interviewType: string,
  scheduledAt: string,
  interviewer: string,
  meetingLink?: string,
  meetingInvite?: string,
) {
  const typeLabels: Record<string, string> = {
    phone: "Phone Screen", video: "Video Interview", onsite: "Onsite Interview",
    technical: "Technical Round", hr_round: "HR Round",
  };
  const typeLabel = typeLabels[interviewType] ?? interviewType;
  const dateStr = new Date(scheduledAt).toLocaleString("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata", timeZoneName: "short",
  });

  return sendMail({
    to,
    subject: `Interview Scheduled — Round ${round} · ${typeLabel} | Gehnax Technologies`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#f8fafc;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1e40af,#4f46e5);padding:32px;text-align:center">
          <img src="https://www.gehnax.com/Gehnax-logo.png" alt="Gehnax" style="height:36px;margin-bottom:12px" />
          <p style="color:#bfdbfe;margin:4px 0 0;font-size:14px">Interview Invitation</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1e293b;margin-top:0">Dear ${candidateName},</h2>
          <p style="color:#475569">We are pleased to invite you for an interview for the position of <strong>${jobTitle}</strong> at Gehnax Technologies LLP.</p>

          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;width:140px">Round</td>
                <td style="padding:6px 0;color:#1e293b;font-weight:600">Round ${round} — ${typeLabel}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px">Date &amp; Time</td>
                <td style="padding:6px 0;color:#1e293b;font-weight:600">${dateStr}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px">Interviewer</td>
                <td style="padding:6px 0;color:#1e293b;font-weight:600">${interviewer}</td>
              </tr>
              ${meetingLink ? `
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px">Meeting Link</td>
                <td style="padding:6px 0"><a href="${meetingLink}" style="color:#2563eb;font-weight:600">${meetingLink}</a></td>
              </tr>` : ""}
            </table>
          </div>

          ${meetingInvite ? `
          <div style="background:#f1f5f9;border-left:3px solid #3b82f6;border-radius:0 8px 8px 0;padding:16px;margin-bottom:24px">
            <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Meeting Details</p>
            <pre style="margin:0;color:#334155;font-size:13px;white-space:pre-wrap;font-family:inherit">${meetingInvite}</pre>
          </div>` : ""}

          <p style="color:#475569;font-size:14px">Please confirm your availability by replying to this email. If you have any questions, feel free to reach out to us at <a href="mailto:hr@gehnax.com" style="color:#2563eb">hr@gehnax.com</a>.</p>
          <p style="color:#475569;font-size:14px">We look forward to speaking with you!</p>
        </div>
        <div style="background:#f1f5f9;padding:16px;text-align:center;color:#94a3b8;font-size:12px">
          © ${new Date().getFullYear()} Gehnax Technologies LLP. This is an automated email, please do not reply directly.
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
