import mongoose, { Schema, Document } from "mongoose";

export interface IHoliday extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  date: Date;
  type: "national" | "regional" | "optional" | "company";
  description?: string;
  year: number;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HolidaySchema = new Schema<IHoliday>(
  {
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: ["national", "regional", "optional", "company"],
      default: "national",
    },
    description: { type: String },
    year: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "Employee" },
  },
  { timestamps: true }
);

HolidaySchema.index({ date: 1, name: 1 }, { unique: true });

export default mongoose.models.Holiday ||
  mongoose.model<IHoliday>("Holiday", HolidaySchema);
