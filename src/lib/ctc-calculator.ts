/**
 * CRM → In-Hand Salary Calculator
 * New Tax Regime — FY 2025-26 (Budget 2025, effective April 2025)
 *
 * Formula:
 *   Basic          = 50% of Gross (monthly)
 *   HRA            = 50% of Basic (Metro) / 40% of Basic (Non-Metro)
 *   Other Allow.   = Gross − Basic − HRA
 *   Employee PF    = same as Employer PF (mirror)
 *   Employer PF    = fixed ₹/mo  OR  percent% of Basic (capped at ₹15k ceiling)  OR  none
 *   Gratuity       = Basic × 15/312  per month  (optional)
 *   CRM (CTC)      = Gross + Employer PF Annual + Gratuity Annual
 *
 * Tax Slabs (New Regime FY 2025-26):
 *   0–4L→0% | 4–8L→5% | 8–12L→10% | 12–16L→15% | 16–20L→20% | 20–24L→25% | >24L→30%
 *
 * Standard Deduction : ₹75,000
 * Section 87A Rebate : full rebate if taxable income ≤ ₹12,00,000
 * Health & Ed. Cess  : 4%
 */

export type PFType = "none" | "fixed" | "percent";

export interface PFConfig {
  type: PFType;
  fixedMonthly?: number; // used when type === "fixed"
  pct?: number;          // used when type === "percent"
}

export interface CRMBreakdown {
  // Inputs
  crmAnnual: number;
  isMetro: boolean;
  pfConfig: PFConfig;
  includeGratuity: boolean;

  // Annual figures
  grossAnnual: number;
  basicAnnual: number;
  hraAnnual: number;
  otherAllowancesAnnual: number;
  employeePFAnnual: number;
  employerPFAnnual: number;
  gratuityAnnual: number;

  // Monthly figures
  grossMonthly: number;
  basicMonthly: number;
  hraMonthly: number;
  otherAllowancesMonthly: number;
  employeePFMonthly: number;
  employerPFMonthly: number;
  gratuityMonthly: number;

  // PF label for display
  pfLabel: string;

  // Tax
  standardDeduction: number;
  taxableIncome: number;
  annualTax: number;
  monthlyTDS: number;
  effectiveTaxRate: number;
  taxSlab: string;

  // In-hand
  totalDeductionsMonthly: number;
  inHandMonthly: number;
  inHandAnnual: number;
  takeHomePct: number;
}

const PF_WAGE_CEILING = 15_000;

function calcNewRegimeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;

  const slabs = [
    { from: 0,         to: 400_000,   rate: 0.00 },
    { from: 400_000,   to: 800_000,   rate: 0.05 },
    { from: 800_000,   to: 1_200_000, rate: 0.10 },
    { from: 1_200_000, to: 1_600_000, rate: 0.15 },
    { from: 1_600_000, to: 2_000_000, rate: 0.20 },
    { from: 2_000_000, to: 2_400_000, rate: 0.25 },
    { from: 2_400_000, to: Infinity,  rate: 0.30 },
  ];

  let tax = 0;
  for (const slab of slabs) {
    if (taxableIncome <= slab.from) break;
    tax += (Math.min(taxableIncome, slab.to) - slab.from) * slab.rate;
  }

  if (taxableIncome <= 1_200_000) return 0; // Section 87A rebate

  let surcharge = 0;
  if      (taxableIncome > 5_000_000  && taxableIncome <= 10_000_000) surcharge = tax * 0.10;
  else if (taxableIncome > 10_000_000 && taxableIncome <= 20_000_000) surcharge = tax * 0.15;
  else if (taxableIncome > 20_000_000)                                 surcharge = tax * 0.25;

  return Math.round((tax + surcharge) * 1.04);
}

function getTaxSlabLabel(taxableIncome: number): string {
  if (taxableIncome <= 400_000)   return "Nil (0%)";
  if (taxableIncome <= 800_000)   return "5%";
  if (taxableIncome <= 1_200_000) return "10% (87A rebate applies)";
  if (taxableIncome <= 1_600_000) return "15%";
  if (taxableIncome <= 2_000_000) return "20%";
  if (taxableIncome <= 2_400_000) return "25%";
  return "30%";
}

// Employer PF monthly given basic monthly
function calcEmployerPF(basicMonthly: number, pf: PFConfig): number {
  switch (pf.type) {
    case "none":    return 0;
    case "fixed":   return Math.round(pf.fixedMonthly ?? 0);
    case "percent": {
      const rate = Math.max(0, Math.min(pf.pct ?? 12, 100)) / 100;
      return Math.round(Math.min(basicMonthly, PF_WAGE_CEILING) * rate);
    }
  }
}

function getPFLabel(pf: PFConfig): string {
  switch (pf.type) {
    case "none":    return "No PF";
    case "fixed":   return `Fixed ₹${(pf.fixedMonthly ?? 0).toLocaleString("en-IN")}/mo`;
    case "percent": return `${pf.pct ?? 12}% of Basic (capped at ₹15k)`;
  }
}

