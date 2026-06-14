import mongoose, { Schema, Document } from "mongoose";

export type CRMStage    = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export type CRMPriority = "low" | "medium" | "high" | "urgent";
export type CRMSource   = "cold_call" | "referral" | "website" | "linkedin" | "email_campaign" | "event" | "partner" | "inbound" | "other";
export type CRMActivityType = "call" | "email" | "meeting" | "note" | "task";

export const STAGE_DEFAULT_PROBABILITY: Record<CRMStage, number> = {
  new: 10, contacted: 20, qualified: 40,
  proposal: 60, negotiation: 80, won: 100, lost: 0,
};

export interface ICRMActivity {
  _id?: mongoose.Types.ObjectId;
  type: CRMActivityType;
  title: string;
  description?: string;
  outcome?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface ICRMStageHistory {
  _id?: mongoose.Types.ObjectId;
  stage: CRMStage;
  probability: number;
  changedBy?: mongoose.Types.ObjectId;
  changedAt: Date;
  note?: string;
}

export interface ICRMLead extends Document {
  _id: mongoose.Types.ObjectId;
  leadNumber: string;
  title: string;
  accountName: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  contactDesignation?: string;
  value: number;
  currency: string;
  stage: CRMStage;
  probability: number;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  source: CRMSource;
  priority: CRMPriority;
  product?: string;
  description?: string;
  assignedTo?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  lossReason?: string;
  notes?: string;
  tags?: string[];
  stageHistory: ICRMStageHistory[];
  activities: ICRMActivity[];
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<ICRMActivity>({
  type:        { type: String, enum: ["call","email","meeting","note","task"], required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String },
  outcome:     { type: String },
  createdBy:   { type: Schema.Types.ObjectId, ref: "User" },
  createdAt:   { type: Date, default: Date.now },
}, { _id: true });

const StageHistorySchema = new Schema<ICRMStageHistory>({
  stage:       { type: String, required: true },
  probability: { type: Number, required: true },
  changedBy:   { type: Schema.Types.ObjectId, ref: "User" },
  changedAt:   { type: Date, default: Date.now },
  note:        { type: String },
}, { _id: true });

const CRMLeadSchema = new Schema<ICRMLead>(
  {
    leadNumber:         { type: String, required: true, unique: true },
    title:              { type: String, required: true, trim: true },
    accountName:        { type: String, required: true, trim: true },
    contactName:        { type: String, required: true, trim: true },
    contactEmail:       { type: String, trim: true, lowercase: true },
    contactPhone:       { type: String },
    contactDesignation: { type: String },
    value:              { type: Number, default: 0, min: 0 },
    currency:           { type: String, default: "INR" },
    stage: {
      type: String,
      enum: ["new","contacted","qualified","proposal","negotiation","won","lost"],
      default: "new",
    },
    probability:       { type: Number, default: 10, min: 0, max: 100 },
    expectedCloseDate: { type: Date },
    actualCloseDate:   { type: Date },
    source: {
      type: String,
      enum: ["cold_call","referral","website","linkedin","email_campaign","event","partner","inbound","other"],
      default: "other",
    },
    priority: {
      type: String,
      enum: ["low","medium","high","urgent"],
      default: "medium",
    },
    product:     { type: String },
    description: { type: String },
    assignedTo:  { type: Schema.Types.ObjectId, ref: "Employee" },
    createdBy:   { type: Schema.Types.ObjectId, ref: "User" },
    lossReason:  { type: String },
    notes:       { type: String },
    tags:        [{ type: String }],
    stageHistory: [StageHistorySchema],
    activities:   [ActivitySchema],
  },
  { timestamps: true }
);

CRMLeadSchema.index({ stage: 1, createdAt: -1 });
CRMLeadSchema.index({ assignedTo: 1 });
CRMLeadSchema.index({ accountName: 1 });

export default mongoose.models.CRMLead ||
  mongoose.model<ICRMLead>("CRMLead", CRMLeadSchema);
