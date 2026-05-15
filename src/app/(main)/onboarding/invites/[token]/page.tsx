"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User, Phone, MapPin, CreditCard, Shield, HeartPulse,
  Mail, FileText, BadgeCheck, KeyRound, RefreshCw,
  CheckCircle, Clock, ClipboardCheck, ChevronLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Invite {
  _id: string;
  token: string;
  profilePicture?: string;
  employeeCode: string;
  email: string;
  firstName?: string;
  lastName?: string;
  department: { _id: string; name: string };
  designation: string;
  employmentType: string;
  joiningDate: string;
  status: "pending" | "in_progress" | "submitted" | "completed" | "expired";
  documents?: { panCard?: string; aadhaarCard?: string };
  formData?: {
    personal?: {
      firstName?: string; lastName?: string; dateOfBirth?: string; gender?: string; phone?: string;
      address?: { street?: string; city?: string; state?: string; country?: string; pincode?: string };
    };
    identity?: { pan?: string; aadhaar?: string };
    bank?: { accountNumber?: string; bankName?: string; ifscCode?: string; accountHolderName?: string };
    emergency?: { name?: string; relation?: string; phone?: string };
  };
}

const STATUS_CONFIG = {
  pending:     { label: "Pending",     color: "bg-amber-50 text-amber-700 border-amber-200" },
  in_progress: { label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200" },
  submitted:   { label: "Submitted",   color: "bg-violet-50 text-violet-700 border-violet-200" },
  completed:   { label: "Completed",   color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  expired:     { label: "Expired",     color: "bg-slate-100 text-slate-500 border-slate-200" },
};

const EMP_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time", part_time: "Part-time", contract: "Contract", intern: "Intern",
};

export default function OnboardingInviteDetailPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completedCreds, setCompletedCreds] = useState<{ email: string; password: string } | null>(null);

  const fetchInvite = async () => {
    setAvatarError(false);
    const res = await fetch(`/api/onboarding/${params.token}/detail`);
    if (res.ok) { const d = await res.json(); setInvite(d.invite); }
    else { toast.error("Invite not found"); router.back(); }
    setLoading(false);
  };

  useEffect(() => { fetchInvite(); }, [params.token]);

  const handleComplete = async () => {
    if (!invite) return;
    setCompleting(true);
    const res = await fetch(`/api/onboarding/${invite.token}/complete`, { method: "POST" });
    const data = await res.json();
    setCompleting(false);
    if (!res.ok) { toast.error(data.error); return; }
    toast.success("Employee account created successfully!");
    setCompletedCreds(data.credentials);
    setInvite((prev) => prev ? { ...prev, status: "completed" } : prev);
  };

  const displayName = (inv: Invite) => {
    const fn = inv.formData?.personal?.firstName || inv.firstName;
    const ln = inv.formData?.personal?.lastName || inv.lastName;
    return fn || ln ? `${fn || ""} ${ln || ""}`.trim() : "—";
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="h-40 bg-slate-200 rounded-2xl" />
        <div className="h-32 bg-slate-200 rounded-2xl" />
        <div className="h-32 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (!invite) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Onboarding
      </button>

      {/* Hero header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-700 rounded-2xl px-7 pt-6 pb-6 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Onboarding Details</p>
          <button
            onClick={fetchInvite}
            title="Refresh"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-5">
          {invite.profilePicture && !avatarError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/onboarding/${invite.token}/photo`}
              alt="Profile"
              onError={() => setAvatarError(true)}
              className="w-20 h-20 rounded-2xl object-cover border-4 border-white/20 shadow-xl flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-white/10 border-2 border-white/10 flex items-center justify-center flex-shrink-0">
              <User className="w-9 h-9 text-white/40" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-white leading-tight">{displayName(invite) || invite.email}</h1>
            <p className="text-slate-300 text-sm mt-0.5">{invite.designation}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="font-mono text-[11px] bg-white/10 text-white/80 px-2.5 py-1 rounded-lg font-semibold">
                {invite.employeeCode}
              </span>
              <span className="text-[11px] bg-blue-500/20 text-blue-200 border border-blue-400/20 px-2.5 py-1 rounded-lg font-medium">
                {invite.department?.name}
              </span>
              <span className="text-[11px] bg-white/10 text-white/70 border border-white/10 px-2.5 py-1 rounded-lg font-medium">
                {EMP_TYPE_LABELS[invite.employmentType]}
              </span>
              <Badge className={`text-xs border ${STATUS_CONFIG[invite.status]?.color}`}>
                {STATUS_CONFIG[invite.status]?.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-0 mt-5 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Employee ID</p>
            <p className="text-sm font-mono font-bold text-white mt-1">{invite.employeeCode}</p>
          </div>
          <div className="px-4 py-3 text-center border-x border-white/10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Email</p>
            <p className="text-sm font-medium text-white/90 mt-1 truncate">{invite.email}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Joining Date</p>
            <p className="text-sm font-bold text-white mt-1">
              {new Date(invite.joiningDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Credentials banner */}
      {completedCreds && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <BadgeCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-800">Employee Account Created!</p>
              <p className="text-xs text-emerald-600 mt-0.5">Share these login credentials with the employee</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl px-4 py-3 border border-emerald-100">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Email</p>
              </div>
              <p className="text-sm font-mono font-semibold text-slate-900 break-all">{completedCreds.email}</p>
            </div>
            <div className="bg-white rounded-xl px-4 py-3 border border-emerald-100">
              <div className="flex items-center gap-1.5 mb-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Password</p>
              </div>
              <p className="text-sm font-mono font-semibold text-slate-900">{completedCreds.password}</p>
            </div>
          </div>
        </div>
      )}

      {/* Personal Details */}
      <DetailCard icon={<User className="w-4 h-4" />} title="Personal Details" color="blue">
        <TwoCol>
          <InfoRow label="First Name" value={invite.formData?.personal?.firstName} />
          <InfoRow label="Last Name" value={invite.formData?.personal?.lastName} />
          <InfoRow label="Date of Birth" value={invite.formData?.personal?.dateOfBirth
            ? new Date(invite.formData.personal.dateOfBirth).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
            : undefined} />
          <InfoRow label="Gender" value={invite.formData?.personal?.gender} capitalize />
        </TwoCol>
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Phone className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Phone</p>
              <p className="text-sm text-slate-900 font-semibold mt-0.5">{invite.formData?.personal?.phone || "—"}</p>
            </div>
          </div>
          {invite.formData?.personal?.address && (
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Address</p>
                <p className="text-sm text-slate-900 font-semibold mt-0.5 leading-relaxed">
                  {[
                    invite.formData.personal.address.street,
                    invite.formData.personal.address.city,
                    invite.formData.personal.address.state,
                    invite.formData.personal.address.country,
                    invite.formData.personal.address.pincode,
                  ].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
            </div>
          )}
        </div>
      </DetailCard>

      {/* Identity Documents */}
      <DetailCard icon={<Shield className="w-4 h-4" />} title="Identity Documents" color="violet">
        <TwoCol>
          <InfoRow label="PAN Number" value={invite.formData?.identity?.pan} mono />
          <InfoRow label="Aadhaar Number" value={invite.formData?.identity?.aadhaar} mono />
        </TwoCol>
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
          <DocStatus label="PAN Card PDF" uploaded={!!invite.documents?.panCard} />
          <DocStatus label="Aadhaar Card PDF" uploaded={!!invite.documents?.aadhaarCard} />
        </div>
      </DetailCard>

      {/* Bank Details */}
      <DetailCard icon={<CreditCard className="w-4 h-4" />} title="Bank Details" color="emerald">
        <TwoCol>
          <InfoRow label="Account Holder" value={invite.formData?.bank?.accountHolderName} />
          <InfoRow label="Bank Name" value={invite.formData?.bank?.bankName} />
          <InfoRow label="Account Number" value={invite.formData?.bank?.accountNumber} mono />
          <InfoRow label="IFSC Code" value={invite.formData?.bank?.ifscCode} mono />
        </TwoCol>
      </DetailCard>

      {/* Emergency Contact */}
      <DetailCard icon={<HeartPulse className="w-4 h-4" />} title="Emergency Contact" color="rose">
        <TwoCol>
          <InfoRow label="Name" value={invite.formData?.emergency?.name} />
          <InfoRow label="Relation" value={invite.formData?.emergency?.relation} />
          <InfoRow label="Phone" value={invite.formData?.emergency?.phone} />
        </TwoCol>
      </DetailCard>

      {/* Complete Onboarding CTA */}
      {invite.status === "submitted" && !completedCreds && (
        <div className="flex items-center gap-5 bg-violet-600 rounded-2xl p-5 shadow-lg shadow-violet-200">
          <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Ready to complete onboarding</p>
            <p className="text-xs text-violet-200 mt-0.5">Review all details above, then activate the employee account</p>
          </div>
          <button
            onClick={handleComplete}
            disabled={completing}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-violet-700 rounded-xl text-sm font-bold hover:bg-violet-50 transition-colors disabled:opacity-60 shadow-sm flex-shrink-0"
          >
            {completing ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {completing ? "Creating…" : "Complete Onboarding"}
          </button>
        </div>
      )}

      {invite.status === "completed" && !completedCreds && (
        <div className="flex items-center gap-3 bg-emerald-600 rounded-2xl p-5">
          <CheckCircle className="w-5 h-5 text-white flex-shrink-0" />
          <p className="text-sm font-semibold text-white">Onboarding completed — employee account is active</p>
        </div>
      )}
    </div>
  );
}

