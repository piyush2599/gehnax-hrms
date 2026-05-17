import mongoose, { Schema, Document } from "mongoose";

export type ExpenseCategory =
  | "travel"
  | "food"
  | "accommodation"
  | "equipment"
  | "training"
  | "medical"
  | "other";

export type ExpenseStatus = "pending" | "approved" | "rejected";

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  title: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: Date;
  description?: string;
  receiptUrl: string;
  receiptName?: string;
  receiptType?: string;
  status: ExpenseStatus;
  submittedAt: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  managerNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["travel", "food", "accommodation", "equipment", "training", "medical", "other"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0.01 },
    expenseDate: { type: Date, required: true },
    description: { type: String },
    receiptUrl: { type: String, required: true },
    receiptName: { type: String },
    receiptType: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    submittedAt: { type: Date, default: Date.now },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Employee" },
    reviewedAt: { type: Date },
    managerNote: { type: String },
  },
  { timestamps: true }
);

ExpenseSchema.index({ employeeId: 1, status: 1 });
ExpenseSchema.index({ status: 1, submittedAt: -1 });

export default mongoose.models.Expense ||
  mongoose.model<IExpense>("Expense", ExpenseSchema);
