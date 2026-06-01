import mongoose, { Schema, Document } from "mongoose";

export interface IInterview {
  _id: mongoose.Types.ObjectId;
  round: number;
  type: "phone" | "video" | "onsite" | "technical" | "hr_round";
  scheduledAt: Date;
  interviewer: string;
  location?: string;
  meetingLink?: string;
  meetingInvite?: string;
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
  feedback?: string;
  rating?: number;
  recommendation?: "strong_hire" | "hire" | "hold" | "no_hire";
  completedAt?: Date;
}

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
  interviews: IInterview[];
  offer?: {
    ctcAnnual?: number;
    joiningDate?: Date;
    designation?: string;
    location?: string;
    department?: string;
    reportingManager?: string;
    offerNumber?: string;
    isMetro: boolean;
    generatedAt?: Date;
    sentAt?: Date;
    acceptedAt?: Date;
    declinedAt?: Date;
    expiresAt?: Date;
    status: "draft" | "sent" | "accepted" | "declined" | "expired";
    // approval workflow
    approvalStatus?: "draft" | "pending_approval" | "approved" | "rejected";
    approvalComments?: string;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    offerPdfUrl?: string;
    offerRefNumber?: string;
    pfType?: "fixed" | "percent" | "none";
    pfValue?: number;
    includeGratuity?: boolean;
  };
  candidateAccountId?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  convertedEmployeeId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema = new Schema<IInterview>({
  round:          { type: Number, required: true },
  type:           { type: String, enum: ["phone", "video", "onsite", "technical", "hr_round"], required: true },
  scheduledAt:    { type: Date, required: true },
  interviewer:    { type: String, required: true },
  location:       { type: String },
  meetingLink:    { type: String },
  meetingInvite:  { type: String },
  status:         { type: String, enum: ["scheduled", "completed", "cancelled", "rescheduled"], default: "scheduled" },
  feedback:       { type: String },
  rating:         { type: Number, min: 1, max: 5 },
  recommendation: { type: String, enum: ["strong_hire", "hire", "hold", "no_hire"] },
  completedAt:    { type: Date },
});

const CandidateSchema = new Schema<ICandidate>(
  {
    firstName:          { type: String, required: true, trim: true },
    lastName:           { type: String, required: true, trim: true },
    email:              { type: String, required: true, lowercase: true, trim: true },
    phone:              { type: String },
    jobPosting:         { type: Schema.Types.ObjectId, ref: "JobPosting", required: true },
    currentCompany:     { type: String },
    currentDesignation: { type: String },
    totalExperience:    { type: Number, default: 0 },
    skills:             [{ type: String }],
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
    resumeUrl:      { type: String },
    notes:          { type: String },
    interviewNotes: { type: String },
    interviews:     [InterviewSchema],
    offer: {
      ctcAnnual:        { type: Number },
      joiningDate:      { type: Date },
      designation:      { type: String },
      location:         { type: String },
      department:       { type: String },
      reportingManager: { type: String },
      offerNumber:      { type: String },
      isMetro:          { type: Boolean, default: true },
      generatedAt:      { type: Date },
      sentAt:           { type: Date },
      acceptedAt:       { type: Date },
      declinedAt:       { type: Date },
      expiresAt:        { type: Date },
      status: {
        type: String,
        enum: ["draft", "sent", "accepted", "declined", "expired"],
        default: "draft",
      },
      approvalStatus: {
        type: String,
        enum: ["draft", "pending_approval", "approved", "rejected"],
        default: "draft",
      },
      approvalComments: { type: String },
      approvedBy:       { type: Schema.Types.ObjectId, ref: "User" },
      approvedAt:       { type: Date },
      offerPdfUrl:      { type: String },
      offerRefNumber:   { type: String },
      pfType:           { type: String, enum: ["fixed", "percent", "none"], default: "percent" },
      pfValue:          { type: Number, default: 12 },
      includeGratuity:  { type: Boolean, default: true },
    },
    candidateAccountId:  { type: Schema.Types.ObjectId, ref: "CandidateAccount" },
    rejectionReason:     { type: String },
    convertedEmployeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    createdBy:           { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.models.Candidate ||
  mongoose.model<ICandidate>("Candidate", CandidateSchema);
