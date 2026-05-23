import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

export interface OfferLetterData {
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  joiningDate: string;
  salary: {
    basic: number;
    hra: number;
    allowances: number;
    grossMonthly: number;
    employeePF: number;
    esi: number;
    professionalTax: number;
    tds: number;
    totalDeductions: number;
    netMonthly: number;
    grossAnnual: number;
    employerPF: number;
    gratuity: number;
    annualCTC: number;
  };
  verificationUrl: string;
  verificationToken: string;
  generatedDate: string;
  refNumber: string;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

const BLUE    = "#1d4ed8";
const DARK    = "#1e293b";
const GRAY    = "#64748b";
const LIGHT   = "#f8fafc";
const BORDER  = "#e2e8f0";
const GREEN   = "#16a34a";
const RED     = "#dc2626";
const LBLUE   = "#dbeafe";
const LGREEN  = "#dcfce7";
const LRED    = "#fee2e2";
const LYELLOW = "#fefce8";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: DARK,
    backgroundColor: "#ffffff",
    paddingHorizontal: 44,
    paddingVertical: 34,
    paddingBottom: 50,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: BLUE,
    borderBottomStyle: "solid",
  },
  coName: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: BLUE,
  },
  coSub: { fontSize: 7.5, color: GRAY, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  headerRightText: { fontSize: 8, color: GRAY, marginTop: 1 },

  // ── Letter title ──
  title: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: BLUE,
    textAlign: "center",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },

  // ── Addressee block ──
  addrBox: {
    padding: 9,
    backgroundColor: LIGHT,
    borderRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
    borderLeftStyle: "solid",
    marginBottom: 10,
  },
  addrName: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: DARK },
  addrSub:  { fontSize: 8.5, color: GRAY, marginTop: 2 },

  // ── Body text ──
  body: { fontSize: 9.5, color: DARK, lineHeight: 1.6, marginBottom: 7 },
  bold: { fontFamily: "Helvetica-Bold" },

  // ── Section heading ──
  secTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: BLUE,
    marginBottom: 5,
    marginTop: 8,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#bfdbfe",
    borderBottomStyle: "solid",
  },

  // ── Position detail grid ──
  grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 7 },
  gridItem: { width: "48%", flexDirection: "row", marginBottom: 4, marginRight: "2%" },
  gridLabel: { fontSize: 8.5, color: GRAY, width: 90 },
  gridVal:   { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: DARK, flex: 1 },

  // ── Terms ──
  termRow: { flexDirection: "row", marginBottom: 5 },
  termNum: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BLUE, width: 16 },
  termBody: { flex: 1 },
  termHead: { fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 1 },
  termText: { fontSize: 8.5, color: DARK, lineHeight: 1.5 },

  // ── Signature ──
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  sigLine: {
    borderTopWidth: 1, borderTopColor: DARK, borderTopStyle: "solid",
    width: 130, marginTop: 22, marginBottom: 3,
  },
  sigLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: DARK },
  sigSub:   { fontSize: 8, color: GRAY },

  // ── Verification box ──
  verifyBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderStyle: "solid",
  },
  verifyHead: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BLUE, marginBottom: 3 },
  verifyText: { fontSize: 8, color: DARK },
  verifyUrl:  { fontSize: 8, color: BLUE },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: "solid",
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: GRAY },

  // ── Annexure ──
  annexTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: BLUE,
    textAlign: "center",
    marginBottom: 3,
  },
  annexSub: { fontSize: 8.5, color: GRAY, textAlign: "center", marginBottom: 12 },

  // ── Table ──
  table: {
    borderWidth: 1, borderColor: BORDER,
    borderStyle: "solid", borderRadius: 3,
  },
  tHead: {
    flexDirection: "row",
    backgroundColor: BLUE,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tHeadText: { color: "#fff", fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  tRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: "solid",
  },
  tRowAlt:    { backgroundColor: LIGHT },
  tRowSec:    { backgroundColor: LBLUE },
  tRowSecRed: { backgroundColor: LRED },
  tRowTotal:  { backgroundColor: "#eff6ff" },
  tRowNet:    { backgroundColor: LGREEN },
  tRowCTC:    { backgroundColor: BLUE },
  tCell:      { fontSize: 8.5, color: DARK },
  tCellBold:  { fontSize: 8.5, color: DARK, fontFamily: "Helvetica-Bold" },
  tCellBlue:  { fontSize: 8.5, color: BLUE, fontFamily: "Helvetica-Bold" },
  tCellRed:   { fontSize: 8.5, color: RED, fontFamily: "Helvetica-Bold" },
  tCellGreen: { fontSize: 9, color: GREEN, fontFamily: "Helvetica-Bold" },
  tCellWhite: { fontSize: 9, color: "#fff", fontFamily: "Helvetica-Bold" },
  col1: { flex: 3 },
  col2: { flex: 1.5, textAlign: "right" },
  col3: { flex: 1.5, textAlign: "right" },

  // ── Benefits ──
  benefitBox: {
    marginTop: 12,
    padding: 9,
    backgroundColor: LGREEN,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#86efac",
    borderStyle: "solid",
  },
  benefitHead: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: GREEN, marginBottom: 4 },
  benefitRow:  { flexDirection: "row", marginBottom: 3 },
  benefitDot:  { fontSize: 9, color: GREEN, marginRight: 5 },
  benefitText: { fontSize: 8.5, color: DARK, flex: 1 },

  noteBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: LYELLOW,
    borderRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
    borderLeftStyle: "solid",
  },
  noteText: { fontSize: 7.5, color: "#92400e", lineHeight: 1.5 },
});

