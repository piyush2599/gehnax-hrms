import mongoose, { Schema, Document } from "mongoose";

export type ProjectStatus   = "planning" | "active" | "on_hold" | "completed" | "cancelled";
export type ProjectPriority = "low" | "medium" | "high" | "critical";
export type ProjectType     = "internal" | "client";

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  projectCode: string;
  key: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  type: ProjectType;
  priority: ProjectPriority;
  purchaseOrder?: mongoose.Types.ObjectId;
  manager?: mongoose.Types.ObjectId;
  team: mongoose.Types.ObjectId[];
  department?: mongoose.Types.ObjectId;
  startDate?: Date;
  dueDate?: Date;
  completedAt?: Date;
  tags: string[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    projectCode: { type: String, required: true, unique: true },
    key:         { type: String, required: true, unique: true, uppercase: true, maxlength: 6 },
    name:        { type: String, required: true, trim: true },
    description: { type: String },
    status:      { type: String, enum: ["planning","active","on_hold","completed","cancelled"], default: "planning" },
    type:        { type: String, enum: ["internal","client"], default: "internal" },
    priority:    { type: String, enum: ["low","medium","high","critical"], default: "medium" },
    purchaseOrder: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },
    manager:       { type: Schema.Types.ObjectId, ref: "Employee" },
    team:          [{ type: Schema.Types.ObjectId, ref: "Employee" }],
    department:    { type: Schema.Types.ObjectId, ref: "Department" },
    startDate:    { type: Date },
    dueDate:      { type: Date },
    completedAt:  { type: Date },
    tags:         [{ type: String }],
    createdBy:    { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ProjectSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);
