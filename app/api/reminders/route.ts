import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const reminders = await prisma.reminder.findMany({
    where: { userId, done: false },
    orderBy: { dueAt: "asc" },
    take: 100,
  });
  const now = Date.now();
  return NextResponse.json({
    reminders: reminders.map((r) => ({
      id: r.id,
      text: r.text,
      dueAt: r.dueAt,
      overdue: r.dueAt ? r.dueAt.getTime() < now : false,
    })),
  });
}

export async function PATCH(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { id, done } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.reminder.updateMany({
    where: { id, userId },
    data: { done: done !== false },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.reminder.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
