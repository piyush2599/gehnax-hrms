import mongoose, { Schema, Document } from "mongoose";

export interface ICandidateAccount extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  currentCompany?: string;
  currentDesignation?: string;
  totalExperience: number;
  skills: string[];
  resumeUrl?: string;
  resumeFileName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CandidateAccountSchema = new Schema<ICandidateAccount>(
  {
    email:               { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:            { type: String, required: true, select: false },
    firstName:           { type: String, required: true, trim: true },
    lastName:            { type: String, required: true, trim: true },
    phone:               { type: String },
    currentCompany:      { type: String },
    currentDesignation:  { type: String },
    totalExperience:     { type: Number, default: 0 },
    skills:              [{ type: String }],
    resumeUrl:           { type: String },
    resumeFileName:      { type: String },
    isActive:            { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.CandidateAccount ||
  mongoose.model<ICandidateAccount>("CandidateAccount", CandidateAccountSchema);
