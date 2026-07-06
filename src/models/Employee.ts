import mongoose, { Schema, Document } from "mongoose";

export interface IEmployee extends Document {
  _id: mongoose.Types.ObjectId;
  employeeCode: string;
  userId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail?: string;
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
    deductions: number;                    // legacy: bundled PF+TDS; use pf+tds for new records
    pf: number;                            // employee PF contribution (monthly)
    tds: number;                           // income tax TDS (monthly)
    pfType?: "fixed" | "percent" | "none"; // fixed = never pro-rate; percent = scale with basic
    pfValue?: number;                      // percent when pfType==="percent" (e.g. 12); engine recomputes PF live
    esiApplicable?: boolean;               // ESI only deducted when true
    gratuityApplicable?: boolean;          // gratuity provision only when eligible (defaults to: has PF)
  };
  pendingArrears?: number;                 // back-pay queued for the next payroll run
  statutory?: {
    pan?: string;
    uan?: string;                          // PF Universal Account Number
    esicNumber?: string;                   // ESIC IP number
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
  avatarData?: string;
  isActive: boolean;
  terminationDate?: Date;
  terminationReason?: string;
  leaveBalance: {
    leaves: number;
    leaveCreditedMonth: number;
    leaveCreditedYear: number;
    // legacy fields kept for existing records
    annual?: number;
    sick?: number;
    casual?: number;
    maternity?: number;
    paternity?: number;
    unpaid?: number;
  };
  resignation?: {
    submittedAt: Date;
    lastWorkingDay: Date;
    reason?: string;
    status: "pending" | "accepted" | "withdrawn";
    acceptedBy?: mongoose.Types.ObjectId;
    acceptedAt?: Date;
    hrNotes?: string;
  };
  pip?: {
    status: "active" | "completed" | "cancelled";
    startDate: Date;
    endDate: Date;
    goals: string;
    reviewDate?: Date;
    notes?: string;
    initiatedBy?: mongoose.Types.ObjectId;
    initiatedAt: Date;
    completedAt?: Date;
  };
  gpsRequired?: boolean;
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
    personalEmail: { type: String, lowercase: true, trim: true },
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
      basic:      { type: Number, default: 0 },
      hra:        { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
      deductions: { type: Number, default: 0 },
      pf:         { type: Number },
      tds:        { type: Number },
      pfType:     { type: String, enum: ["fixed", "percent", "none"] },
      pfValue:    { type: Number },            // % of basic when pfType==="percent"
      esiApplicable: { type: Boolean, default: false },
      gratuityApplicable: { type: Boolean },   // unset → engine defaults to "has PF"
    },
    pendingArrears: { type: Number, default: 0 },
    statutory: {
      pan:        { type: String },
      uan:        { type: String },
      esicNumber: { type: String },
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
        type: { type: String },
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    avatar: { type: String },
    avatarData: { type: String },
    isActive: { type: Boolean, default: true },
    gpsRequired: { type: Boolean, default: false },
    terminationDate: { type: Date },
    terminationReason: { type: String },
    leaveBalance: {
      leaves:              { type: Number, default: 0 },
      leaveCreditedMonth:  { type: Number, default: 0 },
      leaveCreditedYear:   { type: Number, default: 0 },
      // legacy fields kept for existing records
      annual:   { type: Number },
      sick:     { type: Number },
      casual:   { type: Number },
      maternity:{ type: Number },
      paternity:{ type: Number },
      unpaid:   { type: Number },
    },
    resignation: {
      submittedAt: Date,
      lastWorkingDay: Date,
      reason: String,
      status: { type: String, enum: ["pending", "accepted", "withdrawn"] },
      acceptedBy: { type: Schema.Types.ObjectId, ref: "User" },
      acceptedAt: Date,
      hrNotes: String,
    },
    pip: {
      status: { type: String, enum: ["active", "completed", "cancelled"] },
      startDate: Date,
      endDate: Date,
      goals: String,
      reviewDate: Date,
      notes: String,
      initiatedBy: { type: Schema.Types.ObjectId, ref: "User" },
      initiatedAt: Date,
      completedAt: Date,
    },
  },
  { timestamps: true }
);

EmployeeSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

EmployeeSchema.index({ isActive: 1 });
EmployeeSchema.index({ department: 1, isActive: 1 });
EmployeeSchema.index({ createdAt: -1 });

export default mongoose.models.Employee ||
  mongoose.model<IEmployee>("Employee", EmployeeSchema);