// Derive annual gross from CRM
// CRM = Gross + EmployerPF_annual + Gratuity_annual
function deriveGross(crmAnnual: number, pf: PFConfig, gratuity: boolean): number {
  const gratuityFactor = gratuity ? 15 / 624 : 0; // Gross × 15/624

  if (pf.type === "none") {
    return Math.round(crmAnnual / (1 + gratuityFactor));
  }

  if (pf.type === "fixed") {
    const fixedPFAnnual = (pf.fixedMonthly ?? 0) * 12;
    return Math.round((crmAnnual - fixedPFAnnual) / (1 + gratuityFactor));
  }

  // percent — need to handle wage ceiling
  const rate = Math.max(0, Math.min(pf.pct ?? 12, 100)) / 100;
  const GROSS_THRESHOLD = 360_000; // Basic = 15,000/mo when Gross = 360,000/yr
  const cappedPFAnnual  = PF_WAGE_CEILING * rate * 12;

  // Try capped formula: CRM = Gross × (1 + gratuityFactor) + cappedPFAnnual
  const grossCapped = (crmAnnual - cappedPFAnnual) / (1 + gratuityFactor);
  if (grossCapped >= GROSS_THRESHOLD) {
    return Math.round(grossCapped);
  }

  // Basic below ceiling: PF = rate × 50% of Gross
  return Math.round(crmAnnual / (1 + rate * 0.5 + gratuityFactor));
}

export function calculateCRM(
  crmAnnual: number,
  isMetro = true,
  pfConfig: PFConfig = { type: "percent", pct: 12 },
  includeGratuity = true,
): CRMBreakdown | null {
  if (!crmAnnual || crmAnnual < 60_000) return null;

  // ── Gross ────────────────────────────────────────────────────
  const grossAnnual  = deriveGross(crmAnnual, pfConfig, includeGratuity);
  const grossMonthly = Math.round(grossAnnual / 12);

  // ── Salary components ────────────────────────────────────────
  const basicMonthly           = Math.round(grossMonthly * 0.50);
  const hraMonthly             = Math.round(basicMonthly * (isMetro ? 0.50 : 0.40));
  const otherAllowancesMonthly = Math.max(0, grossMonthly - basicMonthly - hraMonthly);

  const basicAnnual           = basicMonthly * 12;
  const hraAnnual             = hraMonthly * 12;
  const otherAllowancesAnnual = otherAllowancesMonthly * 12;

  // ── PF ───────────────────────────────────────────────────────
  const employerPFMonthly = calcEmployerPF(basicMonthly, pfConfig);
  const employeePFMonthly = employerPFMonthly; // employee mirrors employer
  const employerPFAnnual  = employerPFMonthly * 12;
  const employeePFAnnual  = employeePFMonthly * 12;

  // ── Gratuity (optional) ───────────────────────────────────────
  const gratuityMonthly = includeGratuity ? Math.round(basicMonthly * 15 / 312) : 0;
  const gratuityAnnual  = gratuityMonthly * 12;

  // ── Income Tax ───────────────────────────────────────────────
  const standardDeduction = 75_000;
  const taxableIncome     = Math.max(0, grossAnnual - standardDeduction);
  const annualTax         = calcNewRegimeTax(taxableIncome);
  const monthlyTDS        = Math.round(annualTax / 12);

  // ── In-hand ──────────────────────────────────────────────────
  // Only employee-side deductions come out of take-home.
  // Employer PF and Gratuity are employer costs included in CRM, not deducted from gross.
  const totalDeductionsMonthly = employeePFMonthly + monthlyTDS;
  const inHandMonthly          = Math.round(grossMonthly - totalDeductionsMonthly);
  const inHandAnnual           = inHandMonthly * 12;

  const effectiveTaxRate = grossAnnual > 0
    ? parseFloat(((annualTax / grossAnnual) * 100).toFixed(1)) : 0;
  const takeHomePct = crmAnnual > 0
    ? parseFloat(((inHandAnnual / crmAnnual) * 100).toFixed(1)) : 0;

  return {
    crmAnnual,
    isMetro,
    pfConfig,
    includeGratuity,
    grossAnnual,
    basicAnnual,
    hraAnnual,
    otherAllowancesAnnual,
    employeePFAnnual,
    employerPFAnnual,
    gratuityAnnual,
    grossMonthly,
    basicMonthly,
    hraMonthly,
    otherAllowancesMonthly,
    employeePFMonthly,
    employerPFMonthly,
    gratuityMonthly,
    pfLabel: getPFLabel(pfConfig),
    standardDeduction,
    taxableIncome,
    annualTax,
    monthlyTDS,
    effectiveTaxRate,
    taxSlab: getTaxSlabLabel(taxableIncome),
    totalDeductionsMonthly,
    inHandMonthly,
    inHandAnnual,
    takeHomePct,
  };
}

// Backward-compat aliases
export { calculateCRM as calculateCTC };
export type { CRMBreakdown as CTCBreakdown };

export function fmt(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(n);
}
