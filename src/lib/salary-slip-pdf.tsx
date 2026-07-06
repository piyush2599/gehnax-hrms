import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { GEHNAX_LOGO } from "./gehnax-logo-b64";

export interface SalarySlipData {
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  month: number;
  year: number;
  payPeriod: string;
  presentDays: number;
  workingDays: number;   // total calendar days in the month (divisor)
  payableDays: number;   // paid days = join/exit window − LOP days
  lopDays: number;       // approved Unpaid-leave days (Loss of Pay)
  leaveDays: number;
  earnings: {
    basic: number;
    hra: number;
    allowances: number;
    overtime: number;
    bonus: number;
    arrears: number;
  };
  deductions: {
    pf: number;
    esi: number;
    tax: number;
    advance: number;
    other: number;
  };
  // Employer-borne CTC components (Part B). Optional for legacy records.
  employerContributions?: {
    pf: number;
    gratuity: number;
  };
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  generatedDate: string;
  // Employee profile extras
  joiningDate?: string;
  bankName?: string;
  bankAccount?: string;
  bankIFSC?: string;
  paymentMode?: string;
}

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmt(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.round(n));
}

function numberToWords(amount: number): string {
  if (amount <= 0) return "Zero Rupees Only";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function convert(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "") + " ";
    return ones[Math.floor(n / 100)] + " Hundred " + convert(n % 100);
  }
  const n = Math.round(amount);
  let r = "";
  if (n >= 10_000_000) r += convert(Math.floor(n / 10_000_000)) + "Crore ";
  if (n % 10_000_000 >= 100_000) r += convert(Math.floor((n % 10_000_000) / 100_000)) + "Lakh ";
  if (n % 100_000 >= 1_000) r += convert(Math.floor((n % 100_000) / 1_000)) + "Thousand ";
  r += convert(n % 1_000);
  return r.trim() + " Rupees Only";
}

const DARK  = "#111827";
const GRAY  = "#6b7280";
const LINE  = "#d1d5db";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK,
    backgroundColor: "#ffffff",
    paddingHorizontal: 42,
    paddingTop: 36,
    paddingBottom: 50,
  },

  // ── Header ───────────────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  titleBlock: { flexDirection: "column" },
  titleLine: { flexDirection: "row", alignItems: "baseline" },
  titlePayslip: { fontSize: 22, fontFamily: "Helvetica-Bold", color: DARK, letterSpacing: 0.5 },
  titleMonth:   { fontSize: 22, fontFamily: "Helvetica",      color: DARK, letterSpacing: 0.5, marginLeft: 6 },
  coName:    { fontSize: 9,  fontFamily: "Helvetica-Bold", color: DARK, marginTop: 4 },
  coAddress: { fontSize: 7.5, color: GRAY, marginTop: 2, lineHeight: 1.4 },
  coNameRight: { fontSize: 11, fontFamily: "Helvetica-Bold", color: DARK, textAlign: "right" },
  logo: { width: 120, height: 40, objectFit: "contain" },

  // ── Dividers ─────────────────────────────────────────────────
  hr: {
    borderTopWidth: 0.75,
    borderTopColor: LINE,
    borderTopStyle: "solid",
    marginVertical: 8,
  },
  hrBold: {
    borderTopWidth: 1.25,
    borderTopColor: DARK,
    borderTopStyle: "solid",
    marginVertical: 8,
  },

  // ── Employee name ────────────────────────────────────────────
  empName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginTop: 6,
    marginBottom: 6,
  },

  // ── Employee detail grid ─────────────────────────────────────
  detailRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 7, color: GRAY, marginBottom: 2 },
  detailValue: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: DARK },

  // ── Section heading ──────────────────────────────────────────
  sectionHead: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    letterSpacing: 0.3,
    marginBottom: 6,
  },

  // ── Attendance row ───────────────────────────────────────────
  attRow: { flexDirection: "row", marginVertical: 6 },
  attItem: { flex: 1 },
  attLabel: { fontSize: 7, color: GRAY, marginBottom: 2 },
  attValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK },

  // ── Two-column salary ────────────────────────────────────────
  twoCol:  { flexDirection: "row", gap: 18, marginTop: 10 },
  leftCol: { flex: 1, flexDirection: "column" },
  rightCol:{ flex: 1, flexDirection: "column" },

  subHead: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 4,
  },
  subHeadSpaced: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 4,
    marginTop: 10,
  },

  salRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3.5,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
    borderBottomStyle: "solid",
  },
  salLabel: { fontSize: 8.5, color: DARK },
  salAmt:   { fontSize: 8.5, color: DARK, textAlign: "right" },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: DARK,
    borderTopStyle: "solid",
    marginTop: 4,
  },
  totalLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: DARK },
  totalAmt:   { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: DARK, textAlign: "right" },

  spacer: { flexGrow: 1 },

  // ── Net pay ──────────────────────────────────────────────────
  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  netLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK },
  netAmt:   { fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK },

  wordsRow: {
    flexDirection: "row",
    marginBottom: 6,
    paddingVertical: 2,
  },
  wordsLabel: { fontSize: 8.5, color: DARK, marginRight: 6 },
  wordsValue: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: DARK, flex: 1 },

  noteText: { fontSize: 7.5, color: DARK, marginTop: 4 },

  // ── Footer ───────────────────────────────────────────────────
  footerNote: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Oblique",
    color: DARK,
    marginTop: 10,
  },
  confidential: {
    fontSize: 8,
    fontFamily: "Helvetica-BoldOblique",
    color: DARK,
    marginTop: 3,
  },
});

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailItem}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value || "—"}</Text>
    </View>
  );
}

function SalRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.salRow}>
      <Text style={s.salLabel}>{label}</Text>
      <Text style={s.salAmt}>{fmt(value)}</Text>
    </View>
  );
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.totalRow}>
      <Text style={s.totalLabel}>{label}</Text>
      <Text style={s.totalAmt}>{fmt(value)}</Text>
    </View>
  );
}

function SalarySlipPDF({ data }: { data: SalarySlipData }) {
  const monthName   = MONTH_NAMES[data.month] || "";
  // LOP is the approved Unpaid-leave days computed at payroll run — the SAME figure
  // that reduced pay. Weekends/holidays are paid and never counted as LOP.
  const lopDays     = data.lopDays ?? 0;
  const daysPayable = data.payableDays;

  // Earnings breakdown
  const earnRows: { label: string; value: number }[] = [
    { label: "Basic",              value: data.earnings.basic },
    { label: "House Rent Allowance (HRA)", value: data.earnings.hra },
    { label: "Allowances",        value: data.earnings.allowances },
    { label: "Overtime Pay",      value: data.earnings.overtime },
    { label: "Bonus",             value: data.earnings.bonus },
    { label: "Arrears",           value: data.earnings.arrears },
  ].filter(r => r.value > 0);

  // Benefits & Contributions (Part B) — employer cost, part of CTC, NOT deducted.
  const benefitRows: { label: string; value: number }[] = [
    { label: "PF – Employer",  value: data.employerContributions?.pf ?? 0 },
    { label: "Gratuity",       value: data.employerContributions?.gratuity ?? 0 },
  ].filter(r => r.value > 0);
  const subTotalB = benefitRows.reduce((s, r) => s + r.value, 0);
  const ctcTotal  = data.grossPay + subTotalB;   // Total (A + B)

  // Deductions (Part D): employee PF + ESI + TDS + Advance + Other
  const dedRows: { label: string; value: number }[] = [
    { label: "PF Employee",          value: data.deductions.pf },
    { label: "ESI",                  value: data.deductions.esi },
    { label: "Total Income Tax",     value: data.deductions.tax },
    { label: "Advance",              value: data.deductions.advance },
    { label: "Other Deductions",     value: data.deductions.other },
  ].filter(r => r.value > 0);

  const totalDeductions = dedRows.reduce((s, r) => s + r.value, 0);

  return (
    <Document
      title={`Payslip — ${data.employeeName} — ${monthName} ${data.year}`}
      author="Gehnax Technologies LLP"
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ─────────────────────────────────────────── */}
        <View style={s.headerRow}>
          <View style={s.titleBlock}>
            <View style={s.titleLine}>
              <Text style={s.titlePayslip}>PAYSLIP</Text>
              <Text style={s.titleMonth}>{monthName.toUpperCase()} {data.year}</Text>
            </View>
            <Text style={s.coName}>GEHNAX TECHNOLOGIES LLP</Text>
            <Text style={s.coAddress}>Technology Solutions  |  IT Services</Text>
          </View>
          <Image src={GEHNAX_LOGO} style={s.logo} />
        </View>

        <View style={s.hrBold} />

        {/* ── Employee name ───────────────────────────────────── */}
        <Text style={s.empName}>{data.employeeName.toUpperCase()}</Text>

        <View style={s.hr} />

        {/* ── Employee detail grid — row 1 ────────────────────── */}
        <View style={s.detailRow}>
          <DetailItem label="Employee Number" value={data.employeeCode} />
          <DetailItem label="Date Joined"     value={data.joiningDate || "—"} />
          <DetailItem label="Department"      value={data.department} />
          <DetailItem label="Designation"     value={data.designation} />
        </View>

        {/* ── Employee detail grid — row 2 ────────────────────── */}
        <View style={s.detailRow}>
          <DetailItem label="Payment Mode" value={data.paymentMode || "Bank Transfer"} />
          <DetailItem label="Bank"         value={data.bankName    || "—"} />
          <DetailItem label="Bank IFSC"    value={data.bankIFSC    || "—"} />
          <DetailItem label="Bank Account" value={data.bankAccount || "—"} />
        </View>

        <View style={s.hr} />

        {/* ── Salary Details heading ──────────────────────────── */}
        <Text style={s.sectionHead}>SALARY DETAILS</Text>
        <View style={s.hr} />

        {/* ── Attendance row ──────────────────────────────────── */}
        <View style={s.attRow}>
          <View style={s.attItem}>
            <Text style={s.attLabel}>Actual Payable Days</Text>
            <Text style={s.attValue}>{data.payableDays.toFixed(1)}</Text>
          </View>
          <View style={s.attItem}>
            <Text style={s.attLabel}>Total Days In Month</Text>
            <Text style={s.attValue}>{data.workingDays.toFixed(1)}</Text>
          </View>
          <View style={s.attItem}>
            <Text style={s.attLabel}>Loss Of Pay Days</Text>
            <Text style={s.attValue}>{lopDays.toFixed(2)}</Text>
          </View>
          <View style={s.attItem}>
            <Text style={s.attLabel}>Days Payable</Text>
            <Text style={s.attValue}>{daysPayable}</Text>
          </View>
        </View>

        <View style={s.hr} />

        {/* ── Two-column: Earnings + Benefits (CTC) | Deductions ─ */}
        <View style={s.twoCol}>

          {/* LEFT: Earnings (A) + Benefits & Contributions (B) = CTC */}
          <View style={s.leftCol}>
            <Text style={s.subHead}>EARNINGS</Text>
            {earnRows.map((r) => (
              <SalRow key={r.label} label={r.label} value={r.value} />
            ))}
            <TotalRow label="Sub-Total (A)" value={data.grossPay} />

            {benefitRows.length > 0 && (
              <>
                <Text style={s.subHeadSpaced}>BENEFITS &amp; CONTRIBUTIONS (B)</Text>
                {benefitRows.map((r) => (
                  <SalRow key={r.label} label={r.label} value={r.value} />
                ))}
                <TotalRow label="Sub-Total (B)" value={subTotalB} />
                <TotalRow label="Total CTC (A + B)" value={ctcTotal} />
              </>
            )}
            <View style={s.spacer} />
          </View>

          {/* RIGHT: Deductions (D) */}
          <View style={s.rightCol}>
            <Text style={s.subHead}>DEDUCTIONS</Text>
            {dedRows.length > 0 ? (
              dedRows.map((r) => <SalRow key={r.label} label={r.label} value={r.value} />)
            ) : (
              <View style={s.salRow}>
                <Text style={s.salLabel}>No deductions</Text>
                <Text style={s.salAmt}>—</Text>
              </View>
            )}
            <TotalRow label="Total Deductions (D)" value={totalDeductions} />
            <View style={s.spacer} />
          </View>
        </View>

        {/* ── Net salary ──────────────────────────────────────── */}
        <View style={s.hr} />
        <View style={s.netRow}>
          <Text style={s.netLabel}>Net Salary Payable ( A - D )</Text>
          <Text style={s.netAmt}>{fmt(data.netPay)}</Text>
        </View>

        <View style={s.wordsRow}>
          <Text style={s.wordsLabel}>Net Salary in words</Text>
          <Text style={s.wordsValue}>{numberToWords(data.netPay)}</Text>
        </View>

        <Text style={s.noteText}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>**Note : </Text>
          <Text style={{ fontFamily: "Helvetica-Oblique" }}>All amounts displayed in this payslip are in INR</Text>
        </Text>

        <View style={s.hr} />

        {/* ── Footer ──────────────────────────────────────────── */}
        <Text style={s.footerNote}>
          * This is a computer generated statement, does not require signature.
        </Text>
        <Text style={s.confidential}>Confidential</Text>

      </Page>
    </Document>
  );
}

export async function generateSalarySlipBuffer(data: SalarySlipData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(<SalarySlipPDF data={data} /> as any) as Promise<Buffer>;
}
