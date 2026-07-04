import mongoose, { Schema, Document } from "mongoose";

export interface IPayroll extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  month: number; // 1-12
  year: number;
  payPeriod: string; // "2024-01"
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
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  workingDays: number;   // total calendar days in the month (divisor)
  payableDays: number;   // paid days = join/exit window − unpaid-leave (LOP) days
  lopDays: number;       // approved Unpaid-leave days (Loss of Pay)
  presentDays: number;
  leaveDays: number;     // paid leave days (informational)
  overtimeHours: number; // stored so edits can recalculate
  status: "draft" | "processed" | "paid";
  processedBy?: mongoose.Types.ObjectId;
  processedOn?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedOn?: Date;
  paidOn?: Date;
  payslipUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollSchema = new Schema<IPayroll>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    payPeriod: { type: String, required: true }, // e.g., "2024-01"
    earnings: {
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
      overtime: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      arrears: { type: Number, default: 0 },
    },
    deductions: {
      pf: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      advance: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    grossPay: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    workingDays: { type: Number, default: 0 },
    payableDays: { type: Number, default: 0 },
    lopDays:      { type: Number, default: 0 },
    presentDays:  { type: Number, default: 0 },
    leaveDays:    { type: Number, default: 0 },
    overtimeHours:{ type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "processed", "paid"],
      default: "draft",
    },
    processedBy: { type: Schema.Types.ObjectId, ref: "Employee" },
    processedOn: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: "Employee" },
    approvedOn: { type: Date },
    paidOn: { type: Date },
    payslipUrl: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

PayrollSchema.index({ employeeId: 1, payPeriod: 1 }, { unique: true });

export default mongoose.models.Payroll ||
  mongoose.model<IPayroll>("Payroll", PayrollSchema);
