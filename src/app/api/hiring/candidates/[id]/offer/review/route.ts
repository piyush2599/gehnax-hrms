import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Candidate from "@/models/Candidate";
import { sendMail } from "@/lib/email";
import { cloudinaryAttachmentUrl } from "@/lib/cloudinary";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles: string[] = (session.user as any).roles || [];
  if (!roles.includes("super_admin")) {
    return NextResponse.json({ error: "Only Super Admin can approve or reject offers" }, { status: 403 });
  }

  const { action, comments } = await req.json();
  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  await connectDB();

  const candidate = await Candidate.findById(params.id).populate("jobPosting", "title");
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  const offer = candidate.offer;
  if (offer?.approvalStatus !== "pending_approval") {
    return NextResponse.json({ error: "Offer is not pending approval" }, { status: 400 });
  }

  if (action === "approve") {
    await Candidate.findByIdAndUpdate(params.id, {
      $set: {
        "offer.approvalStatus":   "approved",
        "offer.approvalComments": comments || undefined,
        "offer.approvedBy":       (session.user as any).id,
        "offer.approvedAt":       new Date(),
        "offer.status":           "sent",
        "offer.sentAt":           new Date(),
      },
    });

    // Email candidate with offer PDF
    if (candidate.email && offer.offerPdfUrl) {
      const jobTitle = (candidate.jobPosting as any)?.title ?? "the position";
      const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

      await sendMail({
        to: candidate.email,
        subject: `Congratulations! Your Offer Letter — ${jobTitle} | Gehnax Technologies`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#f8fafc;border-radius:12px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#1e40af,#4f46e5);padding:32px;text-align:center">
              <img src="https://www.gehnax.com/Gehnax-logo.png" alt="Gehnax" style="height:36px;margin-bottom:12px"/>
              <p style="color:#bfdbfe;margin:4px 0 0;font-size:14px">Offer Letter</p>
            </div>
            <div style="padding:32px">
              <h2 style="color:#1e293b;margin-top:0">Congratulations, ${candidate.firstName}!</h2>
              <p style="color:#475569">We are pleased to extend you an offer for the position of <strong>${offer.designation}</strong> at Gehnax Technologies LLP.</p>
              <p style="color:#475569">Your joining date is <strong>${offer.joiningDate ? fmt(new Date(offer.joiningDate)) : "—"}</strong>.</p>
              <div style="margin:28px 0">
                <a href="${cloudinaryAttachmentUrl(offer.offerPdfUrl, `Offer-Letter-${candidate.firstName}-${candidate.lastName}.pdf`)}" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Download Offer Letter</a>
              </div>
              <p style="color:#475569;font-size:14px">Please review your offer letter and confirm your acceptance. If you have any questions, contact us at <a href="mailto:hr@gehnax.com" style="color:#2563eb">hr@gehnax.com</a>.</p>
            </div>
            <div style="background:#f1f5f9;padding:16px;text-align:center;color:#94a3b8;font-size:12px">
              © ${new Date().getFullYear()} Gehnax Technologies LLP
            </div>
          </div>
        `,
      }).catch(() => {});
    }
  } else {
    // Reject — send back to HR with comments
    await Candidate.findByIdAndUpdate(params.id, {
      $set: {
        "offer.approvalStatus":   "rejected",
        "offer.approvalComments": comments || undefined,
        "offer.approvedBy":       undefined,
        "offer.approvedAt":       undefined,
      },
    });
  }

  const updated = await Candidate.findById(params.id).select("offer");
  return NextResponse.json({ ok: true, offer: updated?.offer });
}
