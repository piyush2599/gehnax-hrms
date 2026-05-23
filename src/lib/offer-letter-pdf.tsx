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

const LOGO_URL =
  "https://res.cloudinary.com/dji6svxdp/image/upload/v1779540701/hrms/assets/gehnax-logo.png";

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

// ── Colour palette ─────────────────────────────────────────────────────────
const BLUE    = "#1d4ed8";
const DBLUE   = "#1e3a8a";
const DARK    = "#111827";
const DGRAY   = "#374151";
const GRAY    = "#6b7280";
const LGRAY   = "#9ca3af";
const LIGHT   = "#f9fafb";
const BORDER  = "#e5e7eb";
const LBLUE   = "#dbeafe";
const LGREEN  = "#dcfce7";
const LRED    = "#fee2e2";
const GREEN   = "#15803d";
const RED     = "#b91c1c";
const AMBER   = "#92400e";
const LAMBNT  = "#fef3c7";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK,
    backgroundColor: "#ffffff",
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 48,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: BLUE,
    borderBottomStyle: "solid",
  },
  headerLeft: { flexDirection: "column" },
  logo: { width: 100, height: 30, objectFit: "contain", marginBottom: 5 },
  coName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: DBLUE,
    letterSpacing: 0.3,
  },
  coTagline: { fontSize: 7, color: GRAY, marginTop: 1.5 },
  coAddress: { fontSize: 7, color: GRAY, marginTop: 1 },
  headerRight: { alignItems: "flex-end", paddingTop: 4 },
  headerMeta: { fontSize: 7.5, color: DGRAY, textAlign: "right", marginBottom: 1.5 },
  headerMetaBold: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: DBLUE,
    textAlign: "right",
    marginBottom: 1.5,
  },

  // ── Blue accent bar ──────────────────────────────────────────────────────
  accentBar: {
    height: 3,
    backgroundColor: BLUE,
    borderRadius: 2,
    marginBottom: 14,
  },

  // ── Document title ───────────────────────────────────────────────────────
  titleBlock: { marginBottom: 14 },
  docTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: DBLUE,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 2,
  },
  docSubtitle: { fontSize: 8, color: GRAY, textAlign: "center" },

  // ── To / Addressee ───────────────────────────────────────────────────────
  toBlock: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: LIGHT,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
    borderLeftStyle: "solid",
  },
  toLabel: { fontSize: 7, color: GRAY, fontFamily: "Helvetica-Bold", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.8 },
  toName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: DBLUE, marginBottom: 2 },
  toDetail: { fontSize: 8, color: DGRAY, marginBottom: 1 },

  // ── Subject line ─────────────────────────────────────────────────────────
  subjectRow: { flexDirection: "row", marginBottom: 10, alignItems: "baseline" },
  subjectLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: DARK, width: 48 },
  subjectText: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BLUE, flex: 1, textDecoration: "underline" },

  // ── Body text ────────────────────────────────────────────────────────────
  body: { fontSize: 8.5, color: DGRAY, lineHeight: 1.65, marginBottom: 8 },
  bodyBold: { fontFamily: "Helvetica-Bold", color: DARK },

  // ── Position details grid ────────────────────────────────────────────────
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: LBLUE,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderStyle: "solid",
  },
  infoItem: { width: "50%", marginBottom: 7, paddingRight: 8 },
  infoLabel: { fontSize: 7, color: GRAY, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  infoVal: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: DBLUE },

  // ── Section heading ──────────────────────────────────────────────────────
  secTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: DBLUE,
    marginTop: 10,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: "solid",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // ── Term rows ─────────────────────────────────────────────────────────────
  termRow: { flexDirection: "row", marginBottom: 7 },
  termNumBox: {
    width: 18,
    height: 14,
    borderRadius: 2,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 0.5,
  },
  termNumText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#fff" },
  termBody: { flex: 1, paddingLeft: 7 },
  termHead: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 2 },
  termText: { fontSize: 8, color: DGRAY, lineHeight: 1.55 },

  // ── Compensation highlight ────────────────────────────────────────────────
  ctcHighlight: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: DBLUE,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  ctcLabel: { fontSize: 8, color: "#93c5fd", fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  ctcAmount: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#ffffff", marginTop: 2 },
  ctcSub: { fontSize: 7, color: "#93c5fd" },
  ctcRight: { alignItems: "flex-end" },
  ctcNet: { fontSize: 8, color: "#93c5fd", fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  ctcNetAmt: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#34d399", marginTop: 1 },

  // ── Signature ────────────────────────────────────────────────────────────
  sigSection: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  sigBlock: {},
  sigLine: {
    borderTopWidth: 1,
    borderTopColor: DARK,
    borderTopStyle: "solid",
    width: 140,
    marginTop: 26,
    marginBottom: 4,
  },
  sigName: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: DARK },
  sigSub: { fontSize: 7.5, color: GRAY, marginTop: 1 },

  // ── Verification box ─────────────────────────────────────────────────────
  verifyBox: {
    marginTop: 12,
    padding: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderStyle: "solid",
  },
  verifyHead: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BLUE, marginBottom: 3 },
  verifyText: { fontSize: 7.5, color: DGRAY, lineHeight: 1.5 },
  verifyUrl: { fontSize: 7.5, color: BLUE },

  // ── Footer ───────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 20,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: "solid",
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: { fontSize: 6.5, color: LGRAY },
  footerRight: { fontSize: 6.5, color: LGRAY },

  // ── Page 2 — Annexure ─────────────────────────────────────────────────────
  annexTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: DBLUE,
    textAlign: "center",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  annexSub: { fontSize: 8, color: GRAY, textAlign: "center", marginBottom: 14 },

  // ── Table ─────────────────────────────────────────────────────────────────
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: "solid",
    borderRadius: 3,
    overflow: "hidden",
  },
  tHead: {
    flexDirection: "row",
    backgroundColor: DBLUE,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tHeadText: { color: "#ffffff", fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  tRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: "solid",
  },
  tRowAlt:    { backgroundColor: LIGHT },
  tRowSec:    { backgroundColor: LBLUE },
  tRowSecRed: { backgroundColor: LRED },
  tRowTotal:  { backgroundColor: "#e0e7ff" },
  tRowNet:    { backgroundColor: LGREEN },
  tRowCTC:    { backgroundColor: DBLUE },
  tRowGrat:   { backgroundColor: LAMBNT },

  tCell:      { fontSize: 8, color: DGRAY },
  tCellBold:  { fontSize: 8, fontFamily: "Helvetica-Bold", color: DARK },
  tCellBlue:  { fontSize: 8, fontFamily: "Helvetica-Bold", color: DBLUE },
  tCellRed:   { fontSize: 8, fontFamily: "Helvetica-Bold", color: RED },
  tCellGreen: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: GREEN },
  tCellWhite: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  tCellAmber: { fontSize: 8, fontFamily: "Helvetica-Bold", color: AMBER },
  col1: { flex: 4 },
  col2: { flex: 2, textAlign: "right" },
  col3: { flex: 2, textAlign: "right" },

  // ── Benefits ─────────────────────────────────────────────────────────────
  benefitBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: LGREEN,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#86efac",
    borderStyle: "solid",
  },
  benefitHead: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GREEN, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 },
  benefitRow: { flexDirection: "row", marginBottom: 3.5 },
  benefitDot: { fontSize: 9, color: GREEN, marginRight: 5, marginTop: 0.5 },
  benefitText: { fontSize: 7.5, color: DGRAY, flex: 1, lineHeight: 1.5 },

  // ── Note ─────────────────────────────────────────────────────────────────
  noteBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: LAMBNT,
    borderRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: "#d97706",
    borderLeftStyle: "solid",
  },
  noteHead: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: AMBER, marginBottom: 2 },
  noteText: { fontSize: 7, color: AMBER, lineHeight: 1.55 },
});

