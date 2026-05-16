"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, AlertCircle, ChevronRight, ChevronLeft, Loader2, UploadCloud, FileCheck, X, ChevronDown, Camera, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { INDIA_STATES, INDIA_CITIES } from "@/lib/india-geo";

// ─── Country list ────────────────────────────────────────────────────────────
const COUNTRIES = [
  { name: "India",                dialCode: "+91",  flag: "🇮🇳" },
  { name: "United States",        dialCode: "+1",   flag: "🇺🇸" },
  { name: "United Kingdom",       dialCode: "+44",  flag: "🇬🇧" },
  { name: "Australia",            dialCode: "+61",  flag: "🇦🇺" },
  { name: "Canada",               dialCode: "+1-CA",flag: "🇨🇦" },
  { name: "Germany",              dialCode: "+49",  flag: "🇩🇪" },
  { name: "France",               dialCode: "+33",  flag: "🇫🇷" },
  { name: "Italy",                dialCode: "+39",  flag: "🇮🇹" },
  { name: "Spain",                dialCode: "+34",  flag: "🇪🇸" },
  { name: "Netherlands",          dialCode: "+31",  flag: "🇳🇱" },
  { name: "Singapore",            dialCode: "+65",  flag: "🇸🇬" },
  { name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪" },
  { name: "Saudi Arabia",         dialCode: "+966", flag: "🇸🇦" },
  { name: "Qatar",                dialCode: "+974", flag: "🇶🇦" },
  { name: "Kuwait",               dialCode: "+965", flag: "🇰🇼" },
  { name: "Bahrain",              dialCode: "+973", flag: "🇧🇭" },
  { name: "Oman",                 dialCode: "+968", flag: "🇴🇲" },
  { name: "Bangladesh",           dialCode: "+880", flag: "🇧🇩" },
  { name: "Pakistan",             dialCode: "+92",  flag: "🇵🇰" },
  { name: "Sri Lanka",            dialCode: "+94",  flag: "🇱🇰" },
  { name: "Nepal",                dialCode: "+977", flag: "🇳🇵" },
  { name: "China",                dialCode: "+86",  flag: "🇨🇳" },
  { name: "Japan",                dialCode: "+81",  flag: "🇯🇵" },
  { name: "South Korea",          dialCode: "+82",  flag: "🇰🇷" },
  { name: "Indonesia",            dialCode: "+62",  flag: "🇮🇩" },
  { name: "Malaysia",             dialCode: "+60",  flag: "🇲🇾" },
  { name: "Thailand",             dialCode: "+66",  flag: "🇹🇭" },
  { name: "Philippines",          dialCode: "+63",  flag: "🇵🇭" },
  { name: "Vietnam",              dialCode: "+84",  flag: "🇻🇳" },
  { name: "South Africa",         dialCode: "+27",  flag: "🇿🇦" },
  { name: "Nigeria",              dialCode: "+234", flag: "🇳🇬" },
  { name: "Kenya",                dialCode: "+254", flag: "🇰🇪" },
  { name: "Brazil",               dialCode: "+55",  flag: "🇧🇷" },
  { name: "Mexico",               dialCode: "+52",  flag: "🇲🇽" },
  { name: "Argentina",            dialCode: "+54",  flag: "🇦🇷" },
  { name: "Russia",               dialCode: "+7",   flag: "🇷🇺" },
  { name: "Turkey",               dialCode: "+90",  flag: "🇹🇷" },
  { name: "New Zealand",          dialCode: "+64",  flag: "🇳🇿" },
  { name: "Ireland",              dialCode: "+353", flag: "🇮🇪" },
  { name: "Sweden",               dialCode: "+46",  flag: "🇸🇪" },
  { name: "Norway",               dialCode: "+47",  flag: "🇳🇴" },
  { name: "Denmark",              dialCode: "+45",  flag: "🇩🇰" },
  { name: "Switzerland",          dialCode: "+41",  flag: "🇨🇭" },
  { name: "Portugal",             dialCode: "+351", flag: "🇵🇹" },
  { name: "Poland",               dialCode: "+48",  flag: "🇵🇱" },
];

/** Checks image clarity, resolution and brightness. Returns list of warning strings. */
async function checkImageQuality(file: File): Promise<string[]> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const warnings: string[] = [];

      if (img.width < 600 || img.height < 300) {
        warnings.push(`Resolution too low (${img.width}×${img.height}px) — minimum 600×300 for a readable ID.`);
      }
      if (file.size < 30 * 1024) {
        warnings.push("File size is very small — image may be over-compressed or too low quality.");
      }

      // Brightness check: scale down for perf, compute luminance
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 250 / Math.max(img.width, img.height));
        canvas.width  = Math.max(1, Math.round(img.width  * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let sum = 0;
          const n = data.length / 4;
          for (let i = 0; i < data.length; i += 4) {
            sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          }
          const avg = sum / n;
          if (avg < 50)  warnings.push("Image appears too dark — retake in better lighting.");
          if (avg > 230) warnings.push("Image appears overexposed — retake avoiding direct light/glare.");
        }
      } catch { /* canvas check is best-effort */ }

      resolve(warnings);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve([]); };
    img.src = url;
  });
}

/** Returns actual dial prefix string (+91, +1, +1, etc.) */
function realDialCode(dialCode: string) {
  return dialCode.replace(/-[A-Z]+$/, ""); // strip "-CA" suffix
}

