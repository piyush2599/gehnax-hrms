import { connectDB } from "@/lib/mongodb";
import OfferLetter from "@/models/OfferLetter";
import { CheckCircle2, XCircle, AlertTriangle, Building2, User, Briefcase, Calendar, Hash, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: { token: string };
}

function fmt(date: string | Date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

export default async function VerifyOfferPage({ params }: Props) {
  await connectDB();
  const ol = await OfferLetter.findOne({ verificationToken: params.token }).lean() as any;

  if (!ol) {
    return (
      <div className="space-y-6">
        <Link href="/verify-offer" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Back to portal
        </Link>
        <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-700">Invalid Token</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
              No offer letter was found for this token. Please double-check the token and try again.
            </p>
          </div>
          <Link
            href="/verify-offer"
            className="inline-block mt-2 text-sm text-blue-600 hover:underline"
          >
            Try another token
          </Link>
        </div>
      </div>
    );
  }

  const isRevoked = !ol.isActive;

  return (
    <div className="space-y-6">
      <Link href="/verify-offer" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Back to portal
      </Link>

      {/* Status banner */}
      {isRevoked ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <AlertTriangle className="w-7 h-7 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800">Offer Revoked</p>
            <p className="text-sm text-amber-700 mt-0.5">
              This offer letter was revoked on {ol.revokedAt ? fmt(ol.revokedAt) : "—"} and is no longer valid.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
          <CheckCircle2 className="w-7 h-7 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-800">Offer Letter Verified</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              This offer letter is genuine and was officially issued by Gehnax Technologies LLP.
            </p>
          </div>
        </div>
      )}

      {/* Details card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Issued by</p>
            <p className="text-lg font-bold text-slate-900">Gehnax Technologies LLP</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow icon={<User className="w-4 h-4" />} label="Employee Name" value={ol.employeeName} />
            <InfoRow icon={<Hash className="w-4 h-4" />} label="Employee Code" value={ol.employeeCode} />
            <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Designation" value={ol.designation} />
            <InfoRow icon={<Building2 className="w-4 h-4" />} label="Department" value={ol.department} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Letter Issued On" value={fmt(ol.generatedAt)} />
            <InfoRow icon={<Hash className="w-4 h-4" />} label="Reference Number" value={ol.refNumber} />
          </div>

          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-mono break-all">Token: {params.token}</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-center text-slate-400">
        This verification is provided by the Gehnax Technologies HRMS. For queries, contact hr@gehnax.com.
      </p>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
      <div className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
