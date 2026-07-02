import mongoose, { Schema, Document } from "mongoose";

/**
 * Immutable audit record of every salary structure an employee has had.
 * The payroll engine reads the revision effective for a given pay-period so
 * historical payslips stay accurate even after a raise.
 */
export interface ISalaryRevision extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  effectiveFrom: Date;              // first day this structure applies
  salary: {
    basic: number;
    hra: number;
    allowances: number;
    deductions?: number;
    pf?: number | null;
    tds?: number | null;
    pfType?: "fixed" | "percent" | "none";
  };
  previousSalary?: Record<string, any>;
  reason?: string;
  revisedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SalaryRevisionSchema = new Schema<ISalaryRevision>(
  {
    employeeId:    { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    effectiveFrom: { type: Date, required: true },
    salary: {
      basic:      { type: Number, default: 0 },
      hra:        { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
      deductions: { type: Number, default: 0 },
      pf:         { type: Number },
      tds:        { type: Number },
      pfType:     { type: String, enum: ["fixed", "percent", "none"] },
    },
    previousSalary: { type: Schema.Types.Mixed },
    reason:    { type: String },
    revisedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

SalaryRevisionSchema.index({ employeeId: 1, effectiveFrom: -1 });

export default mongoose.models.SalaryRevision ||
  mongoose.model<ISalaryRevision>("SalaryRevision", SalaryRevisionSchema);
