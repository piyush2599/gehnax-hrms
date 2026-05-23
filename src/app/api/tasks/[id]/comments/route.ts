import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  await connectDB();
  const task = await Task.findById(params.id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  task.comments.push({ author: userId, content: content.trim(), createdAt: new Date() } as any);
  await task.save();

  const updated = await Task.findById(params.id).populate("comments.author", "name email");
  return NextResponse.json(updated?.comments.at(-1));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const role   = (session.user as any).role;

  await connectDB();
  const task = await Task.findById(params.id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { commentId } = await req.json();
  const comment = task.comments.id(commentId);
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  const isAuthor = comment.author.toString() === userId;
  const isAdmin  = ["super_admin","hr_admin"].includes(role);
  if (!isAuthor && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  comment.deleteOne();
  await task.save();
  return NextResponse.json({ message: "Deleted" });
}
