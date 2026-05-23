import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

export interface SalarySlipData {
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  month: number;
  year: number;
  payPeriod: string;
  presentDays: number;
  workingDays: number;
  leaveDays: number;
  earnings: {
    basic: number;
    hra: number;
    allowances: number;
    overtime: number;
    bonus: number;
  };
  deductions: {
    pf: number;
    esi: number;
    tax: number;
    advance: number;
    other: number;
  };
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  generatedDate: string;
}

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmt(n: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

const BLUE   = "#1d4ed8";
const DARK   = "#1e293b";
const GRAY   = "#64748b";
const LIGHT  = "#f8fafc";
const BORDER = "#e2e8f0";
const GREEN  = "#16a34a";
const RED    = "#dc2626";
const LBLUE  = "#dbeafe";
const LRED   = "#fee2e2";
const LGREEN = "#dcfce7";

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

  // Header
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
  coName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: BLUE },
  coSub:  { fontSize: 7.5, color: GRAY, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  headerRightText: { fontSize: 8, color: GRAY, marginTop: 1 },

  // Title
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: BLUE,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  statusBadge: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    borderWidth: 1,
    borderColor: GREEN,
    borderStyle: "solid",
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    textTransform: "uppercase",
  },

  // Employee info grid
  infoBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: LIGHT,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
    borderLeftStyle: "solid",
    padding: 10,
    marginBottom: 14,
    gap: 0,
  },
  infoItem: { width: "33%", marginBottom: 8 },
  infoLabel: { fontSize: 7.5, color: GRAY, marginBottom: 1.5 },
  infoVal:   { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: DARK },

  // Attendance bar
  attBox: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: LBLUE,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  attItem: { alignItems: "center" },
  attNum:  { fontSize: 16, fontFamily: "Helvetica-Bold", color: BLUE },
  attLbl:  { fontSize: 7, color: GRAY, marginTop: 1 },

  // Section header
  secHeader: {
    flexDirection: "row",
    backgroundColor: BLUE,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  secHeaderText: { color: "#fff", fontSize: 8.5, fontFamily: "Helvetica-Bold" },

  // Table
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: "solid",
    borderRadius: 4,
    marginBottom: 10,
    overflow: "hidden",
  },
  tRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: "solid",
  },
  tRowAlt:   { backgroundColor: LIGHT },
  tRowTotal: { backgroundColor: LBLUE },
  tCell:     { fontSize: 8.5, color: DARK },
  tCellBold: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: DARK },
  tCellRed:  { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: RED },
  col1: { flex: 3 },
  col2: { flex: 2, textAlign: "right" },

  // Two column layout
  twoCol: { flexDirection: "row", gap: 10, marginBottom: 10 },
  colHalf: { flex: 1 },

  // Net pay box
  netBox: {
    backgroundColor: LGREEN,
    borderWidth: 1,
    borderColor: "#86efac",
    borderStyle: "solid",
    borderRadius: 4,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  netLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: GREEN },
  netAmt:   { fontSize: 18, fontFamily: "Helvetica-Bold", color: GREEN },
  netSub:   { fontSize: 7.5, color: GRAY, marginTop: 2 },

  // Sig row
  sigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  sigLine: {
    borderTopWidth: 1,
    borderTopColor: DARK,
    borderTopStyle: "solid",
    width: 130,
    marginTop: 20,
    marginBottom: 3,
  },
  sigLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: DARK },
  sigSub:   { fontSize: 8, color: GRAY },

  // Note
  noteBox: {
    marginTop: 8,
    padding: 7,
    backgroundColor: "#fefce8",
    borderRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
    borderLeftStyle: "solid",
  },
  noteText: { fontSize: 7.5, color: "#92400e", lineHeight: 1.5 },

  // Footer
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
});

function EarningRow({ label, value, alt }: { label: string; value: number; alt?: boolean }) {
  return (
    <View style={alt ? [s.tRow, s.tRowAlt] : s.tRow}>
      <Text style={[s.tCell, s.col1]}>{label}</Text>
      <Text style={[s.tCell, s.col2]}>{fmt(value)}</Text>
    </View>
  );
}

function DeductionRow({ label, value, alt }: { label: string; value: number; alt?: boolean }) {
  return (
    <View style={alt ? [s.tRow, s.tRowAlt] : s.tRow}>
      <Text style={[s.tCell, s.col1]}>{label}</Text>
      <Text style={[s.tCellRed, s.col2]}>- {fmt(value)}</Text>
    </View>
  );
}

