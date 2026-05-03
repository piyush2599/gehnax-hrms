import mongoose, { Schema, Document } from "mongoose";

export interface ITimesheetEntry {
  date: Date;
  project: string;
  task: string;
  hours: number;
  description?: string;
}

export interface ITimesheet extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  weekStartDate: Date;
  weekEndDate: Date;
  entries: ITimesheetEntry[];
  totalHours: number;
  status: "draft" | "submitted" | "approved" | "rejected";
  submittedOn?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedOn?: Date;
  reviewComments?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TimesheetEntrySchema = new Schema<ITimesheetEntry>({
  date: { type: Date, required: true },
  project: { type: String, required: true },
  task: { type: String, required: true },
  hours: { type: Number, required: true, min: 0, max: 24 },
  description: { type: String },
});

const TimesheetSchema = new Schema<ITimesheet>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    weekStartDate: { type: Date, required: true },
    weekEndDate: { type: Date, required: true },
    entries: [TimesheetEntrySchema],
    totalHours: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected"],
      default: "draft",
    },
    submittedOn: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Employee" },
    reviewedOn: { type: Date },
    reviewComments: { type: String },
  },
  { timestamps: true }
);

TimesheetSchema.index({ employeeId: 1, weekStartDate: 1 }, { unique: true });

export default mongoose.models.Timesheet ||
  mongoose.model<ITimesheet>("Timesheet", TimesheetSchema);