/** Given a dialCode value, find the country name */
function countryNameByDialCode(dialCode: string) {
  return COUNTRIES.find((c) => c.dialCode === dialCode)?.name ?? "";
}

/** Parse a saved full phone string back into { dialCode, number } */
function parsePhone(full: string): { dialCode: string; number: string } {
  if (!full) return { dialCode: "+91", number: "" };
  const sorted = [...COUNTRIES].sort((a, b) => realDialCode(b.dialCode).length - realDialCode(a.dialCode).length);
  for (const c of sorted) {
    const prefix = realDialCode(c.dialCode);
    if (full.startsWith(prefix)) {
      return { dialCode: c.dialCode, number: full.slice(prefix.length) };
    }
  }
  return { dialCode: "+91", number: full };
}

// ─── Validation ──────────────────────────────────────────────────────────────
const STEPS = [
  { title: "Personal Details",    desc: "Your name, contact and address" },
  { title: "Identity",            desc: "PAN and Aadhaar" },
  { title: "Bank Details",        desc: "Salary account information" },
  { title: "Emergency Contact",   desc: "Someone we can reach in an emergency" },
  { title: "Review & Submit",     desc: "Confirm and submit your details" },
];

type FormData = {
  personal: {
    firstName: string; lastName: string; dateOfBirth: string; gender: string; phone: string;
    address: { street: string; city: string; state: string; country: string; pincode: string };
  };
  identity: { pan: string; aadhaar: string };
  bank: { accountNumber: string; bankName: string; ifscCode: string; accountHolderName: string };
  emergency: { name: string; relation: string; phone: string };
};

type Errors = Record<string, string>;