function SalarySlipPDF({ data }: { data: SalarySlipData }) {
  const monthName = MONTH_NAMES[data.month] || "";
  const earnRows = [
    { label: "Basic Salary",      value: data.earnings.basic },
    { label: "House Rent Allowance (HRA)", value: data.earnings.hra },
    { label: "Special Allowance", value: data.earnings.allowances },
    { label: "Overtime Pay",      value: data.earnings.overtime },
    { label: "Bonus",             value: data.earnings.bonus },
  ].filter((r) => r.value > 0);

  const dedRows = [
    { label: "Provident Fund (Employee 12%)", value: data.deductions.pf },
    { label: "ESI",                            value: data.deductions.esi },
    { label: "Income Tax (TDS)",               value: data.deductions.tax },
    { label: "Advance",                        value: data.deductions.advance },
    { label: "Other Deductions",               value: data.deductions.other },
  ].filter((r) => r.value > 0);

  return (
    <Document title={`Salary Slip — ${data.employeeName} — ${monthName} ${data.year}`} author="Gehnax Technologies LLP">
      <Page size="A4" style={s.page}>

        {/* Company header */}
        <View style={s.header}>
          <View>
            <Text style={s.coName}>Gehnax Technologies LLP</Text>
            <Text style={s.coSub}>Technology Solutions  |  IT Services</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerRightText}>Salary Slip</Text>
            <Text style={s.headerRightText}>Generated: {data.generatedDate}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={s.titleRow}>
          <Text style={s.title}>Salary Slip — {monthName} {data.year}</Text>
          <Text style={s.statusBadge}>{data.status}</Text>
        </View>

        {/* Employee info */}
        <View style={s.infoBox}>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Employee Name</Text>
            <Text style={s.infoVal}>{data.employeeName}</Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Employee Code</Text>
            <Text style={s.infoVal}>{data.employeeCode}</Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Pay Period</Text>
            <Text style={s.infoVal}>{monthName} {data.year}</Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Designation</Text>
            <Text style={s.infoVal}>{data.designation}</Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Department</Text>
            <Text style={s.infoVal}>{data.department}</Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Payment Status</Text>
            <Text style={s.infoVal}>{data.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Attendance */}
        <View style={s.attBox}>
          <View style={s.attItem}>
            <Text style={s.attNum}>{data.workingDays}</Text>
            <Text style={s.attLbl}>Working Days</Text>
          </View>
          <View style={s.attItem}>
            <Text style={s.attNum}>{data.presentDays}</Text>
            <Text style={s.attLbl}>Days Present</Text>
          </View>
          <View style={s.attItem}>
            <Text style={s.attNum}>{data.leaveDays}</Text>
            <Text style={s.attLbl}>Leave Days</Text>
          </View>
          <View style={s.attItem}>
            <Text style={s.attNum}>{data.workingDays - data.presentDays - data.leaveDays}</Text>
            <Text style={s.attLbl}>Absent / LOP</Text>
          </View>
        </View>

        {/* Earnings & Deductions side by side */}
        <View style={s.twoCol}>
          {/* Earnings */}
          <View style={s.colHalf}>
            <View style={s.table}>
              <View style={s.secHeader}>
                <Text style={[s.secHeaderText, s.col1]}>Earnings</Text>
                <Text style={[s.secHeaderText, s.col2]}>Amount (₹)</Text>
              </View>
              {earnRows.map((r, i) => (
                <EarningRow key={r.label} label={r.label} value={r.value} alt={i % 2 === 1} />
              ))}
              <View style={[s.tRow, s.tRowTotal]}>
                <Text style={[s.tCellBold, s.col1]}>Gross Pay</Text>
                <Text style={[s.tCellBold, s.col2]}>{fmt(data.grossPay)}</Text>
              </View>
            </View>
          </View>

          {/* Deductions */}
          <View style={s.colHalf}>
            <View style={s.table}>
              <View style={[s.secHeader, { backgroundColor: RED }]}>
                <Text style={[s.secHeaderText, s.col1]}>Deductions</Text>
                <Text style={[s.secHeaderText, s.col2]}>Amount (₹)</Text>
              </View>
              {dedRows.length === 0 ? (
                <View style={s.tRow}>
                  <Text style={[s.tCell, s.col1]}>No deductions</Text>
                  <Text style={[s.tCell, s.col2]}>—</Text>
                </View>
              ) : (
                dedRows.map((r, i) => (
                  <DeductionRow key={r.label} label={r.label} value={r.value} alt={i % 2 === 1} />
                ))
              )}
              <View style={[s.tRow, s.tRowTotal]}>
                <Text style={[s.tCellBold, s.col1]}>Total Deductions</Text>
                <Text style={[s.tCellRed, s.col2]}>- {fmt(data.totalDeductions)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Net Pay */}
        <View style={s.netBox}>
          <View>
            <Text style={s.netLabel}>NET TAKE HOME SALARY</Text>
            <Text style={s.netSub}>{monthName} {data.year}  ·  {data.presentDays}/{data.workingDays} days</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.netAmt}>₹ {fmt(data.netPay)}</Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={s.sigRow}>
          <View>
            <Text style={s.sigSub}>Employee Acknowledgement</Text>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>{data.employeeName}</Text>
            <Text style={s.sigSub}>Date: ___________________</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.sigSub}>For Gehnax Technologies LLP</Text>
            <View style={[s.sigLine, { marginLeft: "auto" }]} />
            <Text style={s.sigLabel}>Authorized Signatory</Text>
            <Text style={s.sigSub}>Human Resources Department</Text>
          </View>
        </View>

        {/* Note */}
        <View style={s.noteBox}>
          <Text style={s.noteText}>
            This is a system-generated salary slip and does not require a physical signature. This document is
            confidential and intended solely for the named employee. For any discrepancies, contact HR within
            7 working days of receipt.
          </Text>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>Gehnax Technologies LLP  |  Salary Slip — {monthName} {data.year}  |  Confidential</Text>
          <Text style={s.footerText}>{data.employeeCode}  |  {data.generatedDate}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateSalarySlipBuffer(data: SalarySlipData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(<SalarySlipPDF data={data} /> as any) as Promise<Buffer>;
}