// ── Sub-components ──────────────────────────────────────────────────────────
function CompanyHeader({ refNumber, date }: { refNumber: string; date: string }) {
  return (
    <View style={s.header}>
      <View style={s.headerLeft}>
        <Image src={LOGO_URL} style={s.logo} />
        <Text style={s.coName}>Gehnax Technologies LLP</Text>
        <Text style={s.coTagline}>Technology Solutions  ·  IT Services  ·  Digital Innovation</Text>
        <Text style={s.coAddress}>7/27 FF, Geeta Colony, Krishna Nagar, Delhi – 110031</Text>
      </View>
      <View style={s.headerRight}>
        <Text style={s.headerMetaBold}>{refNumber}</Text>
        <Text style={s.headerMeta}>Date: {date}</Text>
      </View>
    </View>
  );
}

function Footer({ label }: { label: string }) {
  return (
    <View style={s.footer}>
      <Text style={s.footerLeft}>Gehnax Technologies LLP  ·  Confidential — Not for Public Distribution</Text>
      <Text style={s.footerRight}>{label}</Text>
    </View>
  );
}

function Term({ num, heading, text }: { num: string; heading: string; text: string }) {
  return (
    <View style={s.termRow}>
      <View style={s.termNumBox}>
        <Text style={s.termNumText}>{num}</Text>
      </View>
      <View style={s.termBody}>
        <Text style={s.termHead}>{heading}</Text>
        <Text style={s.termText}>{text}</Text>
      </View>
    </View>
  );
}

