import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "super_admin" | "finance_admin" | "hr_admin" | "manager" | "employee" | "sales";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  roles: UserRole[];
  /** @deprecated Use roles[] instead — kept for zero-downtime migration */
  role?: UserRole;
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
  rolesActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    roles: {
      type: [String],
      enum: ["super_admin", "finance_admin", "hr_admin", "manager", "employee", "sales"],
      default: ["employee"],
    },
    role: {
      type: String,
      enum: ["super_admin", "finance_admin", "hr_admin", "manager", "employee", "sales"],
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
    rolesActive:         { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
