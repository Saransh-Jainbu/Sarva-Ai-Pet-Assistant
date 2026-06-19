import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const bills = await prisma.bill.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    take: 100,
  });
  return NextResponse.json({ bills });
}

export async function PATCH(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { id, status } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.bill.updateMany({
    where: { id, userId },
    data: { status: status === "paid" ? "paid" : "unpaid" },
  });
  // Clear any reminders tied to a paid bill.
  if (status === "paid") {
    await prisma.reminder.updateMany({
      where: { userId, relatedBillId: id },
      data: { done: true },
    });
  }
  return NextResponse.json({ ok: true });
}
