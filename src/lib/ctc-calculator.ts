/**
 * CTC → In-Hand Salary Calculator
 * New Tax Regime — FY 2025-26 (Budget 2025, effective April 2025)
 *
 * Slabs (new regime):
 *   0 – 4 L      → 0%
 *   4 L – 8 L    → 5%
 *   8 L – 12 L   → 10%
 *  12 L – 16 L   → 15%
 *  16 L – 20 L   → 20%
 *  20 L – 24 L   → 25%
 *  > 24 L        → 30%
 *
 * Standard Deduction   : ₹75,000 (new regime, salaried)
 * Section 87A Rebate   : Full rebate if taxable income ≤ ₹12,00,000 (rebate ≤ ₹60,000)
 * Health & Ed. Cess    : 4% on final income tax
 * Surcharge            : 10% (50L–1Cr), 15% (1Cr–2Cr), 25% (2Cr+) under new regime
 *
 * PF: Employee 12% of Basic; Employer 12% of Basic (part of CTC)
 * Gratuity: 4.81% of Basic (employer cost, part of CTC)
 * ESI: Employee 0.75% of Gross if Gross ≤ ₹21,000/month
 * Professional Tax: ₹200/month (₹2,400/year) — standard across most states
 */

export interface CTCBreakdown {
  // Inputs
  ctcAnnual: number;
  isMetro: boolean;

  // Gross
  grossAnnual: number;
  grossMonthly: number;

  // Salary components (monthly)
  basicMonthly: number;
  hraMonthly: number;
  specialAllowanceMonthly: number;

  // Employer costs (in CTC, NOT received by employee)
  employerPFMonthly: number;
  employerPFAnnual: number;
  gratuityMonthly: number;
  gratuityAnnual: number;

  // Employee deductions (monthly)
  employeePFMonthly: number;
  esiMonthly: number;
  professionalTaxMonthly: number;
  monthlyTDS: number;
  totalDeductionsMonthly: number;

  // In-hand
  inHandMonthly: number;
  inHandAnnual: number;

  // Tax details
  standardDeduction: number;
  taxableIncome: number;
  annualTax: number;
  effectiveTaxRate: number;
  taxSlab: string;

  // Summary percentages
  takeHomePct: number;
}

function calcNewRegimeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  const slabs = [
    { from: 0,        to: 400_000,   rate: 0.00 },
    { from: 400_000,  to: 800_000,   rate: 0.05 },
    { from: 800_000,  to: 1_200_000, rate: 0.10 },
    { from: 1_200_000,to: 1_600_000, rate: 0.15 },
    { from: 1_600_000,to: 2_000_000, rate: 0.20 },
    { from: 2_000_000,to: 2_400_000, rate: 0.25 },
    { from: 2_400_000,to: Infinity,  rate: 0.30 },
  ];

  for (const slab of slabs) {
    if (taxableIncome <= slab.from) break;
    const taxable = Math.min(taxableIncome, slab.to) - slab.from;
    tax += taxable * slab.rate;
  }

  // Section 87A rebate: if taxable income ≤ ₹12,00,000 → full rebate (tax = 0)
  if (taxableIncome <= 1_200_000) {
    tax = 0;
    return 0;
  }

  // Surcharge (new regime — capped at 25%)
  let surcharge = 0;
  if (taxableIncome > 5_000_000 && taxableIncome <= 10_000_000) surcharge = tax * 0.10;
  else if (taxableIncome > 10_000_000 && taxableIncome <= 20_000_000) surcharge = tax * 0.15;
  else if (taxableIncome > 20_000_000) surcharge = tax * 0.25;

  tax += surcharge;

  // Health & Education Cess: 4%
  tax = Math.round(tax * 1.04);

  return Math.round(tax);
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

export function calculateCTC(ctcAnnual: number, isMetro = true): CTCBreakdown | null {
  if (!ctcAnnual || ctcAnnual < 60_000) return null;

  // ── Derive Gross from CTC ────────────────────────────────
  // CTC = Gross + Employer PF (12% of Basic) + Gratuity (4.81% of Basic)
  // Basic = 40% of Gross  →  Employer extras = (16.81% × 40%) of Gross = 6.724% of Gross
  // CTC = Gross × 1.06724
  const grossAnnual  = Math.round(ctcAnnual / 1.06724);
  const grossMonthly = Math.round(grossAnnual / 12);

  // ── Salary components (monthly) ─────────────────────────
  const basicMonthly          = Math.round(grossMonthly * 0.40);
  const hraMonthly            = Math.round(basicMonthly * (isMetro ? 0.50 : 0.40));
  const specialAllowanceMonthly = Math.max(0, grossMonthly - basicMonthly - hraMonthly);

  // ── Employer costs (in CTC, NOT taken home) ─────────────
  const employerPFMonthly  = Math.round(basicMonthly * 0.12);
  const employerPFAnnual   = employerPFMonthly * 12;
  const gratuityMonthly    = Math.round(basicMonthly * 0.0481);
  const gratuityAnnual     = gratuityMonthly * 12;

  // ── Employee deductions ──────────────────────────────────
  const employeePFMonthly      = Math.round(basicMonthly * 0.12);
  const esiMonthly             = grossMonthly <= 21_000 ? Math.round(grossMonthly * 0.0075) : 0;
  const professionalTaxMonthly = 200; // ₹200/month — most states

  // ── Income tax (new regime 2026) ─────────────────────────
  const standardDeduction = 75_000;
  const taxableIncome     = Math.max(0, grossAnnual - standardDeduction);
  const annualTax         = calcNewRegimeTax(taxableIncome);
  const monthlyTDS        = Math.round(annualTax / 12);

  // ── In-hand ──────────────────────────────────────────────
  const totalDeductionsMonthly =
    employeePFMonthly + esiMonthly + professionalTaxMonthly + monthlyTDS;
  const inHandMonthly = Math.round(grossMonthly - totalDeductionsMonthly);
  const inHandAnnual  = inHandMonthly * 12;

  const effectiveTaxRate =
    grossAnnual > 0 ? parseFloat(((annualTax / grossAnnual) * 100).toFixed(1)) : 0;
  const takeHomePct =
    ctcAnnual > 0 ? parseFloat(((inHandAnnual / ctcAnnual) * 100).toFixed(1)) : 0;

  return {
    ctcAnnual,
    isMetro,
    grossAnnual,
    grossMonthly,
    basicMonthly,
    hraMonthly,
    specialAllowanceMonthly,
    employerPFMonthly,
    employerPFAnnual,
    gratuityMonthly,
    gratuityAnnual,
    employeePFMonthly,
    esiMonthly,
    professionalTaxMonthly,
    monthlyTDS,
    totalDeductionsMonthly,
    inHandMonthly,
    inHandAnnual,
    standardDeduction,
    taxableIncome,
    annualTax,
    effectiveTaxRate,
    taxSlab: getTaxSlabLabel(taxableIncome),
    takeHomePct,
  };
}

export function fmt(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(n);
}