function Term({
  num, heading, text,
}: { num: string; heading: string; text: string }) {
  return (
    <View style={s.termRow}>
      <Text style={s.termNum}>{num}.</Text>
      <View style={s.termBody}>
        <Text style={s.termHead}>{heading}</Text>
        <Text style={s.termText}>{text}</Text>
      </View>
    </View>
  );
}

function TRow({
  children, variant,
}: { children: React.ReactNode; variant?: "alt" | "sec" | "secRed" | "total" | "net" | "ctc" | "plain" }) {
  const varMap = {
    alt:    s.tRowAlt,
    sec:    s.tRowSec,
    secRed: s.tRowSecRed,
    total:  s.tRowTotal,
    net:    s.tRowNet,
    ctc:    s.tRowCTC,
    plain:  undefined,
  };
  const extra = variant ? varMap[variant] : undefined;
  return <View style={extra ? [s.tRow, extra] : s.tRow}>{children}</View>;
}

function OfferLetterPDF({ data }: { data: OfferLetterData }) {
  const sal = data.salary;
  const firstName = data.employeeName.split(" ")[0];

  return (
    <Document title={`Offer Letter — ${data.employeeName}`} author="Gehnax Technologies LLP">

      {/* ══ PAGE 1 — Offer Letter ══ */}
      <Page size="A4" style={s.page}>

        {/* Company header */}
        <View style={s.header}>
          <View>
            <Text style={s.coName}>Gehnax Technologies LLP</Text>
            <Text style={s.coSub}>Technology Solutions  |  IT Services</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerRightText}>Date: {data.generatedDate}</Text>
            <Text style={s.headerRightText}>Ref: {data.refNumber}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={s.title}>Letter of Appointment</Text>

        {/* Addressee */}
        <View style={s.addrBox}>
          <Text style={s.addrName}>{data.employeeName}</Text>
          <Text style={s.addrSub}>{data.designation}  ·  {data.department}</Text>
          <Text style={s.addrSub}>Employee Code: {data.employeeCode}</Text>
        </View>

        {/* Opening */}
        <Text style={s.body}>Dear {firstName},</Text>
        <Text style={s.body}>
          We are pleased to extend this offer of employment to you for the position of{" "}
          <Text style={s.bold}>{data.designation}</Text> in the{" "}
          <Text style={s.bold}>{data.department}</Text> department at{" "}
          <Text style={s.bold}>Gehnax Technologies LLP</Text>. This offer is made in recognition of
          your qualifications and experience, and is subject to the terms and conditions outlined below.
        </Text>

        {/* Position Details */}
        <Text style={s.secTitle}>Position Details</Text>
        <View style={s.grid}>
          <View style={s.gridItem}>
            <Text style={s.gridLabel}>Designation:</Text>
            <Text style={s.gridVal}>{data.designation}</Text>
          </View>
          <View style={s.gridItem}>
            <Text style={s.gridLabel}>Department:</Text>
            <Text style={s.gridVal}>{data.department}</Text>
          </View>
          <View style={s.gridItem}>
            <Text style={s.gridLabel}>Date of Joining:</Text>
            <Text style={s.gridVal}>{data.joiningDate}</Text>
          </View>
          <View style={s.gridItem}>
            <Text style={s.gridLabel}>Employee Code:</Text>
            <Text style={s.gridVal}>{data.employeeCode}</Text>
          </View>
          <View style={s.gridItem}>
            <Text style={s.gridLabel}>Annual CTC:</Text>
            <Text style={s.gridVal}>₹ {fmt(sal.annualCTC)}</Text>
          </View>
          <View style={s.gridItem}>
            <Text style={s.gridLabel}>Net Monthly:</Text>
            <Text style={s.gridVal}>₹ {fmt(sal.netMonthly)}</Text>
          </View>
        </View>
        <Text style={s.body}>
          Your detailed salary structure is provided in Annexure I (Salary Annexure) attached with this letter.
        </Text>

        {/* Terms */}
        <Text style={s.secTitle}>Terms & Conditions</Text>

        <Term
          num="1"
          heading="Working Days"
          text="Your working days shall be Monday to Saturday. Working hours are as per company policy and may vary according to client project requirements."
        />
        <Term
          num="2"
          heading="Notice Period"
          text="Either party may terminate this employment by providing 30 (Thirty) days' written notice. During the notice period, you are expected to complete all ongoing assignments and facilitate a smooth handover."
        />
        <Term
          num="3"
          heading="Leave Policy"
          text="You are entitled to 24 (Twenty-Four) days of paid annual leave per year, credited at 2 days per calendar month. Leaves are non-accumulative and shall NOT be carried forward to the following year. Any unused leave as on 31st December shall stand lapsed automatically."
        />
        <Term
          num="4"
          heading="Provident Fund (PF)"
          text="PF contributions shall be made as per applicable Government of India regulations. Your PF deductions and employer contributions will be reflected in your payslip on a quarterly basis."
        />
        <Term
          num="5"
          heading="Insurance Coverage"
          text="You will be covered under: Group Medical Insurance of ₹3,00,000 (Three Lakh) per annum and Group Personal Accident Insurance of ₹20,00,000 (Twenty Lakh) per annum — both fully funded by the company."
        />
        <Term
          num="6"
          heading="Code of Conduct & Confidentiality"
          text="You shall comply with all company policies, maintain strict confidentiality of proprietary and client information, and uphold the professional standards of Gehnax Technologies LLP at all times."
        />

        <Text style={[s.body, { marginTop: 6 }]}>
          This offer is conditional upon successful completion of background verification and submission of all
          required documents. Kindly sign and return a copy of this letter to confirm your acceptance.
        </Text>
        <Text style={s.body}>We look forward to welcoming you to the Gehnax Technologies family.</Text>

        {/* Signatures */}
        <View style={s.sigRow}>
          <View>
            <Text style={[s.sigSub, { marginBottom: 0 }]}>Employee Acceptance</Text>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>{data.employeeName}</Text>
            <Text style={s.sigSub}>Date: ______________________</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[s.sigSub, { marginBottom: 0 }]}>For Gehnax Technologies LLP</Text>
            <View style={[s.sigLine, { marginLeft: "auto" }]} />
            <Text style={s.sigLabel}>Authorized Signatory</Text>
            <Text style={s.sigSub}>Human Resources Department</Text>
          </View>
        </View>

        {/* Verification */}
        <View style={s.verifyBox}>
          <Text style={s.verifyHead}>Offer Letter Verification</Text>
          <Text style={s.verifyText}>This offer letter can be verified online at:</Text>
          <Text style={s.verifyUrl}>{data.verificationUrl}</Text>
          <Text style={[s.verifyText, { marginTop: 2 }]}>Verification Token: {data.verificationToken}</Text>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>Gehnax Technologies LLP  |  Confidential — Not for Public Distribution</Text>
          <Text style={s.footerText}>{data.refNumber}  |  {data.generatedDate}</Text>
        </View>
      </Page>

      {/* ══ PAGE 2 — Salary Annexure ══ */}
      <Page size="A4" style={s.page}>

        {/* Company header */}
        <View style={s.header}>
          <View>
            <Text style={s.coName}>Gehnax Technologies LLP</Text>
            <Text style={s.coSub}>Technology Solutions  |  IT Services</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerRightText}>Ref: {data.refNumber}</Text>
            <Text style={s.headerRightText}>{data.generatedDate}</Text>
          </View>
        </View>

        <Text style={s.annexTitle}>Annexure I — Salary Structure</Text>
        <Text style={s.annexSub}>
          {data.employeeName}  |  {data.designation}  |  {data.department}
        </Text>

        {/* Table */}
        <View style={s.table}>
          {/* Header */}
          <View style={s.tHead}>
            <Text style={[s.tHeadText, s.col1]}>Particulars</Text>
            <Text style={[s.tHeadText, s.col2]}>Monthly (₹)</Text>
            <Text style={[s.tHeadText, s.col3]}>Annual (₹)</Text>
          </View>

          {/* ── EARNINGS ── */}
          <TRow variant="sec">
            <Text style={[s.tCellBlue, s.col1]}>EARNINGS</Text>
            <Text style={[s.tCell, s.col2]} />
            <Text style={[s.tCell, s.col3]} />
          </TRow>
          <TRow variant="plain">
            <Text style={[s.tCell, s.col1]}>Basic Salary</Text>
            <Text style={[s.tCell, s.col2]}>{fmt(sal.basic)}</Text>
            <Text style={[s.tCell, s.col3]}>{fmt(sal.basic * 12)}</Text>
          </TRow>
          <TRow variant="alt">
            <Text style={[s.tCell, s.col1]}>House Rent Allowance (HRA)</Text>
            <Text style={[s.tCell, s.col2]}>{fmt(sal.hra)}</Text>
            <Text style={[s.tCell, s.col3]}>{fmt(sal.hra * 12)}</Text>
          </TRow>
          <TRow variant="plain">
            <Text style={[s.tCell, s.col1]}>Special Allowance</Text>
            <Text style={[s.tCell, s.col2]}>{fmt(sal.allowances)}</Text>
            <Text style={[s.tCell, s.col3]}>{fmt(sal.allowances * 12)}</Text>
          </TRow>
          <TRow variant="total">
            <Text style={[s.tCellBold, s.col1]}>Gross Earnings</Text>
            <Text style={[s.tCellBold, s.col2]}>{fmt(sal.grossMonthly)}</Text>
            <Text style={[s.tCellBold, s.col3]}>{fmt(sal.grossAnnual)}</Text>
          </TRow>

          {/* ── DEDUCTIONS ── */}
          <TRow variant="secRed">
            <Text style={[s.tCellRed, s.col1]}>DEDUCTIONS</Text>
            <Text style={[s.tCell, s.col2]} />
            <Text style={[s.tCell, s.col3]} />
          </TRow>
          <TRow variant="plain">
            <Text style={[s.tCell, s.col1]}>Employee Provident Fund (12% of Basic)</Text>
            <Text style={[s.tCell, s.col2]}>{fmt(sal.employeePF)}</Text>
            <Text style={[s.tCell, s.col3]}>{fmt(sal.employeePF * 12)}</Text>
          </TRow>
          <TRow variant="alt">
            <Text style={[s.tCell, s.col1]}>Employer Provident Fund (12% of Basic)</Text>
            <Text style={[s.tCell, s.col2]}>{fmt(sal.employerPF)}</Text>
            <Text style={[s.tCell, s.col3]}>{fmt(sal.employerPF * 12)}</Text>
          </TRow>
          {sal.esi > 0 && (
            <TRow variant="plain">
              <Text style={[s.tCell, s.col1]}>ESI (0.75% of Gross)</Text>
              <Text style={[s.tCell, s.col2]}>{fmt(sal.esi)}</Text>
              <Text style={[s.tCell, s.col3]}>{fmt(sal.esi * 12)}</Text>
            </TRow>
          )}
          {sal.tds > 0 && (
            <TRow variant={sal.esi > 0 ? "alt" : "plain"}>
              <Text style={[s.tCell, s.col1]}>Income Tax (TDS — New Regime)</Text>
              <Text style={[s.tCell, s.col2]}>{fmt(sal.tds)}</Text>
              <Text style={[s.tCell, s.col3]}>{fmt(sal.tds * 12)}</Text>
            </TRow>
          )}
          <TRow variant="total">
            <Text style={[s.tCellBold, s.col1]}>Total Deductions</Text>
            <Text style={[s.tCellBold, s.col2]}>{fmt(sal.totalDeductions)}</Text>
            <Text style={[s.tCellBold, s.col3]}>{fmt(sal.totalDeductions * 12)}</Text>
          </TRow>

          {/* ── NET SALARY ── */}
          <TRow variant="net">
            <Text style={[s.tCellGreen, s.col1]}>NET MONTHLY SALARY</Text>
            <Text style={[s.tCellGreen, s.col2]}>{fmt(sal.netMonthly)}</Text>
            <Text style={[s.tCellGreen, s.col3]}>{fmt(sal.netMonthly * 12)}</Text>
          </TRow>

          {/* ── CTC ── */}
          <TRow variant="sec">
            <Text style={[s.tCellBlue, s.col1]}>COST TO COMPANY (CTC)</Text>
            <Text style={[s.tCell, s.col2]} />
            <Text style={[s.tCell, s.col3]} />
          </TRow>
          <TRow variant="plain">
            <Text style={[s.tCell, s.col1]}>Gross Salary (Employee Cost)</Text>
            <Text style={[s.tCell, s.col2]}>{fmt(sal.grossMonthly)}</Text>
            <Text style={[s.tCell, s.col3]}>{fmt(sal.grossAnnual)}</Text>
          </TRow>
          <TRow variant="alt">
            <Text style={[s.tCell, s.col1]}>Employer PF Contribution (12% of Basic)</Text>
            <Text style={[s.tCell, s.col2]}>{fmt(sal.employerPF)}</Text>
            <Text style={[s.tCell, s.col3]}>{fmt(sal.employerPF * 12)}</Text>
          </TRow>
          <TRow variant="ctc">
            <Text style={[s.tCellWhite, s.col1]}>TOTAL ANNUAL CTC</Text>
            <Text style={[s.tCellWhite, s.col2]}>—</Text>
            <Text style={[s.tCellWhite, s.col3]}>₹ {fmt(sal.annualCTC)}</Text>
          </TRow>
        </View>

        {/* Benefits */}
        <View style={s.benefitBox}>
          <Text style={s.benefitHead}>Employee Benefits (Company-Funded — Not Included in CTC)</Text>
          <View style={s.benefitRow}>
            <Text style={s.benefitDot}>•</Text>
            <Text style={s.benefitText}>
              Group Medical Insurance: ₹3,00,000 (Three Lakh) per annum — company pays full premium
            </Text>
          </View>
          <View style={s.benefitRow}>
            <Text style={s.benefitDot}>•</Text>
            <Text style={s.benefitText}>
              Group Personal Accident Insurance: ₹20,00,000 (Twenty Lakh) per annum — company pays full premium
            </Text>
          </View>
          <View style={s.benefitRow}>
            <Text style={s.benefitDot}>•</Text>
            <Text style={s.benefitText}>
              Annual Paid Leave: 24 days per year (2 days/month) — leaves DO NOT carry forward to next year
            </Text>
          </View>
          <View style={s.benefitRow}>
            <Text style={s.benefitDot}>•</Text>
            <Text style={s.benefitText}>
              Working Days: Monday to Saturday (as per company policy and client requirements)
            </Text>
          </View>
          <View style={s.benefitRow}>
            <Text style={s.benefitDot}>•</Text>
            <Text style={s.benefitText}>
              PF contributions reflected in payslip on a quarterly basis as per government norms
            </Text>
          </View>
        </View>

        {/* Note */}
        <View style={s.noteBox}>
          <Text style={s.noteText}>
            Note: The salary structure above is indicative and subject to applicable income tax (TDS) deductions
            under the prevailing new tax regime. Net salary may vary based on actual working days, loss of pay
            (LOP), and other applicable deductions. Both Employee PF and Employer PF (each 12% of Basic) are
            included in the deductions. PF contributions are reflected in payslip on a quarterly basis.
          </Text>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Gehnax Technologies LLP  |  Annexure I — Salary Structure  |  Confidential
          </Text>
          <Text style={s.footerText}>{data.refNumber}  |  {data.generatedDate}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateOfferLetterBuffer(data: OfferLetterData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(<OfferLetterPDF data={data} /> as any) as Promise<Buffer>;
}
