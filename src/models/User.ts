import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: "super_admin" | "finance_admin" | "hr_admin" | "manager" | "employee";
  employeeId?: mongoose.Types.ObjectId;
  avatar?: string;
  avatarData?: string;
  isActive: boolean;
  lastLogin?: Date;
  mfaSecret?: string;
  mfaEnabled: boolean;
  mfaSkipCount: number;
  mfaVerifiedAt?: Date;
  mfaSkippedAt?: Date;
  mfaDisabledUntil?: Date;
  mfaForceSetup: boolean;
  mustChangePassword: boolean;
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
      enum: ["super_admin", "finance_admin", "hr_admin", "manager", "employee"],
      default: "employee",
    },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    avatar: { type: String },
    avatarData: { type: String },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    mfaSecret:        { type: String, select: false },
    mfaEnabled:       { type: Boolean, default: false },
    mfaSkipCount:     { type: Number, default: 0 },
    mfaVerifiedAt:    { type: Date },
    mfaSkippedAt:     { type: Date },
    mfaDisabledUntil: { type: Date },   // super admin temp bypass
    mfaForceSetup:       { type: Boolean, default: false }, // super admin force re-register
    mustChangePassword:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
