import mongoose, { Schema, Document } from "mongoose";

export interface IOfferLetter extends Document {
  _id: mongoose.Types.ObjectId;
  employee: mongoose.Types.ObjectId;
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  joiningDate: Date;
  salary: {
    basic: number;
    hra: number;
    allowances: number;
    grossMonthly: number;
    employeePF: number;
    esi: number;
    professionalTax: number;
    tds: number;
    totalDeductions: number;
    netMonthly: number;
    grossAnnual: number;
    employerPF: number;
    gratuity: number;
    annualCTC: number;
  };
  verificationToken: string;
  fileUrl: string;
  refNumber: string;
  generatedAt: Date;
  generatedBy: mongoose.Types.ObjectId;
  isActive: boolean;
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OfferLetterSchema = new Schema<IOfferLetter>(
  {
    employee:     { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    employeeName: { type: String, required: true },
    employeeCode: { type: String, required: true },
    designation:  { type: String, required: true },
    department:   { type: String, required: true },
    joiningDate:  { type: Date, required: true },
    salary: {
      basic:            { type: Number, required: true },
      hra:              { type: Number, required: true },
      allowances:       { type: Number, required: true },
      grossMonthly:     { type: Number, required: true },
      employeePF:       { type: Number, required: true },
      esi:              { type: Number, default: 0 },
      professionalTax:  { type: Number, default: 0 },
      tds:              { type: Number, default: 0 },
      totalDeductions:  { type: Number, required: true },
      netMonthly:       { type: Number, required: true },
      grossAnnual:      { type: Number, required: true },
      employerPF:       { type: Number, required: true },
      gratuity:         { type: Number, required: true },
      annualCTC:        { type: Number, required: true },
    },
    verificationToken: { type: String, required: true, unique: true },
    fileUrl:           { type: String, required: true },
    refNumber:         { type: String, required: true },
    generatedAt:       { type: Date, default: Date.now },
    generatedBy:       { type: Schema.Types.ObjectId, ref: "User", required: true },
    isActive:          { type: Boolean, default: true },
    revokedAt:         { type: Date },
    revokedBy:         { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

OfferLetterSchema.index({ employee: 1, generatedAt: -1 });

export default mongoose.models.OfferLetter ||
  mongoose.model<IOfferLetter>("OfferLetter", OfferLetterSchema);
