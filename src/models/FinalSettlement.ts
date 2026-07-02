import mongoose, { Schema, Document } from "mongoose";

/**
 * Full & Final settlement for a departing employee.
 * Computed from the salary structure, last working day, leave balance,
 * outstanding advances and (optional) notice-period recovery.
 */
export interface IFinalSettlement extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  lastWorkingDay: Date;
  settlementDate: Date;

  // Earnings
  salaryPayable: number;        // pro-rated salary for the final month up to LWD
  leaveEncashment: number;      // unused leave × per-day basic
  gratuity: number;             // if eligible (≥5 yrs) — informational
  bonus: number;
  otherEarnings: number;

  // Deductions
  advanceRecovery: number;      // outstanding advance balance
  noticeRecovery: number;       // shortfall in notice period
  tds: number;
  otherDeductions: number;

  grossPayable: number;
  totalDeductions: number;
  netSettlement: number;

  encashableLeaves: number;
  notes?: string;
  status: "draft" | "approved" | "paid";
  processedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FinalSettlementSchema = new Schema<IFinalSettlement>(
  {
    employeeId:     { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    lastWorkingDay: { type: Date, required: true },
    settlementDate: { type: Date, default: Date.now },

    salaryPayable:   { type: Number, default: 0 },
    leaveEncashment: { type: Number, default: 0 },
    gratuity:        { type: Number, default: 0 },
    bonus:           { type: Number, default: 0 },
    otherEarnings:   { type: Number, default: 0 },

    advanceRecovery: { type: Number, default: 0 },
    noticeRecovery:  { type: Number, default: 0 },
    tds:             { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },

    grossPayable:    { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netSettlement:   { type: Number, default: 0 },

    encashableLeaves: { type: Number, default: 0 },
    notes:  { type: String },
    status: { type: String, enum: ["draft", "approved", "paid"], default: "draft" },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

FinalSettlementSchema.index({ employeeId: 1 }, { unique: true });

export default mongoose.models.FinalSettlement ||
  mongoose.model<IFinalSettlement>("FinalSettlement", FinalSettlementSchema);
