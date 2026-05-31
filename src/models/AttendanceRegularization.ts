import mongoose, { Schema, Document } from "mongoose";

export interface IAttendanceRegularization extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  date: Date;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewComments?: string;
  createdAt: Date;
  updatedAt: Date;
}

const Schema_ = new Schema<IAttendanceRegularization>(
  {
    employeeId:          { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    date:                { type: Date, required: true },
    requestedCheckIn:    { type: String, required: true },
    requestedCheckOut:   { type: String, required: true },
    reason:              { type: String, required: true },
    status:              { type: String, enum: ["pending","approved","rejected"], default: "pending" },
    reviewedBy:          { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt:          { type: Date },
    reviewComments:      { type: String },
  },
  { timestamps: true }
);

// Prevent duplicate pending requests for same employee+date
Schema_.index({ employeeId: 1, date: 1, status: 1 });

export default mongoose.models.AttendanceRegularization ||
  mongoose.model<IAttendanceRegularization>("AttendanceRegularization", Schema_);
