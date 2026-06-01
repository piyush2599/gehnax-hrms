import React from "react";
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
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
    basic: number; hra: number; allowances: number;
    grossMonthly: number; employeePF: number; esi: number;
    professionalTax: number; tds: number; totalDeductions: number;
    netMonthly: number; grossAnnual: number; employerPF: number;
    gratuity: number; annualCTC: number;
  };
  verificationUrl: string;
  verificationToken: string;
  generatedDate: string;
  refNumber: string;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.round(n));
}

function toWords(n: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const t = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (n === 0) return "Zero";
  const two = (x: number): string => x < 20 ? ones[x] : t[Math.floor(x / 10)] + (x % 10 ? " " + ones[x % 10] : "");
  const three = (x: number): string => x < 100 ? two(x) : ones[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " " + two(x % 100) : "");
  let num = Math.round(n); let r = "";
  const cr = Math.floor(num / 10_000_000); num %= 10_000_000;
  const lk = Math.floor(num / 100_000); num %= 100_000;
  const th = Math.floor(num / 1_000); num %= 1_000;
  if (cr) r += three(cr) + " Crore ";
  if (lk) r += two(lk) + " Lakh ";
  if (th) r += two(th) + " Thousand ";
  if (num) r += three(num);
  return r.trim() + " Only";
}

