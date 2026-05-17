import mongoose, { Schema, Document } from "mongoose";

export interface IAttendance extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  date: Date;
  checkIn?: string; // HH:mm format
  checkOut?: string;
  status: "present" | "absent" | "half_day" | "late" | "on_leave" | "holiday" | "weekend";
  workingHours?: number;
  overtime?: number;
  notes?: string;
  location?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    date: { type: Date, required: true },
    checkIn: { type: String },
    checkOut: { type: String },
    status: {
      type: String,
      enum: ["present", "absent", "half_day", "late", "on_leave", "holiday", "weekend"],
      default: "absent",
    },
    workingHours: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    notes: { type: String },
    location: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: 1, status: 1 });

export default mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);