const CARD_COLORS: Record<string, string> = {
  blue:    "bg-blue-50 text-blue-600 border-blue-100",
  violet:  "bg-violet-50 text-violet-600 border-violet-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  rose:    "bg-rose-50 text-rose-600 border-rose-100",
};

function DetailCard({ icon, title, color, children }: {
  icon: React.ReactNode; title: string; color: string; children: React.ReactNode;
}) {
  const cls = CARD_COLORS[color] ?? CARD_COLORS.blue;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${cls.split(" ").pop()} bg-gradient-to-r from-slate-50 to-white`}>
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${cls}`}>{icon}</div>
        <p className="text-sm font-bold text-slate-800">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>;
}

function InfoRow({ label, value, mono, capitalize }: { label: string; value?: string; mono?: boolean; capitalize?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-sm text-slate-900 font-medium mt-0.5 ${mono ? "font-mono" : ""} ${capitalize ? "capitalize" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

function DocStatus({ label, uploaded }: { label: string; uploaded: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border ${
      uploaded ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
    }`}>
      <FileText className={`w-4 h-4 flex-shrink-0 ${uploaded ? "text-emerald-500" : "text-slate-400"}`} />
      <div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className={`text-xs font-semibold mt-0.5 ${uploaded ? "text-emerald-700" : "text-slate-400"}`}>
          {uploaded ? "Uploaded & Encrypted" : "Not Uploaded"}
        </p>
      </div>
    </div>
  );
}
