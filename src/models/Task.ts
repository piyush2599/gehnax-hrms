import mongoose, { Schema, Document } from "mongoose";

export type TaskStatus   = "todo" | "in_progress" | "in_review" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskType     = "task" | "bug" | "feature" | "story";

interface ITaskComment {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  taskCode: string;
  project: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: mongoose.Types.ObjectId;
  reporter?: mongoose.Types.ObjectId;
  labels: string[];
  dueDate?: Date;
  estimatedHours?: number;
  loggedHours: number;
  parentTask?: mongoose.Types.ObjectId;
  order: number;
  comments: ITaskComment[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<ITaskComment>(
  {
    author:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    content:   { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const TaskSchema = new Schema<ITask>(
  {
    taskCode:       { type: String, required: true, unique: true },
    project:        { type: Schema.Types.ObjectId, ref: "Project", required: true },
    title:          { type: String, required: true, trim: true },
    description:    { type: String },
    type:           { type: String, enum: ["task","bug","feature","story"], default: "task" },
    status:         { type: String, enum: ["todo","in_progress","in_review","done","cancelled"], default: "todo" },
    priority:       { type: String, enum: ["low","medium","high","urgent"], default: "medium" },
    assignee:       { type: Schema.Types.ObjectId, ref: "Employee" },
    reporter:       { type: Schema.Types.ObjectId, ref: "User" },
    labels:         [{ type: String }],
    dueDate:        { type: Date },
    estimatedHours: { type: Number },
    loggedHours:    { type: Number, default: 0 },
    parentTask:     { type: Schema.Types.ObjectId, ref: "Task" },
    order:          { type: Number, default: 0 },
    comments:       [CommentSchema],
    createdBy:      { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

TaskSchema.index({ project: 1, status: 1, order: 1 });
TaskSchema.index({ assignee: 1 });

export default mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