function validateStep(
  step: number,
  fd: FormData,
  docs: { panCard?: string; aadhaarCard?: string },
  profilePicture?: string,
  rawPhones?: { personal: string; emergency: string }
): Errors {
  const e: Errors = {};
  const { personal, identity, bank, emergency } = fd;

  if (step === 0) {
    if (!profilePicture)                      e["profilePicture"]           = "Profile photo is required";
    if (!personal.firstName.trim())           e["personal.firstName"]       = "First name is required";
    if (!personal.lastName.trim())            e["personal.lastName"]        = "Last name is required";
    if (!personal.dateOfBirth)                e["personal.dateOfBirth"]     = "Date of birth is required";
    else if (new Date(personal.dateOfBirth) >= new Date())
                                              e["personal.dateOfBirth"]     = "Date of birth cannot be a future date";
    if (!personal.gender)                     e["personal.gender"]          = "Gender is required";
    if (!rawPhones?.personal)                 e["personal.phone"]           = "Phone number is required";
    else if (rawPhones.personal.length !== 10) e["personal.phone"]          = "Phone number must be exactly 10 digits";
    if (!personal.address.street.trim())      e["personal.address.street"]  = "Street / Flat No. is required";
    if (!personal.address.city.trim())        e["personal.address.city"]    = "City is required";
    if (!personal.address.state.trim())       e["personal.address.state"]   = "State is required";
    if (!personal.address.country.trim())     e["personal.address.country"] = "Country is required";
    if (!personal.address.pincode.trim())     e["personal.address.pincode"] = "PIN code is required";
    else if (!/^\d{4,10}$/.test(personal.address.pincode.trim()))
                                              e["personal.address.pincode"] = "Enter a valid PIN / postal code";
  }

  if (step === 1) {
    if (!identity.pan.trim())                 e["identity.pan"]             = "PAN number is required";
    else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(identity.pan.trim()))
                                              e["identity.pan"]             = "Invalid PAN format (e.g. ABCDE1234F)";
    if (!docs.panCard)                        e["docs.panCard"]             = "PAN card PDF is required";
    if (!identity.aadhaar.trim())             e["identity.aadhaar"]         = "Aadhaar number is required";
    else if (!/^\d{12}$/.test(identity.aadhaar.trim()))
                                              e["identity.aadhaar"]         = "Aadhaar must be exactly 12 digits";
    if (!docs.aadhaarCard)                    e["docs.aadhaarCard"]         = "Aadhaar card PDF is required";
  }

  if (step === 2) {
    if (!bank.accountHolderName.trim())       e["bank.accountHolderName"]   = "Account holder name is required";
    if (!bank.accountNumber.trim())           e["bank.accountNumber"]       = "Account number is required";
    else if (!/^\d{9,18}$/.test(bank.accountNumber.trim()))
                                              e["bank.accountNumber"]       = "Account number must be 9–18 digits";
    if (!bank.bankName.trim())                e["bank.bankName"]            = "Bank name is required";
    if (!bank.ifscCode.trim())                e["bank.ifscCode"]            = "IFSC code is required";
    else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifscCode.trim()))
                                              e["bank.ifscCode"]            = "Invalid IFSC format (e.g. HDFC0001234)";
  }

  if (step === 3) {
    if (!emergency.name.trim())               e["emergency.name"]           = "Contact name is required";
    if (!emergency.relation.trim())           e["emergency.relation"]       = "Relation is required";
    if (!rawPhones?.emergency)                e["emergency.phone"]          = "Phone number is required";
    else if (rawPhones.emergency.length !== 10) e["emergency.phone"]        = "Phone number must be exactly 10 digits";
  }

  return e;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OnboardingFormPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState(0);
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  // Dial code state (UI-only; composed into formData.phone before save)
  const [personalDialCode, setPersonalDialCode] = useState("+91");
  const [personalPhoneNumber, setPersonalPhoneNumber] = useState("");
  const [emergencyDialCode, setEmergencyDialCode] = useState("+91");
  const [emergencyPhoneNumber, setEmergencyPhoneNumber] = useState("");

  // profilePicture = FTP URL stored on server (used for validation + submission)
  // previewUrl = local blob URL shown in the circle immediately after crop
  const [profilePicture, setProfilePicture] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const uploadCroppedBlob = async (blob: Blob, localPreview: string) => {
    setPreviewUrl(localPreview);
    setUploadingAvatar(true);
    const fd = new FormData();
    fd.append("file", blob, "profile.jpg");
    try {
      const res = await fetch(`/api/onboarding/${token}/upload-avatar`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Upload failed"); return; }
      setProfilePicture(data.url);
      clearErr("profilePicture");
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const clearAvatar = () => {
    setProfilePicture("");
    setPreviewUrl("");
    setCropFile(null);
  };

  const [docs, setDocs] = useState<{ panCard?: string; aadhaarCard?: string }>({});
  const [uploading, setUploading] = useState<{ panCard?: boolean; aadhaarCard?: boolean }>({});

  const [formData, setFormData] = useState<FormData>({
    personal: {
      firstName: "", lastName: "", dateOfBirth: "", gender: "", phone: "",
      address: { street: "", city: "", state: "", country: "India", pincode: "" },
    },
    identity: { pan: "", aadhaar: "" },
    bank: { accountNumber: "", bankName: "", ifscCode: "", accountHolderName: "" },
    emergency: { name: "", relation: "", phone: "" },
  });

  // Auto-fill address.country when personal dial code changes
  const handlePersonalDialCode = (dc: string) => {
    setPersonalDialCode(dc);
    const name = countryNameByDialCode(dc);
    if (name) {
      clearErr("personal.address.country");
      // Reset state & city when country changes so dropdowns stay consistent
      setFormData((f) => ({
        ...f,
        personal: { ...f.personal, address: { ...f.personal.address, country: name, state: "", city: "" } },
      }));
    }
  };

  useEffect(() => {
    fetch(`/api/onboarding/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setPageError(data.error); return; }
        setInvite(data.invite);
        if (data.invite.status === "submitted") { setSubmitted(true); return; }
        if (data.invite.profilePicture) { setProfilePicture(data.invite.profilePicture); setPreviewUrl(data.invite.profilePicture); }
        if (data.invite.documents) setDocs(data.invite.documents);
        const saved = data.invite.formData || {};

        // Parse saved phones
        const { dialCode: pDial, number: pNum } = parsePhone(saved.personal?.phone || "");
        setPersonalDialCode(pDial);
        setPersonalPhoneNumber(pNum);
        const { dialCode: eDial, number: eNum } = parsePhone(saved.emergency?.phone || "");
        setEmergencyDialCode(eDial);
        setEmergencyPhoneNumber(eNum);

        setFormData((prev) => ({
          personal: {
            ...prev.personal, ...(saved.personal || {}),
            firstName: saved.personal?.firstName || data.invite.firstName || "",
            lastName:  saved.personal?.lastName  || data.invite.lastName  || "",
            phone: saved.personal?.phone || "",
            address: { ...prev.personal.address, ...(saved.personal?.address || {}) },
          },
          identity:  { ...prev.identity,  ...(saved.identity  || {}) },
          bank:      { ...prev.bank,      ...(saved.bank      || {}) },
          emergency: { ...prev.emergency, ...(saved.emergency || {}) },
        }));
      })
      .catch(() => setPageError("Failed to load onboarding form"))
      .finally(() => setLoading(false));
  }, [token]);

  // Compose full phone numbers into formData before saving
  const buildSaveData = (): FormData => ({
    ...formData,
    personal: {
      ...formData.personal,
      phone: realDialCode(personalDialCode) + personalPhoneNumber,
    },
    emergency: {
      ...formData.emergency,
      phone: realDialCode(emergencyDialCode) + emergencyPhoneNumber,
    },
  });

  const save = async (submitForm = false) => {
    setSaving(true);
    try {
      const payload = buildSaveData();
      const res = await fetch(`/api/onboarding/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: payload, submit: submitForm, profilePicture: profilePicture || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      if (submitForm) setSubmitted(true);
    } catch (e: any) {
      alert(e.message || "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    // Compose phones into formData snapshot for validation
    const snapshot = buildSaveData();
    const errs = validateStep(step, snapshot, docs, profilePicture, { personal: personalPhoneNumber, emergency: emergencyPhoneNumber });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors({});
    // Persist composed phone before advancing
    setFormData(snapshot);
    await save(false);
    setStep((s) => s + 1);
  };

  const prev = () => { setErrors({}); setStep((s) => s - 1); };

  const clearErr = (key: string) => setErrors((e) => { const n = { ...e }; delete n[key]; return n; });

  const up = (section: keyof FormData, field: string, value: string) => {
    clearErr(`${section}.${field}`);
    setFormData((f) => ({ ...f, [section]: { ...(f[section] as any), [field]: value } }));
  };
  const upAddr = (field: string, value: string) => {
    clearErr(`personal.address.${field}`);
    setFormData((f) => ({ ...f, personal: { ...f.personal, address: { ...f.personal.address, [field]: value } } }));
  };

  const uploadDoc = async (file: File, docType: "pan_card" | "aadhaar_card") => {
    const key = docType === "pan_card" ? "panCard" : "aadhaarCard";
    setUploading((u) => ({ ...u, [key]: true }));
    const fd = new FormData();
    fd.append("file", file);
    fd.append("docType", docType);
    try {
      const res = await fetch(`/api/onboarding/${token}/upload-docs`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Upload failed"); return; }
      setDocs((d) => ({ ...d, [key]: data.url }));
      clearErr(`docs.${key}`);
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading((u) => ({ ...u, [key]: false }));
    }
  };

  // ─── Loading / error / success screens ──────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }
  if (pageError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Link Unavailable</h2>
          <p className="text-slate-500 text-sm mt-1 max-w-sm">{pageError}</p>
        </div>
        <p className="text-xs text-slate-400">Please contact HR if you believe this is a mistake.</p>
      </div>
    );
  }
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Details Submitted!</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-sm">
            Your onboarding form has been submitted successfully. HR will review your details and set up your account shortly.
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 text-left max-w-sm w-full">
          <p className="font-semibold mb-1">What happens next?</p>
          <ul className="space-y-1 text-xs list-disc list-inside">
            <li>HR reviews your submitted information</li>
            <li>Your HRMS account will be activated</li>
            <li>You'll receive login credentials on your email</li>
          </ul>
        </div>
      </div>
    );
  }

  const hasStepErrors = Object.keys(errors).length > 0;

  // ─── Main form ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Welcome */}
      {invite && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">
            Welcome{invite.firstName ? `, ${invite.firstName}` : ""}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Please complete your onboarding form. All fields are required. Progress is saved automatically.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <InfoChip label="Employee ID" value={invite.employeeCode} mono />
            <InfoChip label="Department" value={invite.department?.name} />
            <InfoChip label="Designation" value={invite.designation} />
            <InfoChip
              label="Joining Date"
              value={new Date(invite.joiningDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
            />
          </div>
        </div>
      )}

      {/* Progress stepper */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-1 mb-5">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                i < step ? "bg-emerald-500 text-white" : i === step ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-slate-100 text-slate-400"
              }`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded ${i < step ? "bg-emerald-400" : "bg-slate-100"}`} />
              )}
            </div>
          ))}
        </div>
        <h2 className="text-base font-bold text-slate-900">{STEPS[step].title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{STEPS[step].desc}</p>
      </div>

      {/* Error banner */}
      {hasStepErrors && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Please fix the following errors:</p>
            <ul className="mt-1 space-y-0.5">
              {Object.values(errors).map((msg, i) => (
                <li key={i} className="text-xs text-red-600">• {msg}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Form body */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">

        {/* ── Step 0: Personal ── */}
        {step === 0 && (
          <>
            {/* Profile picture */}
            <Field label="Profile Photo" required error={errors["profilePicture"]}>
              <div className="flex items-center gap-5">
                <div className="relative flex-shrink-0">
                  <div
                    onClick={() => !uploadingAvatar && avatarRef.current?.click()}
                    className={`w-24 h-24 rounded-full overflow-hidden cursor-pointer border-4 transition-all flex items-center justify-center ${
                      errors["profilePicture"]
                        ? "border-red-400 bg-red-50"
                        : previewUrl
                        ? "border-emerald-400"
                        : "border-dashed border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50"
                    }`}
                  >
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : uploadingAvatar ? (
                      <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Camera className={`w-7 h-7 ${errors["profilePicture"] ? "text-red-400" : "text-slate-400"}`} />
                        <span className={`text-[10px] font-semibold ${errors["profilePicture"] ? "text-red-500" : "text-slate-400"}`}>Upload</span>
                      </div>
                    )}
                  </div>
                  {previewUrl && (
                    <button
                      onClick={clearAvatar}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700">Upload your photo</p>
                  <p>JPG, PNG or WebP · max 5 MB</p>
                  <p>Use a clear, front-facing photo</p>
                  {!previewUrl && (
                    <button
                      onClick={() => avatarRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="mt-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                    >
                      {uploadingAvatar ? "Uploading…" : "Choose Photo"}
                    </button>
                  )}
                  {previewUrl && (
                    <button
                      onClick={() => avatarRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="mt-1 px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Change Photo
                    </button>
                  )}
                  {uploadingAvatar && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Saving to server…
                    </p>
                  )}
                </div>
                <input
                  ref={avatarRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { clearAvatar(); setCropFile(f); }
                    e.target.value = "";
                  }}
                />
              </div>
            </Field>

            <div className="border-t border-slate-100" />

            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" required error={errors["personal.firstName"]}>
                <input className={iCls(!!errors["personal.firstName"])} value={formData.personal.firstName} onChange={(e) => up("personal", "firstName", e.target.value)} placeholder="First name" />
              </Field>
              <Field label="Last Name" required error={errors["personal.lastName"]}>
                <input className={iCls(!!errors["personal.lastName"])} value={formData.personal.lastName} onChange={(e) => up("personal", "lastName", e.target.value)} placeholder="Last name" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date of Birth" required error={errors["personal.dateOfBirth"]}>
                <input type="date" className={iCls(!!errors["personal.dateOfBirth"])} value={formData.personal.dateOfBirth} onChange={(e) => up("personal", "dateOfBirth", e.target.value)} max={new Date().toISOString().split("T")[0]} min="1900-01-01" />
              </Field>
              <Field label="Gender" required error={errors["personal.gender"]}>
                <select className={iCls(!!errors["personal.gender"])} value={formData.personal.gender} onChange={(e) => up("personal", "gender", e.target.value)}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>
            <Field label="Phone Number" required error={errors["personal.phone"]}>
              <PhoneInput
                dialCode={personalDialCode}
                number={personalPhoneNumber}
                hasError={!!errors["personal.phone"]}
                onDialCodeChange={(dc) => { handlePersonalDialCode(dc); clearErr("personal.phone"); }}
                onNumberChange={(n) => { setPersonalPhoneNumber(n); clearErr("personal.phone"); }}
              />
            </Field>
            <p className="text-xs font-semibold text-slate-600 pt-2 border-t border-slate-100">Current Address</p>
            <Field label="Street / Flat No." required error={errors["personal.address.street"]}>
              <input className={iCls(!!errors["personal.address.street"])} value={formData.personal.address.street} onChange={(e) => upAddr("street", e.target.value)} placeholder="123, Street Name" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="State" required error={errors["personal.address.state"]}>
                {formData.personal.address.country === "India" ? (
                  <select
                    className={iCls(!!errors["personal.address.state"])}
                    value={formData.personal.address.state}
                    onChange={(e) => {
                      clearErr("personal.address.state");
                      clearErr("personal.address.city");
                      setFormData((f) => ({
                        ...f,
                        personal: {
                          ...f.personal,
                          address: { ...f.personal.address, state: e.target.value, city: "" },
                        },
                      }));
                    }}
                  >
                    <option value="">Select state</option>
                    {INDIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input className={iCls(!!errors["personal.address.state"])} value={formData.personal.address.state} onChange={(e) => upAddr("state", e.target.value)} placeholder="State / Province" />
                )}
              </Field>
              <Field label="City" required error={errors["personal.address.city"]}>
                {formData.personal.address.country === "India" ? (
                  <select
                    className={iCls(!!errors["personal.address.city"])}
                    value={formData.personal.address.city}
                    onChange={(e) => upAddr("city", e.target.value)}
                    disabled={!formData.personal.address.state}
                  >
                    <option value="">
                      {formData.personal.address.state ? "Select city" : "Select state first"}
                    </option>
                    {(INDIA_CITIES[formData.personal.address.state] ?? []).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <input className={iCls(!!errors["personal.address.city"])} value={formData.personal.address.city} onChange={(e) => upAddr("city", e.target.value)} placeholder="City" />
                )}
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Country" required error={errors["personal.address.country"]}>
                <input
                  className={iCls(!!errors["personal.address.country"])}
                  value={formData.personal.address.country}
                  onChange={(e) => {
                    clearErr("personal.address.country");
                    // Reset state/city if country changes away from India
                    setFormData((f) => ({
                      ...f,
                      personal: {
                        ...f.personal,
                        address: { ...f.personal.address, country: e.target.value, state: "", city: "" },
                      },
                    }));
                  }}
                  placeholder="India"
                />
              </Field>
              <Field label="PIN / Postal Code" required error={errors["personal.address.pincode"]}>
                <input className={iCls(!!errors["personal.address.pincode"])} value={formData.personal.address.pincode} onChange={(e) => upAddr("pincode", e.target.value)} placeholder="400001" maxLength={10} />
              </Field>
            </div>
          </>
        )}

        {/* ── Step 1: Identity ── */}
        {step === 1 && (
          <>
            <Field label="PAN Number" required error={errors["identity.pan"]}>
              <input className={`${iCls(!!errors["identity.pan"])} uppercase`} value={formData.identity.pan} onChange={(e) => { clearErr("identity.pan"); setFormData((f) => ({ ...f, identity: { ...f.identity, pan: e.target.value.toUpperCase() } })); }} placeholder="ABCDE1234F" maxLength={10} />
            </Field>
            <Field label="PAN Card" required error={errors["docs.panCard"]}>
              <DocUpload label="PAN Card" uploaded={!!docs.panCard} uploading={!!uploading.panCard} hasError={!!errors["docs.panCard"]} onSelect={(f) => uploadDoc(f, "pan_card")} onClear={() => setDocs((d) => ({ ...d, panCard: undefined }))} />
            </Field>
            <Field label="Aadhaar Number" required error={errors["identity.aadhaar"]}>
              <input className={iCls(!!errors["identity.aadhaar"])} value={formData.identity.aadhaar} onChange={(e) => { clearErr("identity.aadhaar"); setFormData((f) => ({ ...f, identity: { ...f.identity, aadhaar: e.target.value.replace(/\D/g, "") } })); }} placeholder="123456789012" maxLength={12} />
            </Field>
            <Field label="Aadhaar Card" required error={errors["docs.aadhaarCard"]}>
              <DocUpload label="Aadhaar Card" uploaded={!!docs.aadhaarCard} uploading={!!uploading.aadhaarCard} hasError={!!errors["docs.aadhaarCard"]} onSelect={(f) => uploadDoc(f, "aadhaar_card")} onClear={() => setDocs((d) => ({ ...d, aadhaarCard: undefined }))} />
            </Field>
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Your documents are encrypted before storage. Only HR with authorised access can decrypt them.</span>
            </div>
          </>
        )}

        {/* ── Step 2: Bank ── */}
        {step === 2 && (
          <>
            <Field label="Account Holder Name" required error={errors["bank.accountHolderName"]}>
              <input className={iCls(!!errors["bank.accountHolderName"])} value={formData.bank.accountHolderName} onChange={(e) => up("bank", "accountHolderName", e.target.value)} placeholder="Name as on bank account" />
            </Field>
            <Field label="Account Number" required error={errors["bank.accountNumber"]}>
              <input className={iCls(!!errors["bank.accountNumber"])} value={formData.bank.accountNumber} onChange={(e) => up("bank", "accountNumber", e.target.value.replace(/\D/g, ""))} placeholder="Account number" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bank Name" required error={errors["bank.bankName"]}>
                <input className={iCls(!!errors["bank.bankName"])} value={formData.bank.bankName} onChange={(e) => up("bank", "bankName", e.target.value)} placeholder="e.g. HDFC Bank" />
              </Field>
              <Field label="IFSC Code" required error={errors["bank.ifscCode"]}>
                <input className={`${iCls(!!errors["bank.ifscCode"])} uppercase`} value={formData.bank.ifscCode} onChange={(e) => up("bank", "ifscCode", e.target.value.toUpperCase())} placeholder="HDFC0001234" maxLength={11} />
              </Field>
            </div>
          </>
        )}

        {/* ── Step 3: Emergency Contact ── */}
        {step === 3 && (
          <>
            <Field label="Contact Name" required error={errors["emergency.name"]}>
              <input className={iCls(!!errors["emergency.name"])} value={formData.emergency.name} onChange={(e) => up("emergency", "name", e.target.value)} placeholder="Full name" />
            </Field>
            <Field label="Relation" required error={errors["emergency.relation"]}>
              <select className={iCls(!!errors["emergency.relation"])} value={formData.emergency.relation} onChange={(e) => up("emergency", "relation", e.target.value)}>
                <option value="">Select relation</option>
                <option value="Spouse">Spouse</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Grandfather">Grandfather</option>
                <option value="Grandmother">Grandmother</option>
                <option value="Father-in-law">Father-in-law</option>
                <option value="Mother-in-law">Mother-in-law</option>
                <option value="Uncle">Uncle</option>
                <option value="Aunt">Aunt</option>
                <option value="Friend">Friend</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Phone Number" required error={errors["emergency.phone"]}>
              <PhoneInput
                dialCode={emergencyDialCode}
                number={emergencyPhoneNumber}
                hasError={!!errors["emergency.phone"]}
                onDialCodeChange={(dc) => { setEmergencyDialCode(dc); clearErr("emergency.phone"); }}
                onNumberChange={(n) => { setEmergencyPhoneNumber(n); clearErr("emergency.phone"); }}
              />
            </Field>
          </>
        )}

        {/* ── Step 4: Review ── */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Profile picture preview in review */}
            <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 flex-shrink-0">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-slate-300" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{`${formData.personal.firstName} ${formData.personal.lastName}`.trim() || "—"}</p>
                <p className="text-xs text-slate-500 mt-0.5">{invite?.designation} · {invite?.department?.name}</p>
                <p className={`text-xs mt-1 font-medium ${previewUrl ? "text-emerald-600" : "text-red-500"}`}>
                  {previewUrl ? "Photo uploaded ✓" : "No photo uploaded"}
                </p>
              </div>
            </div>

            <ReviewSection title="Personal Details">
              <ReviewRow label="Name" value={`${formData.personal.firstName} ${formData.personal.lastName}`.trim()} />
              <ReviewRow label="Date of Birth" value={formData.personal.dateOfBirth} />
              <ReviewRow label="Gender" value={formData.personal.gender} capitalize />
              <ReviewRow label="Phone" value={realDialCode(personalDialCode) + personalPhoneNumber} />
              <ReviewRow label="Address" value={[formData.personal.address.street, formData.personal.address.city, formData.personal.address.state, formData.personal.address.country, formData.personal.address.pincode].filter(Boolean).join(", ")} />
            </ReviewSection>
            <ReviewSection title="Identity Documents">
              <ReviewRow label="PAN" value={formData.identity.pan} mono />
              <ReviewRow label="PAN Card PDF" value={docs.panCard ? "Uploaded ✓" : "—"} />
              <ReviewRow label="Aadhaar" value={formData.identity.aadhaar} mono />
              <ReviewRow label="Aadhaar Card PDF" value={docs.aadhaarCard ? "Uploaded ✓" : "—"} />
            </ReviewSection>
            <ReviewSection title="Bank Details">
              <ReviewRow label="Account Holder" value={formData.bank.accountHolderName} />
              <ReviewRow label="Account Number" value={formData.bank.accountNumber} mono />
              <ReviewRow label="Bank" value={formData.bank.bankName} />
              <ReviewRow label="IFSC" value={formData.bank.ifscCode} mono />
            </ReviewSection>
            <ReviewSection title="Emergency Contact">
              <ReviewRow label="Name" value={formData.emergency.name} />
              <ReviewRow label="Relation" value={formData.emergency.relation} />
              <ReviewRow label="Phone" value={realDialCode(emergencyDialCode) + emergencyPhoneNumber} />
            </ReviewSection>
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Once submitted, you will not be able to edit this form. Please review all details carefully.</span>
            </div>
          </div>
        )}
      </div>

      {/* Crop modal */}
      {cropFile && (
        <CropModal
          file={cropFile}
          onDone={(blob, dataUrl) => { setCropFile(null); uploadCroppedBlob(blob, dataUrl); }}
          onCancel={() => setCropFile(null)}
        />
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button onClick={prev} disabled={saving} className="flex items-center gap-1.5 px-5 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        <div className="flex-1" />
        {step < STEPS.length - 1 ? (
          <button onClick={next} disabled={saving} className="flex items-center gap-1.5 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save & Continue <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={() => save(true)} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60 shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Submit Onboarding Form
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Shared style helpers ─────────────────────────────────────────────────────
const iCls = (err: boolean) =>
  `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 bg-white transition-colors ${
    err ? "border-red-400 focus:ring-red-400 bg-red-50" : "border-slate-200 focus:ring-blue-500"
  }`;

// ─── Sub-components ───────────────────────────────────────────────────────────
function PhoneInput({
  dialCode, number, hasError, onDialCodeChange, onNumberChange,
}: {
  dialCode: string;
  number: string;
  hasError: boolean;
  onDialCodeChange: (dc: string) => void;
  onNumberChange: (n: string) => void;
}) {
  const selected = COUNTRIES.find((c) => c.dialCode === dialCode) ?? COUNTRIES[0];
  const borderCls = hasError ? "border-red-400" : "border-slate-200";
  const focusCls  = hasError ? "focus:ring-red-400" : "focus:ring-blue-500";
  const bgCls     = hasError ? "bg-red-50" : "bg-white";

  return (
    <div className={`flex rounded-lg border overflow-hidden ${borderCls} ${bgCls}`}>
      {/* Country code selector */}
      <div className="relative flex-shrink-0">
        <select
          value={dialCode}
          onChange={(e) => onDialCodeChange(e.target.value)}
          className={`appearance-none h-full pl-3 pr-8 text-sm font-medium border-r ${borderCls} ${bgCls} focus:outline-none focus:ring-2 ${focusCls} cursor-pointer`}
        >
          {COUNTRIES.map((c) => (
            <option key={c.dialCode} value={c.dialCode}>
              {c.flag} {realDialCode(c.dialCode)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
      </div>
      {/* Country name badge */}
      <div className={`hidden sm:flex items-center px-2 border-r ${borderCls} text-xs text-slate-500 font-medium whitespace-nowrap ${bgCls}`}>
        {selected.name}
      </div>
      {/* Number input */}
      <input
        type="tel"
        inputMode="numeric"
        className={`flex-1 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${focusCls} ${bgCls}`}
        value={number}
        onChange={(e) => onNumberChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
        placeholder="98765 43210"
        maxLength={10}
      />
    </div>
  );
}

function Field({ label, children, required, error, hint }: { label: string; children: React.ReactNode; required?: boolean; error?: string; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function InfoChip({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-semibold text-slate-900 mt-0.5 ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value, mono, capitalize }: { label: string; value?: string; mono?: boolean; capitalize?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-slate-500 flex-shrink-0">{label}</span>
      <span className={`text-xs font-medium text-slate-900 text-right ${mono ? "font-mono" : ""} ${capitalize ? "capitalize" : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}

// ─── Crop Modal ───────────────────────────────────────────────────────────────
const CROP_SIZE = 280; // display size of the crop square
const CROP_OUT  = 400; // output canvas resolution

function CropModal({
  file,
  onDone,
  onCancel,
}: {
  file: File;
  onDone: (blob: Blob, dataUrl: string) => void;
  onCancel: () => void;
}) {
  const [imgSrc, setImgSrc] = useState("");
  const [natSize, setNatSize] = useState({ w: 1, h: 1 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNatSize({ w, h });
    // Initial scale: cover the crop area
    const initScale = Math.max(CROP_SIZE / w, CROP_SIZE / h);
    setScale(initScale);
    setOffset({ x: 0, y: 0 });
  };

  // Pointer drag
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.ox + (e.clientX - dragRef.current.startX),
      y: dragRef.current.oy + (e.clientY - dragRef.current.startY),
    });
  };
  const onPointerUp = () => { dragRef.current = null; };

  const applyCrop = () => {
    const canvas = document.createElement("canvas");
    canvas.width = CROP_OUT;
    canvas.height = CROP_OUT;
    const ctx = canvas.getContext("2d")!;

    // Circular clip
    ctx.beginPath();
    ctx.arc(CROP_OUT / 2, CROP_OUT / 2, CROP_OUT / 2, 0, Math.PI * 2);
    ctx.clip();

    // Rendered dimensions in the display
    const dispW = natSize.w * scale;
    const dispH = natSize.h * scale;
    // Top-left of image in the display container
    const imgLeft = (CROP_SIZE - dispW) / 2 + offset.x;
    const imgTop  = (CROP_SIZE - dispH) / 2 + offset.y;
    // Scale to canvas output
    const factor = CROP_OUT / CROP_SIZE;

    ctx.drawImage(
      imgRef.current!,
      imgLeft * factor,
      imgTop  * factor,
      dispW   * factor,
      dispH   * factor
    );

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    canvas.toBlob((blob) => { if (blob) onDone(blob, dataUrl); }, "image/jpeg", 0.92);
  };

  const minScale = Math.max(CROP_SIZE / (natSize.w || 1), CROP_SIZE / (natSize.h || 1));

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Crop Photo</h3>
          <p className="text-xs text-slate-500 mt-0.5">Drag to reposition · use slider to zoom</p>
        </div>

        {/* Crop area */}
        <div className="relative mx-auto" style={{ width: CROP_SIZE, height: CROP_SIZE }}>
          <div
            className="absolute inset-0 overflow-hidden bg-slate-900 rounded-xl"
            style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {imgSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={imgSrc}
                alt="Crop"
                onLoad={onImgLoad}
                draggable={false}
                style={{
                  position: "absolute",
                  left: `${(CROP_SIZE - natSize.w * scale) / 2 + offset.x}px`,
                  top:  `${(CROP_SIZE - natSize.h * scale) / 2 + offset.y}px`,
                  width:  `${natSize.w * scale}px`,
                  height: `${natSize.h * scale}px`,
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
          {/* Circular mask overlay — dark outside the circle */}
          <div
            className="absolute inset-0 pointer-events-none rounded-xl"
            style={{
              background: `radial-gradient(circle ${CROP_SIZE / 2}px at 50% 50%, transparent ${CROP_SIZE / 2 - 1}px, rgba(0,0,0,0.55) ${CROP_SIZE / 2}px)`,
            }}
          />
          {/* Circle border indicator */}
          <div
            className="absolute pointer-events-none rounded-full border-2 border-white/60"
            style={{
              width: CROP_SIZE,
              height: CROP_SIZE,
              top: 0,
              left: 0,
              borderRadius: "50%",
            }}
          />
        </div>

        {/* Zoom slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-600">Zoom</span>
            <span className="text-xs text-slate-400">{(scale / minScale).toFixed(1)}×</span>
          </div>
          <input
            type="range"
            min={minScale}
            max={minScale * 4}
            step={minScale * 0.02}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={applyCrop}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}

function DocUpload({ label, uploaded, uploading, hasError, onSelect, onClear }: {
  label: string; uploaded: boolean;
  uploading: boolean; hasError: boolean; onSelect: (f: File) => void; onClear: () => void;
}) {
  const fileRef   = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview]           = useState<string | null>(null);
  const [qualityWarnings, setWarnings]  = useState<string[]>([]);
  const [checkingQuality, setChecking]  = useState(false);

  // Clear preview when parent marks as uploaded or cleared
  useEffect(() => {
    if (uploaded) { setPreview(null); setWarnings([]); }
  }, [uploaded]);

  const handleFile = async (file: File) => {
    setWarnings([]);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      setChecking(true);
      const warnings = await checkImageQuality(file);
      setChecking(false);
      setWarnings(warnings);
    } else {
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
    }
    onSelect(file);
  };

  const clearAll = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setWarnings([]);
    onClear();
  };

  if (uploaded) {
    return (
      <div className="flex items-center justify-between border border-emerald-200 bg-emerald-50 rounded-xl px-3 py-2.5">
        <div className="flex items-center gap-2 text-emerald-700 text-sm">
          <FileCheck className="w-4 h-4" />
          <span className="font-medium">{label} uploaded &amp; encrypted</span>
        </div>
        <button onClick={clearAll} className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Upload zone */}
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className={`flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-all ${
          hasError ? "border-red-400 bg-red-50" : "border-slate-200 hover:border-blue-300 hover:bg-blue-50"
        }`}
      >
        {uploading
          ? <Loader2 className="w-5 h-5 animate-spin text-blue-500 flex-shrink-0" />
          : <UploadCloud className={`w-5 h-5 flex-shrink-0 ${hasError ? "text-red-400" : "text-slate-400"}`} />}
        <div className="min-w-0">
          <p className={`text-sm font-medium ${hasError ? "text-red-500" : "text-slate-600"}`}>
            {uploading ? "Uploading & encrypting…" : `Upload ${label}`}
          </p>
          {!uploading && (
            <p className={`text-xs mt-0.5 ${hasError ? "text-red-400" : "text-slate-400"}`}>
              PDF, PNG or JPG · max 5 MB
            </p>
          )}
        </div>
      </div>

      {/* Camera button — opens rear camera on mobile, file picker on desktop */}
      {!uploading && (
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all"
        >
          <Camera className="w-4 h-4" />
          Take Photo with Camera
        </button>
      )}

      {/* Hidden inputs */}
      <input
        ref={fileRef} type="file"
        accept="application/pdf,image/jpeg,image/jpg,image/png,.pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      {/* capture="environment" opens rear camera on mobile devices */}
      <input
        ref={cameraRef} type="file"
        accept="image/*" capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />

      {/* Image preview */}
      {preview && (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Document preview" className="w-full max-h-48 object-contain" />
          <button
            type="button" onClick={clearAll}
            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow text-slate-400 hover:text-red-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quality checking spinner */}
      {checkingQuality && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          Checking image quality…
        </div>
      )}

      {/* Quality warnings — shown as amber alerts, don't block upload */}
      {qualityWarnings.map((w, i) => (
        <div key={i} className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {w}
        </div>
      ))}

      {/* Good quality indicator */}
      {preview && !checkingQuality && qualityWarnings.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
          Image quality looks good
        </div>
      )}
    </div>
  );
}