type TRowVariant = "plain" | "alt" | "sec" | "secRed" | "total" | "net" | "ctc" | "grat";
function TRow({ children, variant = "plain" }: { children: React.ReactNode; variant?: TRowVariant }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const varMap: Record<TRowVariant, any> = {
    plain: undefined, alt: s.tRowAlt, sec: s.tRowSec, secRed: s.tRowSecRed,
    total: s.tRowTotal, net: s.tRowNet, ctc: s.tRowCTC, grat: s.tRowGrat,
  };
  const extra = varMap[variant];
  return <View style={extra ? [s.tRow, extra] : s.tRow}>{children}</View>;
}

// ── Main component ──────────────────────────────────────────────────────────
function OfferLetterPDF({ data }: { data: OfferLetterData }) {
  const sal = data.salary;
  const firstName = data.employeeName.split(" ")[0];

  return (
    <Document
      title={`Offer Letter — ${data.employeeName}`}
      author="Gehnax Technologies LLP"
      subject="Letter of Appointment"
      keywords="offer letter, employment, gehnax"
    >
      {/* ══════════════════════════════════════════════════════════════════
          PAGE 1 — Letter of Appointment
      ══════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <CompanyHeader refNumber={data.refNumber} date={data.generatedDate} />

        {/* Document title */}
        <View style={s.titleBlock}>
          <Text style={s.docTitle}>Letter of Appointment</Text>
          <Text style={s.docSubtitle}>Private &amp; Confidential — To be signed and returned within 7 days</Text>
        </View>

        {/* Addressee */}
        <View style={s.toBlock}>
          <Text style={s.toLabel}>To</Text>
          <Text style={s.toName}>{data.employeeName}</Text>
          <Text style={s.toDetail}>{data.designation}  ·  {data.department} Department</Text>
        </View>

        {/* Subject */}
        <View style={s.subjectRow}>
          <Text style={s.subjectLabel}>Subject:</Text>
          <Text style={s.subjectText}>
            Offer of Employment — {data.designation}, {data.department} Department
          </Text>
        </View>

        {/* Opening */}
        <Text style={s.body}>Dear {firstName},</Text>
        <Text style={s.body}>
          We are pleased to offer you employment at{" "}
          <Text style={s.bodyBold}>Gehnax Technologies LLP</Text> ("the Company") for the position
          of <Text style={s.bodyBold}>{data.designation}</Text> in the{" "}
          <Text style={s.bodyBold}>{data.department}</Text> Department. This offer is extended in
          recognition of your qualifications and experience, and is subject to the terms and
          conditions set out herein and in the Company's policies as amended from time to time.
        </Text>

        {/* Position details */}
        <Text style={s.secTitle}>Position &amp; Employment Details</Text>
        <View style={s.infoGrid}>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Designation</Text>
            <Text style={s.infoVal}>{data.designation}</Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Department</Text>
            <Text style={s.infoVal}>{data.department}</Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Date of Joining</Text>
            <Text style={s.infoVal}>{data.joiningDate}</Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Reference No.</Text>
            <Text style={s.infoVal}>{data.refNumber}</Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Work Location</Text>
            <Text style={s.infoVal}>Delhi – 110031</Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Employment Type</Text>
            <Text style={s.infoVal}>Full-Time, Permanent</Text>
          </View>
        </View>

        {/* CTC highlight */}
        <View style={s.ctcHighlight}>
          <View>
            <Text style={s.ctcLabel}>Annual Cost to Company (CTC)</Text>
            <Text style={s.ctcAmount}>₹ {fmt(sal.annualCTC)}</Text>
            <Text style={s.ctcSub}>Detailed breakdown in Annexure I</Text>
          </View>
          <View style={s.ctcRight}>
            <Text style={s.ctcNet}>Monthly Net Take-Home</Text>
            <Text style={s.ctcNetAmt}>₹ {fmt(sal.netMonthly)}</Text>
            <Text style={s.ctcSub}>After statutory deductions</Text>
          </View>
        </View>

        {/* Terms */}
        <Text style={s.secTitle}>Terms &amp; Conditions of Employment</Text>

        <Term num="1" heading="Probation Period"
          text="You will be on probation for a period of three (3) months from your date of joining. During probation, either party may terminate employment with seven (7) days' written notice. Upon successful completion, you will be confirmed in service." />
        <Term num="2" heading="Working Days &amp; Hours"
          text="Your working days shall be Monday to Saturday. Standard working hours are 9:00 AM to 6:00 PM (9 hours including a 1-hour break). Working hours may be adjusted subject to client project requirements and Company policy." />
        <Term num="3" heading="Notice Period"
          text="After confirmation, either party may terminate this employment by providing thirty (30) days' written notice or payment of one month's gross salary in lieu thereof. During the notice period, you shall complete all pending assignments and ensure a proper handover." />
        <Term num="4" heading="Leave Entitlement"
          text="You are entitled to twenty-four (24) days of paid annual leave per calendar year, accruing at two (2) days per month. Leave is non-accumulative and shall NOT be carried forward to the subsequent calendar year. Any unutilised leave as on 31st December shall stand lapsed automatically." />
        <Term num="5" heading="Provident Fund (EPF)"
          text="Both you and the Company shall contribute to the Employees' Provident Fund (EPF) as per the Employees' Provident Funds &amp; Miscellaneous Provisions Act, 1952, at the rate of 12% of your Basic Salary respectively. Your PF deductions and employer contributions are reflected in Annexure I." />
        <Term num="6" heading="Gratuity"
          text="You shall be entitled to Gratuity as per the provisions of the Payment of Gratuity Act, 1972, upon separation from the Company after completing a minimum period of five (5) continuous years of service. Gratuity shall be calculated at the rate of fifteen (15) days of last drawn Basic Salary for each completed year of service (i.e., Basic ÷ 26 × 15 per year of service), subject to a maximum of ₹20,00,000 (Twenty Lakh Rupees). The annual gratuity provision of ₹ {fmt(sal.gratuity * 12)} forms part of your CTC as shown in Annexure I." />
        <Term num="7" heading="Insurance Coverage"
          text="The Company shall provide: (a) Group Medical Insurance of ₹3,00,000 (Three Lakh) per annum, and (b) Group Personal Accident Insurance of ₹20,00,000 (Twenty Lakh) per annum — both fully funded by the Company and not forming part of your CTC." />

        <Footer label={`${data.refNumber}  ·  Page 1 of 3`} />
      </Page>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 2 — Continued Terms + Salary Annexure
      ══════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <CompanyHeader refNumber={data.refNumber} date={data.generatedDate} />

        {/* Continued terms */}
        <Text style={s.secTitle}>Terms &amp; Conditions of Employment (Continued)</Text>

        <Term num="8" heading="Confidentiality &amp; Intellectual Property"
          text="You shall maintain strict confidentiality of all proprietary, technical, commercial, and client information during and after your employment. All work product, inventions, and intellectual property created in the course of your employment shall vest solely with Gehnax Technologies LLP." />
        <Term num="9" heading="Code of Conduct"
          text="You shall adhere to all Company policies, procedures, and the Code of Conduct as communicated from time to time. Any violation may result in disciplinary action including termination." />
        <Term num="10" heading="Background Verification"
          text="This offer is conditional upon successful completion of pre-employment background verification including educational qualifications, employment history, and reference checks. Provision of false information will result in immediate termination without notice or compensation." />

        <Text style={[s.body, { marginTop: 8 }]}>
          Please confirm your acceptance of this offer by signing and returning a copy of this
          letter within <Text style={s.bodyBold}>seven (7) calendar days</Text> from the date of
          this letter. This offer shall stand withdrawn if acceptance is not received within the
          stipulated period. We look forward to welcoming you to the Gehnax Technologies family.
        </Text>

        {/* Signatures */}
        <View style={s.sigSection}>
          <View style={s.sigBlock}>
            <Text style={s.sigSub}>Employee Acceptance</Text>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{data.employeeName}</Text>
            <Text style={s.sigSub}>Date: ________________________</Text>
          </View>
          <View style={[s.sigBlock, { alignItems: "flex-end" }]}>
            <Text style={s.sigSub}>For Gehnax Technologies LLP</Text>
            <View style={[s.sigLine, { marginLeft: "auto" }]} />
            <Text style={s.sigName}>Authorised Signatory</Text>
            <Text style={s.sigSub}>Human Resources Department</Text>
          </View>
        </View>

        {/* Verification */}
        <View style={s.verifyBox}>
          <Text style={s.verifyHead}>Offer Letter Verification</Text>
          <Text style={s.verifyText}>
            This offer letter can be verified online at the following URL:
          </Text>
          <Text style={s.verifyUrl}>{data.verificationUrl}</Text>
          <Text style={[s.verifyText, { marginTop: 2 }]}>
            Verification Token: {data.verificationToken}
          </Text>
        </View>

        {/* ── SALARY ANNEXURE ── */}
        <Text style={[s.annexTitle, { marginTop: 18 }]}>Annexure I — Salary Structure</Text>
        <Text style={s.annexSub}>
          {data.employeeName}  ·  {data.designation}  ·  {data.department}  ·  Effective from {data.joiningDate}
        </Text>

        <View style={s.table}>
          {/* Header */}
          <View style={s.tHead}>
            <Text style={[s.tHeadText, s.col1]}>Particular</Text>
            <Text style={[s.tHeadText, s.col2]}>Monthly</Text>
            <Text style={[s.tHeadText, s.col3]}>Yearly</Text>
          </View>

          {/* Earnings */}
          <TRow variant="plain">
            <Text style={[s.tCell, s.col1]}>Basic Salary</Text>
            <Text style={[s.tCell, s.col2]}>₹ {fmt(sal.basic)}</Text>
            <Text style={[s.tCell, s.col3]}>₹ {fmt(sal.basic * 12)}</Text>
          </TRow>
          <TRow variant="alt">
            <Text style={[s.tCell, s.col1]}>HRA</Text>
            <Text style={[s.tCell, s.col2]}>₹ {fmt(sal.hra)}</Text>
            <Text style={[s.tCell, s.col3]}>₹ {fmt(sal.hra * 12)}</Text>
          </TRow>
          <TRow variant="plain">
            <Text style={[s.tCell, s.col1]}>Other Allowances</Text>
            <Text style={[s.tCell, s.col2]}>₹ {fmt(sal.allowances)}</Text>
            <Text style={[s.tCell, s.col3]}>₹ {fmt(sal.allowances * 12)}</Text>
          </TRow>

          {/* Deductions section */}
          <TRow variant="sec">
            <Text style={[s.tCellBold, { flex: 8, color: DARK }]}>Deductions</Text>
          </TRow>
          <TRow variant="plain">
            <Text style={[s.tCell, s.col1]}>Employee PF</Text>
            <Text style={[s.tCell, s.col2]}>₹ {fmt(sal.employeePF)}</Text>
            <Text style={[s.tCell, s.col3]}>₹ {fmt(sal.employeePF * 12)}</Text>
          </TRow>
          {sal.esi > 0 && (
            <TRow variant="alt">
              <Text style={[s.tCell, s.col1]}>ESI</Text>
              <Text style={[s.tCell, s.col2]}>₹ {fmt(sal.esi)}</Text>
              <Text style={[s.tCell, s.col3]}>₹ {fmt(sal.esi * 12)}</Text>
            </TRow>
          )}
          {sal.tds > 0 && (
            <TRow variant={sal.esi > 0 ? "plain" : "alt"}>
              <Text style={[s.tCell, s.col1]}>Income Tax (TDS)</Text>
              <Text style={[s.tCell, s.col2]}>₹ {fmt(sal.tds)}</Text>
              <Text style={[s.tCell, s.col3]}>₹ {fmt(sal.tds * 12)}</Text>
            </TRow>
          )}

          {/* Employer Contributions section */}
          <TRow variant="sec">
            <Text style={[s.tCellBold, { flex: 8, color: DARK }]}>Employer Contributions</Text>
          </TRow>
          <TRow variant="plain">
            <Text style={[s.tCell, s.col1]}>Employer PF</Text>
            <Text style={[s.tCell, s.col2]}>₹ {fmt(sal.employerPF)}</Text>
            <Text style={[s.tCell, s.col3]}>₹ {fmt(sal.employerPF * 12)}</Text>
          </TRow>
          <TRow variant="grat">
            <Text style={[s.tCellAmber, s.col1]}>Gratuity</Text>
            <Text style={[s.tCellAmber, s.col2]}>₹ {fmt(sal.gratuity)}</Text>
            <Text style={[s.tCellAmber, s.col3]}>₹ {fmt(sal.gratuity * 12)}</Text>
          </TRow>

          {/* Summary section */}
          <TRow variant="sec">
            <Text style={[s.tCellBold, { flex: 8, color: DARK }]}>Summary</Text>
          </TRow>
          <TRow variant="total">
            <Text style={[s.tCellBold, s.col1]}>Cost to Company (CTC)</Text>
            <Text style={[s.tCellBold, s.col2]}>₹ {fmt(Math.round(sal.annualCTC / 12))}</Text>
            <Text style={[s.tCellBold, s.col3]}>₹ {fmt(sal.annualCTC)}</Text>
          </TRow>
          <TRow variant="alt">
            <Text style={[s.tCellBold, s.col1]}>Gross Salary</Text>
            <Text style={[s.tCellBold, s.col2]}>₹ {fmt(sal.grossMonthly)}</Text>
            <Text style={[s.tCellBold, s.col3]}>₹ {fmt(sal.grossAnnual)}</Text>
          </TRow>
          <TRow variant="net">
            <Text style={[s.tCellGreen, s.col1]}>In-Hand Salary</Text>
            <Text style={[s.tCellGreen, s.col2]}>₹ {fmt(sal.netMonthly)}</Text>
            <Text style={[s.tCellGreen, s.col3]}>₹ {fmt(sal.netMonthly * 12)}</Text>
          </TRow>
        </View>

        {/* Benefits box */}
        <View style={s.benefitBox}>
          <Text style={s.benefitHead}>Additional Benefits (Company-Funded — Separate from CTC)</Text>
          <View style={s.benefitRow}>
            <Text style={s.benefitDot}>•</Text>
            <Text style={s.benefitText}>Group Medical Insurance: ₹3,00,000 per annum — premium fully paid by the Company</Text>
          </View>
          <View style={s.benefitRow}>
            <Text style={s.benefitDot}>•</Text>
            <Text style={s.benefitText}>Group Personal Accident Insurance: ₹20,00,000 per annum — premium fully paid by the Company</Text>
          </View>
          <View style={s.benefitRow}>
            <Text style={s.benefitDot}>•</Text>
            <Text style={s.benefitText}>Paid Annual Leave: 24 days per year (2 days/month) — non-accumulative, lapses on 31st December</Text>
          </View>
        </View>

        {/* Note */}
        <View style={s.noteBox}>
          <Text style={s.noteHead}>Important Notes</Text>
          <Text style={s.noteText}>
            1. Gratuity is payable only upon separation after completing five (5) continuous years of service as per the Payment of Gratuity Act, 1972. The monthly provision shown above is an actuarial accrual forming part of CTC and is not credited to your salary account.{"\n"}
            2. Net take-home may vary based on actual working days, Loss of Pay (LOP), performance bonus, or other applicable adjustments.{"\n"}
            3. Income Tax (TDS) is computed under the New Tax Regime (FY 2025-26) and is subject to change based on declarations and applicable tax laws.{"\n"}
            4. This salary structure is subject to revision as per Company policy and performance appraisal cycles.
          </Text>
        </View>

        <Footer label={`${data.refNumber}  ·  Page 2 of 3  ·  Annexure I`} />
      </Page>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 3 — Annexure II: Documents Required
      ══════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <CompanyHeader refNumber={data.refNumber} date={data.generatedDate} />

        <Text style={[s.annexTitle, { marginTop: 4 }]}>Annexure II — Documents Required</Text>
        <Text style={s.annexSub}>{data.employeeName}  ·  {data.designation}  ·  {data.department}</Text>

        {/* Intro paragraph */}
        <View style={[s.toBlock, { marginBottom: 14 }]}>
          <Text style={[s.body, { marginBottom: 0 }]}>
            The offer is extended to you subject to the following pre-conditions, without which the offer may be considered{" "}
            <Text style={s.bodyBold}>null and void.</Text>
          </Text>
          <Text style={[s.body, { marginTop: 6, marginBottom: 0 }]}>
            You are required to submit the following documents in <Text style={s.bodyBold}>soft copy</Text> and update all
            necessary details before the date of joining, if not already provided, within{" "}
            <Text style={s.bodyBold}>10 days of the offer release.</Text> In the case of early joining, the required
            updates should be completed prior to your joining date.
          </Text>
        </View>

        {/* Document list */}
        <View style={s.table}>
          <View style={s.tHead}>
            <Text style={[s.tHeadText, { flex: 0.5 }]}>S. No.</Text>
            <Text style={[s.tHeadText, { flex: 5 }]}>Document</Text>
          </View>
          {[
            "Updated Resume.",
            "Latest passport-sized photograph — 2 Nos.",
            "Highest educational degree held and Final Year Marksheet.",
            "Other professional qualification certificate(s), if any.",
            "Residence Proof (Passport / Aadhaar Card / Voter Card).",
            "Identity Proof (PAN Card / Passport / Driving License / Voter ID).",
            "Relieving & Experience letter of all previous employments.",
            "Appointment, Relieving & Experience letter of current employment.",
            "Salary slips of last 3 months of current employment.",
          ].map((doc, i) => (
            <TRow key={i} variant={i % 2 === 0 ? "plain" : "alt"}>
              <Text style={[s.tCellBold, { flex: 0.5 }]}>{String.fromCharCode(97 + i)}.</Text>
              <Text style={[s.tCell, { flex: 5 }]}>{doc}</Text>
            </TRow>
          ))}
        </View>

        {/* Warning note */}
        <View style={[s.noteBox, { marginTop: 16 }]}>
          <Text style={s.noteHead}>Please Note</Text>
          <Text style={s.noteText}>
            Failure to submit the above documents within the stipulated timeframe may result in delay of onboarding,
            deferral of the joining date, or withdrawal of the offer at the sole discretion of the Company.
            All documents submitted are subject to verification and this offer is contingent upon their authenticity.
          </Text>
        </View>

        {/* Acceptance */}
        <View style={[s.sigSection, { marginTop: 28 }]}>
          <View style={s.sigBlock}>
            <Text style={s.sigSub}>Employee Acknowledgement</Text>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{data.employeeName}</Text>
            <Text style={s.sigSub}>Date: ________________________</Text>
          </View>
          <View style={[s.sigBlock, { alignItems: "flex-end" }]}>
            <Text style={s.sigSub}>For Gehnax Technologies LLP</Text>
            <View style={[s.sigLine, { marginLeft: "auto" }]} />
            <Text style={s.sigName}>Authorised Signatory</Text>
            <Text style={s.sigSub}>Human Resources Department</Text>
          </View>
        </View>

        <Footer label={`${data.refNumber}  ·  Page 3 of 3  ·  Annexure II`} />
      </Page>
    </Document>
  );
}

export async function generateOfferLetterBuffer(data: OfferLetterData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(<OfferLetterPDF data={data} /> as any) as Promise<Buffer>;
}
