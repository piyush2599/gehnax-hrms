import mongoose, { Schema, Document } from "mongoose";

export interface IOnboardingInvite extends Document {
  _id: mongoose.Types.ObjectId;
  token: string;
  employeeCode: string;
  email: string;
  personalEmail?: string;
  firstName?: string;
  lastName?: string;
  department: mongoose.Types.ObjectId;
  designation: string;
  employmentType: "full_time" | "part_time" | "contract" | "intern";
  joiningDate: Date;
  status: "pending" | "in_progress" | "submitted" | "completed" | "expired";
  expiresAt: Date;
  profilePicture?: string;
  profilePictureData?: string;
  documents?: {
    panCard?: string;
    aadhaarCard?: string;
  };
  formData?: {
    personal?: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      gender?: string;
      phone?: string;
      personalEmail?: string;
      address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        pincode?: string;
      };
    };
    identity?: {
      pan?: string;
      aadhaar?: string;
    };
    bank?: {
      accountNumber?: string;
      bankName?: string;
      ifscCode?: string;
      accountHolderName?: string;
    };
    emergency?: {
      name?: string;
      relation?: string;
      phone?: string;
    };
  };
  completedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  employeeId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OnboardingInviteSchema = new Schema<IOnboardingInvite>(
  {
    token: { type: String, required: true, unique: true },
    employeeCode: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    personalEmail: { type: String, lowercase: true, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    department: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    designation: { type: String, required: true },
    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "intern"],
      default: "full_time",
    },
    joiningDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "in_progress", "submitted", "completed", "expired"],
      default: "pending",
    },
    expiresAt: { type: Date, required: true },
    profilePicture: { type: String },
    profilePictureData: { type: String },
    documents: {
      panCard: String,
      aadhaarCard: String,
    },
    formData: {
      personal: {
        firstName: String,
        lastName: String,
        dateOfBirth: String,
        gender: String,
        phone: String,
        address: {
          street: String,
          city: String,
          state: String,
          country: { type: String, default: "India" },
          pincode: String,
        },
      },
      identity: { pan: String, aadhaar: String },
      bank: {
        accountNumber: String,
        bankName: String,
        ifscCode: String,
        accountHolderName: String,
      },
      emergency: { name: String, relation: String, phone: String },
    },
    completedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
  },
  { timestamps: true }
);

export default mongoose.models.OnboardingInvite ||
  mongoose.model<IOnboardingInvite>("OnboardingInvite", OnboardingInviteSchema);