const BLUE  = "#1d4ed8";
const DBLUE = "#1e3a8a";
const DARK  = "#111827";
const GRAY  = "#374151";
const LGRAY = "#9ca3af";
const BRD   = "#d1d5db";
const LBRD  = "#e5e7eb";
const ALT   = "#f3f4f6";
const LGREEN = "#dcfce7";
const LBLUE  = "#dbeafe";
const LINDIGO = "#e0e7ff";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica", fontSize: 9.5, color: DARK,
    backgroundColor: "#ffffff",
    paddingTop: 28, paddingBottom: 64, paddingHorizontal: 50,
  },
  // Header
  hdr: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingBottom: 10, marginBottom: 20,
    borderBottomWidth: 1, borderBottomColor: LBRD, borderBottomStyle: "solid",
  },
  logo: { width: 110, height: 32, objectFit: "contain" },
  site: { fontSize: 8.5, color: GRAY },
  // Footer (fixed absolute)
  ftr: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 50, paddingTop: 7, paddingBottom: 10,
    borderTopWidth: 1, borderTopColor: LBRD, borderTopStyle: "solid",
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
  },
  ftrCoName: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLUE, marginBottom: 1.5 },
  ftrAddr:   { fontSize: 6.5, color: LGRAY },
  ftrRight:  { fontSize: 6.5, color: LGRAY, textAlign: "right" },
  // Letter body
  date:    { fontSize: 9.5, marginBottom: 16 },
  toLbl:   { fontSize: 9.5, marginBottom: 2 },
  toName:  { fontSize: 9.5, marginBottom: 20 },
  subject: { fontSize: 10, fontFamily: "Helvetica-Bold", textDecoration: "underline", textAlign: "center", marginBottom: 16 },
  greeting:{ fontSize: 9.5, color: GRAY, marginBottom: 6 },
  welcome: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginBottom: 10 },
  para:    { fontSize: 9.5, lineHeight: 1.6, color: GRAY, marginBottom: 10 },
  bold:    { fontFamily: "Helvetica-Bold", color: DARK },
  termsIntro: { fontSize: 9.5, color: GRAY, marginBottom: 10 },
  // Terms
  termRow:  { flexDirection: "row", marginBottom: 8 },
  termNum:  { fontSize: 9.5, fontFamily: "Helvetica-Bold", width: 26, color: DARK, flexShrink: 0 },
  termBody: { flex: 1, fontSize: 9.5, lineHeight: 1.6, color: GRAY },
  termBold: { fontFamily: "Helvetica-Bold", color: DARK },
  subRow:   { flexDirection: "row", marginTop: 5, marginLeft: 8 },
  subLbl:   { fontSize: 9.5, width: 22, flexShrink: 0, color: GRAY },
  subBody:  { flex: 1, fontSize: 9.5, lineHeight: 1.6, color: GRAY },
  subBold:  { fontFamily: "Helvetica-Bold", color: DARK },
  // Closing / sincerely
  closing:  { fontSize: 9.5, lineHeight: 1.6, color: GRAY, marginTop: 10, marginBottom: 10 },
  sincerely:{ fontSize: 9.5, color: GRAY, marginTop: 12, marginBottom: 34 },
  sigName:  { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 1 },
  sigTitle: { fontSize: 9, color: GRAY },
  // Acceptance & Declaration
  acceptSep:   { borderTopWidth: 1, borderTopColor: BRD, borderTopStyle: "solid", marginTop: 18, marginBottom: 14 },
  acceptTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", textDecoration: "underline", textAlign: "center", marginBottom: 12 },
  acceptPara:  { fontSize: 9, lineHeight: 1.6, color: GRAY, marginBottom: 8, textAlign: "justify" },
  acceptRow:   { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  acceptFieldLbl: { fontSize: 9.5, color: DARK, marginBottom: 26 },
  acceptLine:  { borderBottomWidth: 1, borderBottomColor: DARK, borderBottomStyle: "solid", width: 150, marginBottom: 3 },
  acceptLineSub: { fontSize: 8, color: GRAY },
  // Annexure
  annexTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", textDecoration: "underline", textAlign: "center", marginBottom: 3 },
  annexLabel: { fontSize: 9.5, textDecoration: "underline", textAlign: "center", color: GRAY, marginBottom: 14 },
  annexSub:   { fontSize: 9, color: GRAY, textAlign: "center", marginBottom: 16 },
  // Salary table
  table: { borderWidth: 1, borderColor: BRD, borderStyle: "solid" },
  tHdEarn: { flexDirection: "row", backgroundColor: DBLUE, paddingVertical: 6, paddingHorizontal: 8 },
  tHdBen:  {
    flexDirection: "row", backgroundColor: "#065f46", paddingVertical: 5, paddingHorizontal: 8,
    borderTopWidth: 1, borderTopColor: BRD, borderTopStyle: "solid",
  },
  tHdDed:  {
    flexDirection: "row", backgroundColor: GRAY, paddingVertical: 6, paddingHorizontal: 8,
    borderTopWidth: 1, borderTopColor: BRD, borderTopStyle: "solid",
  },
  tHdTxt: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#ffffff", textTransform: "uppercase" },
  tRow:    { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: LBRD, borderBottomStyle: "solid" },
  tRowAlt: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: LBRD, borderBottomStyle: "solid", backgroundColor: ALT },
  tRowSub: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: BRD, borderBottomStyle: "solid", backgroundColor: LBLUE },
  tRowTot: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: BRD, borderBottomStyle: "solid", backgroundColor: LINDIGO },
  tRowNet: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, backgroundColor: LGREEN },
  tCell:      { fontSize: 8.5, color: GRAY },
  tCellBold:  { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: DARK },
  tCellBlue:  { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: DBLUE },
  tCellGreen: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#15803d" },
  col1: { flex: 4 },
  col2: { flex: 2.5, textAlign: "right" },
  col3: { flex: 2.5, textAlign: "right" },
  // Verification
  verifyBox: {
    marginTop: 12, padding: 8, backgroundColor: "#eff6ff", borderRadius: 3,
    borderWidth: 1, borderColor: "#93c5fd", borderStyle: "solid",
  },
  verifyHead: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BLUE, marginBottom: 3 },
  verifyText: { fontSize: 7.5, color: GRAY },
  verifyUrl:  { fontSize: 7.5, color: BLUE },
  // BGV / Medical
  annexName: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginBottom: 2, marginTop: 8 },
  annexRef:  { fontSize: 9.5, color: GRAY, marginBottom: 16, paddingLeft: 12 },
  bgvPara:   { fontSize: 9.5, lineHeight: 1.6, color: GRAY, marginBottom: 10, textAlign: "justify" },
  bgvSigLbl: { fontSize: 9.5, color: GRAY, marginTop: 22, marginBottom: 2 },
  bgvSigName:{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 3 },
  bgvDate:   { fontSize: 9.5, color: GRAY },
  medBlank:  { borderBottomWidth: 1, borderBottomColor: DARK, borderBottomStyle: "solid", marginTop: 14, marginBottom: 18 },
  // Docs list
  docItem: { flexDirection: "row", marginBottom: 7, paddingLeft: 36 },
  docLbl:  { fontSize: 9.5, width: 22, color: GRAY },
  docText: { flex: 1, fontSize: 9.5, color: GRAY },
});

