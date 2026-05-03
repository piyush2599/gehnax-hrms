import mongoose, { Schema, Document } from "mongoose";

export interface IAnnouncement extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  content: string;
  priority: "low" | "normal" | "high" | "urgent";
  targetRoles: string[];
  targetDepartments: mongoose.Types.ObjectId[];
  postedBy: mongoose.Types.ObjectId;
  attachmentUrl?: string;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    targetRoles: [{ type: String }],
    targetDepartments: [{ type: Schema.Types.ObjectId, ref: "Department" }],
    postedBy: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    attachmentUrl: { type: String },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Announcement ||
  mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema);
