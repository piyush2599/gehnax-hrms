export const STAGES = [
  { id: "new",         label: "New Lead",      prob: 10  },
  { id: "contacted",   label: "Contacted",     prob: 20  },
  { id: "qualified",   label: "Qualified",     prob: 40  },
  { id: "proposal",    label: "Proposal Sent", prob: 60  },
  { id: "negotiation", label: "Negotiation",   prob: 80  },
  { id: "won",         label: "Won",           prob: 100 },
  { id: "lost",        label: "Lost",          prob: 0   },
] as const;

export type StageId = typeof STAGES[number]["id"];

export const STAGE_PROBABILITY: Record<string, number> = {
  new: 10, contacted: 20, qualified: 40,
  proposal: 60, negotiation: 80, won: 100, lost: 0,
};

// Active-stage hues (sky → fuchsia) are kept clear of amber/red so they never
// blend with the amber "high" / red "urgent" priority badges shown on cards.
export const STAGE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string; colBg: string }> = {
  new:         { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200",     dot: "bg-sky-500",     colBg: "bg-sky-50/60"     },
  contacted:   { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-500",    colBg: "bg-blue-50/60"    },
  qualified:   { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200",  dot: "bg-indigo-500",  colBg: "bg-indigo-50/60"  },
  proposal:    { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  dot: "bg-violet-500",  colBg: "bg-violet-50/60"  },
  negotiation: { bg: "bg-fuchsia-50", text: "text-fuchsia-700", border: "border-fuchsia-200", dot: "bg-fuchsia-500", colBg: "bg-fuchsia-50/60" },
  won:         { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", colBg: "bg-emerald-50/60" },
  lost:        { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     dot: "bg-red-400",     colBg: "bg-red-50/60"     },
};

export const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
  low:    { bg: "bg-slate-100",  text: "text-slate-600"  },
  medium: { bg: "bg-blue-100",   text: "text-blue-700"   },
  high:   { bg: "bg-amber-100",  text: "text-amber-700"  },
  urgent: { bg: "bg-red-100",    text: "text-red-700"    },
};

export const SOURCE_LABELS: Record<string, string> = {
  cold_call:      "Cold Call",
  referral:       "Referral",
  website:        "Website",
  linkedin:       "LinkedIn",
  email_campaign: "Email Campaign",
  event:          "Event",
  partner:        "Partner",
  inbound:        "Inbound",
  other:          "Other",
};

export const fmt = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

// Compact Lakh/Crore notation for tight spaces (stat cards, kanban cards/columns).
// Falls back to fmt() for values under ₹1,00,000.
export const fmtCompact = (n: number) => {
  const abs = Math.abs(n);
  const round = (v: number) => Number(v.toFixed(2)).toString();
  if (abs >= 1e7) return "₹" + round(n / 1e7) + "Cr";
  if (abs >= 1e5) return "₹" + round(n / 1e5) + "L";
  return fmt(n);
};

export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const fmtShortDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
