import mongoose, { Schema, Document } from "mongoose";

export interface IDepartment extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  managerId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String },
    managerId: { type: Schema.Types.ObjectId, ref: "Employee" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Department ||
  mongoose.model<IDepartment>("Department", DepartmentSchema);
