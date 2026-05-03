import mongoose, { Schema, Document } from "mongoose";

export interface IJobPosting extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  department?: mongoose.Types.ObjectId;
  description?: string;
  requirements: string[];
  positions: number;
  experienceMin: number;
  experienceMax: number;
  salaryMin?: number;
  salaryMax?: number;
  location: string;
  jobType: "full_time" | "part_time" | "contract" | "intern";
  status: "draft" | "open" | "closed" | "on_hold";
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const JobPostingSchema = new Schema<IJobPosting>(
  {
    title: { type: String, required: true, trim: true },
    department: { type: Schema.Types.ObjectId, ref: "Department" },
    description: { type: String },
    requirements: [{ type: String }],
    positions: { type: Number, default: 1 },
    experienceMin: { type: Number, default: 0 },
    experienceMax: { type: Number, default: 5 },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    location: { type: String, default: "India" },
    jobType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "intern"],
      default: "full_time",
    },
    status: {
      type: String,
      enum: ["draft", "open", "closed", "on_hold"],
      default: "open",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.models.JobPosting ||
  mongoose.model<IJobPosting>("JobPosting", JobPostingSchema);