// ── Shared sub-components ────────────────────────────────────────────────────
function Hdr() {
  return (
    <View style={s.hdr}>
      <Image src={LOGO_URL} style={s.logo} />
      <Text style={s.site}>www.gehnax.com</Text>
    </View>
  );
}

function Ftr() {
  return (
    <View style={s.ftr} fixed>
      <View>
        <Text style={s.ftrCoName}>Gehnax Technologies LLP</Text>
        <Text style={s.ftrAddr}>7/27 FF, Geeta Colony, Krishna Nagar, Delhi – 110031</Text>
      </View>
      <View>
        <Text style={s.ftrRight}>www.gehnax.com</Text>
        <Text style={s.ftrRight}>hr@gehnax.com</Text>
      </View>
    </View>
  );
}

// ── Main document ────────────────────────────────────────────────────────────
function OfferLetterPDF({ data }: { data: OfferLetterData }) {
  const sal = data.salary;
  const firstName = data.employeeName.split(" ")[0];
  const subTotalB = sal.employerPF + sal.gratuity;
  const ctcMonthly = Math.round(sal.annualCTC / 12);

  return (
    <Document title={`Offer Letter — ${data.employeeName}`} author="Gehnax Technologies LLP">

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 1 — Offer Letter
      ══════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <Hdr />

        <Text style={s.date}>{data.generatedDate}</Text>

        <Text style={s.toLbl}>To</Text>
        <Text style={s.toName}>{data.employeeName}</Text>

        <Text style={s.subject}>Sub: Offer of Employment</Text>

        <Text style={s.greeting}>Dear {firstName},</Text>
        <Text style={s.welcome}>Welcome to Gehnax Technologies LLP!</Text>

        <Text style={s.para}>
          We are pleased to offer you the position of{" "}
          <Text style={s.bold}>{data.designation}</Text> at{" "}
          <Text style={s.bold}>Gehnax Technologies LLP</Text> ("the Company"). We are confident
          that your association with us will be both exciting and rewarding, contributing to your
          personal growth as well as the Company's success.
        </Text>

        <Text style={s.termsIntro}>The following are the terms of our offer:</Text>

        {/* 1) Date of Joining */}
        <View style={s.termRow}>
          <Text style={s.termNum}>1)</Text>
          <Text style={s.termBody}>
            <Text style={s.termBold}>Date of Joining: </Text>
            We look forward to you joining our team on or before{" "}
            <Text style={s.termBold}>{data.joiningDate}</Text>
          </Text>
        </View>

        {/* 2) Location */}
        <View style={s.termRow}>
          <Text style={s.termNum}>2)</Text>
          <Text style={s.termBody}>
            <Text style={s.termBold}>Location: </Text>
            Your place of posting will be <Text style={s.termBold}>New Delhi, India.</Text>
          </Text>
        </View>

        {/* 3) Compensation & Benefits */}
        <View style={s.termRow}>
          <Text style={s.termNum}>3)</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.termBody, { fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 4 }]}>
              Compensation &amp; Benefits:
            </Text>
            <View style={s.subRow}>
              <Text style={s.subLbl}>a.</Text>
              <Text style={s.subBody}>
                <Text style={s.subBold}>Total CTC — </Text>
                Your total annual remuneration (CTC) will be{" "}
                <Text style={s.subBold}>INR {fmt(sal.annualCTC)}</Text>
                {" "}(INR <Text style={s.subBold}>{toWords(sal.annualCTC)}</Text>). Details of your
                CTC breakup are enumerated in the{" "}
                <Text style={s.subBold}>Salary Annexure – 1</Text> below.
              </Text>
            </View>
            <View style={s.subRow}>
              <Text style={s.subLbl}>b.</Text>
              <Text style={s.subBody}>
                <Text style={s.subBold}>Obligatory Deductions — </Text>
                Deductions for income tax, Provident Fund contributions, or any lawful contributions
                or schemes established and applicable to the Company will be made from your salary,
                either retrospectively or prospectively.
              </Text>
            </View>
          </View>
        </View>

        {/* 4) Leaves */}
        <View style={s.termRow}>
          <Text style={s.termNum}>4)</Text>
          <Text style={s.termBody}>
            <Text style={s.termBold}>Leaves: </Text>
            You will be eligible for Earned Leaves as per the current leave policy. The right to
            Earned Leave will accrue pro-rata during each calendar month of employment.
          </Text>
        </View>

        {/* 5) Probation */}
        <View style={s.termRow}>
          <Text style={s.termNum}>5)</Text>
          <Text style={s.termBody}>
            <Text style={s.termBold}>Probation Period: </Text>
            Your probation period will be three (3) months from your date of joining. The Company
            may extend this based on your performance.
          </Text>
        </View>

        {/* 6) Notice */}
        <View style={s.termRow}>
          <Text style={s.termNum}>6)</Text>
          <Text style={s.termBody}>
            <Text style={s.termBold}>Notice Period: </Text>
            Your employment with the Company may be terminated with a 7-day notice during the
            probation period, and a thirty (30) day notice after the successful completion of the
            probation period.
          </Text>
        </View>

        {/* 7) BGV */}
        <View style={s.termRow}>
          <Text style={s.termNum}>7)</Text>
          <Text style={s.termBody}>
            <Text style={s.termBold}>Reference Check &amp; Background Verification: </Text>
            The Company reserves the right to conduct background checks, either before or after your
            joining date, to verify your identity, address, educational qualifications, previous work
            experience (if applicable), and perform any necessary criminal checks. You explicitly
            consent to the Company carrying out these background checks. For this purpose, you are
            required to provide the documents listed in{" "}
            <Text style={s.termBold}>Annexure – 2.</Text>
            {"\n"}If any concerns arise during the background check, the Company reserves the right
            to revoke your offer or terminate your employment if you have already joined.
          </Text>
        </View>

        {/* 8) Appointment letter */}
        <View style={s.termRow}>
          <Text style={s.termNum}>8)</Text>
          <Text style={s.termBody}>
            A detailed Letter of Appointment, including all annexures, clauses, and terms and
            conditions, will be provided to you on your joining date.
          </Text>
        </View>

        {/* Closing */}
        <Text style={s.closing}>
          We kindly request you to acknowledge this offer by returning a signed copy within{" "}
          <Text style={s.bold}>2 (two) working days.</Text> We look forward to a long and
          rewarding association with you. Wishing you all the best for a successful career at
          Gehnax Technologies LLP.
        </Text>

        <Text style={s.sincerely}>Sincerely,</Text>
        <Text style={s.sigName}>Authorised Signatory</Text>
        <Text style={s.sigTitle}>Head – Human Resources</Text>
        <Text style={s.sigTitle}>Gehnax Technologies LLP</Text>

        {/* ── Acceptance & Declaration ── */}
        <View style={s.acceptSep} />
        <Text style={s.acceptTitle}>Acceptance and Declaration</Text>

        <Text style={s.acceptPara}>
          I have read and understood all the terms and conditions outlined in the offer letter and
          have sought clarifications where necessary. I hereby accept the Offer Letter and agree to
          each of its terms and conditions. I also agree to maintain confidentiality regarding the same.
        </Text>
        <Text style={s.acceptPara}>
          I acknowledge that the terms of this letter, along with any information shared with me
          during my employment with the Company, are strictly confidential and shall not be disclosed,
          used, copied, published, or otherwise utilized without the Company's express written
          authorization. These terms shall always remain confidential.
        </Text>
        <Text style={s.acceptPara}>
          I understand that the Company reserves the right to modify the Terms of Employment from
          time to time in accordance with organizational policies.
        </Text>
        <Text style={s.acceptPara}>
          By signing below, I signify my acceptance of the Offer Letter, including the terms detailed
          in <Text style={{ fontFamily: "Helvetica-Bold" }}>"Annexure 1 to 4."</Text>
        </Text>

        <View style={s.acceptRow}>
          <View>
            <Text style={s.acceptFieldLbl}>Name: {data.employeeName}</Text>
            <View style={s.acceptLine} />
            <Text style={s.acceptLineSub}>Signature</Text>
          </View>
          <View>
            <Text style={s.acceptFieldLbl}>Date: {data.generatedDate}</Text>
          </View>
        </View>

        <Ftr />
      </Page>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 2 — Annexure-1: Salary Structure
      ══════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <Hdr />

        <Text style={s.annexTitle}>Annexure – 1</Text>
        <Text style={s.annexSub}>
          {data.employeeName}  ·  {data.designation}  ·  {data.department}  ·  Effective from {data.joiningDate}
        </Text>

        <View style={s.table}>
          {/* EARNINGS */}
          <View style={s.tHdEarn}>
            <Text style={[s.tHdTxt, s.col1]}>Earnings</Text>
            <Text style={[s.tHdTxt, s.col2]}>Monthly</Text>
            <Text style={[s.tHdTxt, s.col3]}>Yearly</Text>
          </View>
          <View style={s.tRow}>
            <Text style={[s.tCell, s.col1]}>Basic Salary</Text>
            <Text style={[s.tCell, s.col2]}>{fmt(sal.basic)}</Text>
            <Text style={[s.tCell, s.col3]}>{fmt(sal.basic * 12)}</Text>
          </View>
          <View style={s.tRowAlt}>
            <Text style={[s.tCell, s.col1]}>HRA</Text>
            <Text style={[s.tCell, s.col2]}>{fmt(sal.hra)}</Text>
            <Text style={[s.tCell, s.col3]}>{fmt(sal.hra * 12)}</Text>
          </View>
          <View style={s.tRow}>
            <Text style={[s.tCell, s.col1]}>Special Allowance</Text>
            <Text style={[s.tCell, s.col2]}>{fmt(sal.allowances)}</Text>
            <Text style={[s.tCell, s.col3]}>{fmt(sal.allowances * 12)}</Text>
          </View>
          <View style={s.tRowSub}>
            <Text style={[s.tCellBold, s.col1]}>SUB-TOTAL (A)</Text>
            <Text style={[s.tCellBold, s.col2]}>{fmt(sal.grossMonthly)}</Text>
            <Text style={[s.tCellBold, s.col3]}>{fmt(sal.grossAnnual)}</Text>
          </View>

          {/* BENEFITS & CONTRIBUTIONS */}
          <View style={s.tHdBen}>
            <Text style={[s.tHdTxt, { flex: 1 }]}>Benefits and Contributions (Part - B)</Text>
          </View>
          <View style={s.tRow}>
            <Text style={[s.tCell, s.col1]}>PF – Employer</Text>
            <Text style={[s.tCell, s.col2]}>{fmt(sal.employerPF)}</Text>
            <Text style={[s.tCell, s.col3]}>{fmt(sal.employerPF * 12)}</Text>
          </View>
          <View style={s.tRowAlt}>
            <Text style={[s.tCell, s.col1]}>Gratuity (Payment of Gratuity Act, 1972)</Text>
            <Text style={[s.tCell, s.col2]}>{fmt(sal.gratuity)}</Text>
            <Text style={[s.tCell, s.col3]}>{fmt(sal.gratuity * 12)}</Text>
          </View>
          <View style={s.tRowSub}>
            <Text style={[s.tCellBold, s.col1]}>SUB-TOTAL (B)</Text>
            <Text style={[s.tCellBold, s.col2]}>{fmt(subTotalB)}</Text>
            <Text style={[s.tCellBold, s.col3]}>{fmt(subTotalB * 12)}</Text>
          </View>
          <View style={s.tRowTot}>
            <Text style={[s.tCellBlue, s.col1]}>TOTAL (A + B)</Text>
            <Text style={[s.tCellBlue, s.col2]}>INR {fmt(ctcMonthly)}</Text>
            <Text style={[s.tCellBlue, s.col3]}>INR {fmt(sal.annualCTC)}</Text>
          </View>

          {/* DEDUCTIONS */}
          <View style={s.tHdDed}>
            <Text style={[s.tHdTxt, s.col1]}>Deductions</Text>
            <Text style={[s.tHdTxt, s.col2]}>Monthly</Text>
            <Text style={[s.tHdTxt, s.col3]}>Yearly</Text>
          </View>
          <View style={s.tRow}>
            <Text style={[s.tCell, s.col1]}>PF Employee</Text>
            <Text style={[s.tCell, s.col2]}>{fmt(sal.employeePF)}</Text>
            <Text style={[s.tCell, s.col3]}>{fmt(sal.employeePF * 12)}</Text>
          </View>
          {sal.esi > 0 && (
            <View style={s.tRowAlt}>
              <Text style={[s.tCell, s.col1]}>ESI</Text>
              <Text style={[s.tCell, s.col2]}>{fmt(sal.esi)}</Text>
              <Text style={[s.tCell, s.col3]}>{fmt(sal.esi * 12)}</Text>
            </View>
          )}
          {sal.tds > 0 && (
            <View style={sal.esi > 0 ? s.tRow : s.tRowAlt}>
              <Text style={[s.tCell, s.col1]}>Income Tax (TDS)</Text>
              <Text style={[s.tCell, s.col2]}>{fmt(sal.tds)}</Text>
              <Text style={[s.tCell, s.col3]}>{fmt(sal.tds * 12)}</Text>
            </View>
          )}
          <View style={s.tRowSub}>
            <Text style={[s.tCellBold, s.col1]}>TOTAL DEDUCTIONS (D)</Text>
            <Text style={[s.tCellBold, s.col2]}>INR {fmt(sal.totalDeductions)}</Text>
            <Text style={[s.tCellBold, s.col3]}>INR {fmt(sal.totalDeductions * 12)}</Text>
          </View>
          <View style={s.tRowNet}>
            <Text style={[s.tCellGreen, s.col1]}>NET PAY (A – D)</Text>
            <Text style={[s.tCellGreen, s.col2]}>INR {fmt(sal.netMonthly)}</Text>
            <Text style={[s.tCellGreen, s.col3]}>INR {fmt(sal.netMonthly * 12)}</Text>
          </View>
        </View>

        {/* Verification */}
        <View style={s.verifyBox}>
          <Text style={s.verifyHead}>Offer Letter Verification</Text>
          <Text style={s.verifyText}>Verify this offer letter online at: </Text>
          <Text style={s.verifyUrl}>{data.verificationUrl}</Text>
        </View>

        {/* Signature */}
        <Text style={[s.bgvSigLbl, { marginTop: 22 }]}>Signature:</Text>
        <View style={[s.acceptLine, { marginTop: 28, marginBottom: 4 }]} />
        <Text style={s.bgvSigName}>{data.employeeName}</Text>

        <Ftr />
      </Page>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 3 — Annexure-2: Documents Required
      ══════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <Hdr />

        <View style={{ marginTop: 80 }}>
          <Text style={s.annexTitle}>Annexure – 2</Text>
          <Text style={s.annexLabel}>Documents Required</Text>

          <Text style={[s.para, { marginBottom: 14 }]}>
            The offer is extended to you subject to the following pre-conditions, without which the
            offer may be considered <Text style={s.bold}>null and void.</Text>
          </Text>
          <Text style={[s.para, { marginBottom: 20 }]}>
            You are required to submit the following documents in soft copy and update all necessary
            details before the date of joining, if not already provided, within{" "}
            <Text style={s.bold}>10 days of the offer release.</Text> In the case of early joining,
            the required updates should be completed prior to your joining date.
          </Text>

          {[
            "Updated Resume.",
            "Latest passport-sized photograph — 2 Nos.",
            "Highest educational degree held and Final Year Marksheet.",
            "Other professional qualification certificate(s), if any.",
            "Residence Proof (Passport / Aadhaar Card / Voter Card).",
            "Identity Proof (PAN Card / Passport / Driving License / Voter ID).",
            "Relieving & Experience letter of all previous employments.",
            "Appointment, Relieving & Experience letter of current employment.",
            "Salary slips of last 3 months of your current employment.",
          ].map((doc, i) => (
            <View key={i} style={s.docItem}>
              <Text style={s.docLbl}>{String.fromCharCode(97 + i)}.</Text>
              <Text style={s.docText}>{doc}</Text>
            </View>
          ))}
        </View>

        <Ftr />
      </Page>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 4 — Annexure-3: Background Verification Consent
      ══════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <Hdr />

        <View style={{ marginTop: 80 }}>
          <Text style={s.annexTitle}>Annexure – 3</Text>
          <Text style={s.annexLabel}>Background Verification Consent Form</Text>

          <Text style={s.annexName}>{data.employeeName}</Text>
          <Text style={s.annexRef}>Ref: Offer letter dated {data.generatedDate}</Text>

          <Text style={s.bgvPara}>
            I understand that my employment is contingent and will stand valid subject to the
            successful completion of background verification as mentioned in the offer/appointment letter.
          </Text>
          <Text style={s.bgvPara}>
            I understand and agree that Gehnax Technologies LLP reserves the right to take the
            necessary action in case any discrepancy is found in the Background Verification.
          </Text>
          <Text style={s.bgvPara}>
            I provide my consent to do the background verification by the assigned vendor of
            Gehnax Technologies LLP.
          </Text>

          <Text style={s.bgvSigLbl}>Signature:</Text>
          <View style={[s.acceptLine, { marginTop: 28, marginBottom: 5 }]} />
          <Text style={s.bgvSigName}>Name: {data.employeeName}</Text>
          <Text style={s.bgvDate}>Date: {data.generatedDate}</Text>
        </View>

        <Ftr />
      </Page>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 5 — Annexure-4: Self-Declaration for Medical Fitness
      ══════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <Hdr />

        <View style={{ marginTop: 80 }}>
          <Text style={s.annexTitle}>Annexure – 4</Text>
          <Text style={s.annexLabel}>Self-Declaration for Medical Fitness</Text>

          <Text style={s.annexName}>{data.employeeName}</Text>
          <Text style={s.annexRef}>Ref: Offer letter dated {data.generatedDate}</Text>

          <Text style={s.bgvPara}>
            I understand that my employment with Gehnax Technologies LLP is conditional upon my
            suitability for the position and my ability to fully meet the inherent requirements of the role.
          </Text>
          <Text style={s.bgvPara}>
            When completing the health declaration, I, as an applicant, do so with full knowledge of the
            position as outlined in the relevant role statement and/or selection criteria.
          </Text>
          <Text style={s.bgvPara}>
            I confirm that I do not have any pre-existing illness, disease, injury, ailment, or condition
            that I am aware of, which could reasonably be expected to affect my ability to perform the
            duties of the proposed employment.
          </Text>

          <Text style={s.bgvPara}>
            Declaration of any pre-existing disease (Please list below if any, or put NA):
          </Text>
          <View style={s.medBlank} />
          <View style={s.medBlank} />

          <Text style={s.bgvPara}>
            If any circumstances change that may impact my ability to perform the inherent requirements
            of the position I am undertaking, I am obligated to promptly inform my reporting manager or HR.
          </Text>

          <Text style={s.bgvSigLbl}>Signature:</Text>
          <View style={[s.acceptLine, { marginTop: 28, marginBottom: 5 }]} />
          <Text style={s.bgvSigName}>Name: {data.employeeName}</Text>
          <Text style={s.bgvDate}>Date: {data.generatedDate}</Text>
        </View>

        <Ftr />
      </Page>
    </Document>
  );
}

export async function generateOfferLetterBuffer(data: OfferLetterData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(<OfferLetterPDF data={data} /> as any) as Promise<Buffer>;
}
