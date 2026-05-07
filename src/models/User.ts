import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: "super_admin" | "hr_admin" | "manager" | "employee";
  employeeId?: mongoose.Types.ObjectId;
  avatar?: string;
  avatarData?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["super_admin", "hr_admin", "manager", "employee"],
      default: "employee",
    },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    avatar: { type: String },
    avatarData: { type: String },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
