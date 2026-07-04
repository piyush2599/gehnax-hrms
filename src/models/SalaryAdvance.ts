import mongoose, { Schema, Document } from "mongoose";

/**
 * Salary advance / loan given to an employee, recovered monthly via payroll.
 * Each payroll run deducts min(emiAmount, balance) and appends an installment.
 */
export interface IAdvanceInstallment {
  payrollId?: mongoose.Types.ObjectId;
  payPeriod: string;         // "2026-07"
  amount: number;
  date: Date;
}

export interface ISalaryAdvance extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  principal: number;         // total amount advanced
  emiAmount: number;         // monthly recovery
  balance: number;           // outstanding
  startPeriod: string;       // "2026-07" — first month to start recovery
  reason?: string;
  status: "active" | "closed" | "cancelled";
  installments: IAdvanceInstallment[];
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SalaryAdvanceSchema = new Schema<ISalaryAdvance>(
  {
    employeeId:  { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    principal:   { type: Number, required: true, min: 0 },
    emiAmount:   { type: Number, required: true, min: 0 },
    balance:     { type: Number, required: true, min: 0 },
    startPeriod: { type: String, required: true },
    reason:      { type: String },
    status: {
      type: String,
      enum: ["active", "closed", "cancelled"],
      default: "active",
    },
    installments: [
      {
        payrollId: { type: Schema.Types.ObjectId, ref: "Payroll" },
        payPeriod: { type: String },
        amount:    { type: Number },
        date:      { type: Date, default: Date.now },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

SalaryAdvanceSchema.index({ employeeId: 1, status: 1 });

export default mongoose.models.SalaryAdvance ||
  mongoose.model<ISalaryAdvance>("SalaryAdvance", SalaryAdvanceSchema);
