import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user";

export const runtime = "nodejs";

// ─── GET: current pet state (name/mood/energy) ────────────────────────────────

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const pet = await prisma.petState.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  return NextResponse.json({ name: pet.name, mood: pet.mood, energy: pet.energy });
}

// ─── PATCH: rename the pet (and other simple settings) ────────────────────────

export async function PATCH(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const raw = typeof body?.name === "string" ? body.name.trim() : "";
  if (!raw) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  // Keep names short and clean; the sprite label is tiny.
  const name = raw.slice(0, 24);

  const pet = await prisma.petState.upsert({
    where: { userId },
    update: { name },
    create: { userId, name },
  });
  return NextResponse.json({ ok: true, name: pet.name });
}
