import mongoose, { Schema, Document } from "mongoose";

export interface ICandidate extends Document {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobPosting: mongoose.Types.ObjectId;
  currentCompany?: string;
  currentDesignation?: string;
  totalExperience: number;
  skills: string[];
  stage: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
  source: "linkedin" | "referral" | "direct" | "job_portal" | "other";
  resumeUrl?: string;
  notes?: string;
  interviewNotes?: string;
  offer?: {
    ctc?: number;
    joiningDate?: Date;
    designation?: string;
    isMetro: boolean;
    generatedAt?: Date;
    sentAt?: Date;
    acceptedAt?: Date;
    expiresAt?: Date;
    status: "draft" | "sent" | "accepted" | "declined" | "expired";
  };
  rejectionReason?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CandidateSchema = new Schema<ICandidate>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String },
    jobPosting: { type: Schema.Types.ObjectId, ref: "JobPosting", required: true },
    currentCompany: { type: String },
    currentDesignation: { type: String },
    totalExperience: { type: Number, default: 0 },
    skills: [{ type: String }],
    stage: {
      type: String,
      enum: ["applied", "screening", "interview", "offer", "hired", "rejected"],
      default: "applied",
    },
    source: {
      type: String,
      enum: ["linkedin", "referral", "direct", "job_portal", "other"],
      default: "direct",
    },
    resumeUrl: { type: String },
    notes: { type: String },
    interviewNotes: { type: String },
    offer: {
      ctc: { type: Number },
      joiningDate: { type: Date },
      designation: { type: String },
      isMetro: { type: Boolean, default: true },
      generatedAt: { type: Date },
      sentAt: { type: Date },
      acceptedAt: { type: Date },
      expiresAt: { type: Date },
      status: {
        type: String,
        enum: ["draft", "sent", "accepted", "declined", "expired"],
        default: "draft",
      },
    },
    rejectionReason: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.models.Candidate ||
  mongoose.model<ICandidate>("Candidate", CandidateSchema);
