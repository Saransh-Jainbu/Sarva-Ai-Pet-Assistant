import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ notes });
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const note = await prisma.note.create({
    data: {
      userId,
      title: (body.title || "Note").toString().slice(0, 120),
      body: (body.body || "").toString(),
    },
  });
  return NextResponse.json({ note });
}

export async function PATCH(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { id, title, body: noteBody } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.note.updateMany({
    where: { id, userId },
    data: {
      ...(title !== undefined ? { title: String(title).slice(0, 120) || "Note" } : {}),
      ...(noteBody !== undefined ? { body: String(noteBody) } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.note.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
