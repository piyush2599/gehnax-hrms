import mongoose, { Schema, Document } from "mongoose";

export interface IHiringDocument extends Document {
  _id: mongoose.Types.ObjectId;
  candidate: mongoose.Types.ObjectId;
  docType: string;
  originalName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy?: string;
  verified: boolean;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HiringDocumentSchema = new Schema<IHiringDocument>(
  {
    candidate: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
    docType: { type: String, required: true },
    originalName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number },
    mimeType: { type: String },
    uploadedBy: { type: String },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.HiringDocument ||
  mongoose.model<IHiringDocument>("HiringDocument", HiringDocumentSchema);
