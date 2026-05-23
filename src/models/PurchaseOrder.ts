import mongoose, { Schema, Document } from "mongoose";

export type POStatus =
  | "received"
  | "acknowledged"
  | "in_progress"
  | "on_hold"
  | "delivered"
  | "invoiced"
  | "paid"
  | "cancelled";

export type POPriority = "low" | "medium" | "high" | "urgent";

export interface IPOLineItem {
  _id?: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface IPOStatusHistory {
  status: POStatus;
  changedBy?: mongoose.Types.ObjectId;
  changedAt: Date;
  note?: string;
}

export interface IPurchaseOrder extends Document {
  _id: mongoose.Types.ObjectId;
  poNumber: string;
  title: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientGSTIN?: string;
  poDate: Date;
  dueDate?: Date;
  priority: POPriority;
  status: POStatus;
  lineItems: IPOLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  paymentTerms?: string;
  notes?: string;
  internalNotes?: string;
  assignedTo?: mongoose.Types.ObjectId;
  department?: mongoose.Types.ObjectId;
  invoiceNumber?: string;
  invoiceDate?: Date;
  paymentReceivedDate?: Date;
  paymentAmount?: number;
  paymentMode?: "bank_transfer" | "cheque" | "upi" | "cash" | "other";
  statusHistory: IPOStatusHistory[];
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LineItemSchema = new Schema<IPOLineItem>({
  description: { type: String, required: true },
  quantity:    { type: Number, required: true, min: 0 },
  unit:        { type: String, default: "units" },
  rate:        { type: Number, required: true, min: 0 },
  amount:      { type: Number, required: true, min: 0 },
});

const StatusHistorySchema = new Schema<IPOStatusHistory>({
  status:    { type: String, required: true },
  changedBy: { type: Schema.Types.ObjectId, ref: "User" },
  changedAt: { type: Date, default: Date.now },
  note:      { type: String },
});

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    poNumber:      { type: String, required: true, unique: true },
    title:         { type: String, required: true, trim: true },
    clientName:    { type: String, required: true, trim: true },
    clientEmail:   { type: String, trim: true, lowercase: true },
    clientPhone:   { type: String },
    clientAddress: { type: String },
    clientGSTIN:   { type: String },
    poDate:        { type: Date, required: true },
    dueDate:       { type: Date },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["received", "acknowledged", "in_progress", "on_hold", "delivered", "invoiced", "paid", "cancelled"],
      default: "received",
    },
    lineItems:   [LineItemSchema],
    subtotal:    { type: Number, default: 0 },
    taxRate:     { type: Number, default: 18 },
    taxAmount:   { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    currency:    { type: String, default: "INR" },
    paymentTerms:        { type: String },
    notes:               { type: String },
    internalNotes:       { type: String },
    assignedTo:          { type: Schema.Types.ObjectId, ref: "Employee" },
    department:          { type: Schema.Types.ObjectId, ref: "Department" },
    invoiceNumber:       { type: String },
    invoiceDate:         { type: Date },
    paymentReceivedDate: { type: Date },
    paymentAmount:       { type: Number },
    paymentMode: {
      type: String,
      enum: ["bank_transfer", "cheque", "upi", "cash", "other"],
    },
    statusHistory: [StatusHistorySchema],
    createdBy:     { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

PurchaseOrderSchema.index({ status: 1, poDate: -1 });
PurchaseOrderSchema.index({ clientName: 1 });

export default mongoose.models.PurchaseOrder ||
  mongoose.model<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);
