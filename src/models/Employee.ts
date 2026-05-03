import mongoose, { Schema, Document } from "mongoose";

export interface IEmployee extends Document {
  _id: mongoose.Types.ObjectId;
  employeeCode: string;
  userId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other";
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  department: mongoose.Types.ObjectId;
  designation: string;
  employmentType: "full_time" | "part_time" | "contract" | "intern";
  joiningDate: Date;
  probationEndDate?: Date;
  reportingManager?: mongoose.Types.ObjectId;
  salary: {
    basic: number;
    hra: number;
    allowances: number;
    deductions: number;
  };
  bankDetails?: {
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    accountHolderName?: string;
  };
  documents: Array<{
    name: string;
    type: string;
    fileUrl: string;
    uploadedAt: Date;
  }>;
  avatar?: string;
  isActive: boolean;
  terminationDate?: Date;
  terminationReason?: string;
  leaveBalance: {
    annual: number;
    sick: number;
    casual: number;
    maternity: number;
    paternity: number;
    unpaid: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    employeeCode: { type: String, required: true, unique: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    address: {
      street: String,
      city: String,
      state: String,
      country: { type: String, default: "India" },
      pincode: String,
    },
    department: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    designation: { type: String, required: true },
    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "intern"],
      default: "full_time",
    },
    joiningDate: { type: Date, required: true },
    probationEndDate: { type: Date },
    reportingManager: { type: Schema.Types.ObjectId, ref: "Employee" },
    salary: {
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
      deductions: { type: Number, default: 0 },
    },
    bankDetails: {
      accountNumber: String,
      bankName: String,
      ifscCode: String,
      accountHolderName: String,
    },
    documents: [
      {
        name: String,
        type: String,
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    terminationDate: { type: Date },
    terminationReason: { type: String },
    leaveBalance: {
      annual: { type: Number, default: 12 },
      sick: { type: Number, default: 7 },
      casual: { type: Number, default: 7 },
      maternity: { type: Number, default: 0 },
      paternity: { type: Number, default: 0 },
      unpaid: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

EmployeeSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

export default mongoose.models.Employee ||
  mongoose.model<IEmployee>("Employee", EmployeeSchema);
