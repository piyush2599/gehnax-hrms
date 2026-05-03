import mongoose, { Schema, Document } from "mongoose";

export interface ILeave extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  leaveType: "Annual" | "Sick" | "Casual" | "Maternity" | "Paternity" | "Unpaid";
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  appliedOn: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedOn?: Date;
  reviewComments?: string;
  attachmentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema = new Schema<ILeave>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    leaveType: {
      type: String,
      enum: ["Annual", "Sick", "Casual", "Maternity", "Paternity", "Unpaid"],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    appliedOn: { type: Date, default: Date.now },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Employee" },
    reviewedOn: { type: Date },
    reviewComments: { type: String },
    attachmentUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Leave || mongoose.model<ILeave>("Leave", LeaveSchema);
