/**
 * app/api/docs/route.ts — Document upload + AI processing
 *
 * Upload a photo of a bill or document. Every step runs on Sarvam, via lib/sarvam.ts:
 *   Read image   → describeImage()  (Sarvam Vision OCR)
 *   Bill extract → chatCompletion() (Sarvam-105B)
 *   Summarize    → chatCompletion() (Sarvam-105B)
 */

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user";
import { chatCompletion, ocrDocument, hasSarvamKey, SarvamError } from "@/lib/sarvam";
import { imageToPdf } from "@/lib/pdf";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// ─── GET: list documents ───────────────────────────────────────────────────────

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const docs = await prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { bills: true },
    take: 50,
  });

  return NextResponse.json({
    documents: docs.map((d) => ({
      id: d.id,
      filename: d.filename,
      summary: d.summary,
      actionableSteps: d.actionableSteps,
      createdAt: d.createdAt,
      bills: d.bills.map((b) => ({
        id: b.id,
        vendor: b.vendor,
        amount: b.amount,
        currency: b.currency,
        dueDate: b.dueDate,
        status: b.status,
      })),
    })),
  });
}

// ─── DELETE: remove a document + associated bills/reminders ───────────────────

export async function DELETE(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const doc = await prisma.document.findFirst({ where: { id, userId }, include: { bills: true } });
  if (!doc) return NextResponse.json({ ok: true });

  const billIds = doc.bills.map((b) => b.id);
  if (billIds.length) {
    await prisma.reminder.deleteMany({ where: { userId, relatedBillId: { in: billIds } } });
  }
  await prisma.bill.deleteMany({ where: { userId, documentId: id } });
  await prisma.document.delete({ where: { id } });

  try { await fs.unlink(doc.localPath); } catch { /* already gone */ }

  return NextResponse.json({ ok: true });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Ask Sarvam-105B to extract structured bill fields from document text. */
async function extractBill(text: string) {
  const { message } = await chatCompletion({
    temperature: 0,
    maxTokens: 3000,
    messages: [
      {
        role: "system",
        content: 'Extract structured data from the document. Respond ONLY with minified JSON, no prose. Schema: {"isBill": boolean, "vendor": string, "amount": number|null, "currency": string, "dueDate": "YYYY-MM-DD"|null, "summary": string}. Set isBill=false if not a bill/invoice/receipt. Never invent values.',
      },
      { role: "user", content: `Document:\n"""\n${text.slice(0, 6000)}\n"""` },
    ],
  });

  const match = (message.content ?? "").match(/\{[\s\S]*\}/);
  if (!match) return { isBill: false as const };
  try {
    const p = JSON.parse(match[0]);
    return {
      isBill: Boolean(p.isBill),
      vendor: p.vendor || undefined,
      amount: typeof p.amount === "number" ? p.amount : undefined,
      currency: p.currency || "INR",
      dueDate: p.dueDate || undefined,
      summary: p.summary || undefined,
    };
  } catch {
    return { isBill: false as const };
  }
}

/** Ask Sarvam-105B to summarize a document and extract next steps. */
async function summarizeDocument(text: string) {
  try {
    const { message } = await chatCompletion({
      temperature: 0,
      maxTokens: 2000,
      messages: [
        {
          role: "system",
          content: 'Analyze this document. Respond ONLY with minified JSON. Schema: {"summary": "1-3 sentence summary", "actionableSteps": "Bulleted list of next steps. If none, write None."}',
        },
        { role: "user", content: `Document:\n"""\n${text.slice(0, 6000)}\n"""` },
      ],
    });
    const match = (message.content ?? "").match(/\{[\s\S]*\}/);
    if (!match) return { summary: "No summary available.", actionableSteps: "None" };
    const p = JSON.parse(match[0]);
    return {
      summary: p.summary || "No summary available.",
      actionableSteps: p.actionableSteps || "None",
    };
  } catch {
    return { summary: "No summary available.", actionableSteps: "None" };
  }
}

// ─── POST: upload + process a document ────────────────────────────────────────

export async function POST(req: Request) {
  if (!hasSarvamKey()) return NextResponse.json({ error: "no_key" }, { status: 503 });

  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let file: File;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (!(f instanceof Blob)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    file = f as File;
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const filename = file.name || "document.jpg";
  const bytes = Buffer.from(await file.arrayBuffer());
  const isImage = (file.type || "").startsWith("image/") || /\.(png|jpe?g|webp|heic)$/i.test(filename);
  const isPdf = (file.type || "") === "application/pdf" || /\.pdf$/i.test(filename);
  if (!isImage && !isPdf) {
    return NextResponse.json(
      { error: "Please upload a photo (PNG/JPG) or a PDF of your bill or document." },
      { status: 400 },
    );
  }

  // Save original to disk
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const localPath = path.join(UPLOAD_DIR, safeName);
  await fs.writeFile(localPath, bytes);

  try {
    // ── Read the document with Sarvam Document Intelligence OCR ───────────────
    // Photos are wrapped into a one-page PDF first (the OCR API takes PDF/ZIP).
    let text = "";
    try {
      const pdf = isPdf ? new Uint8Array(bytes) : await imageToPdf(bytes);
      text = await ocrDocument(pdf, { language: "en-IN" });
    } catch (err) {
      console.warn("Sarvam Document Intelligence OCR failed:", err);
    }

    // ── Save document record ──────────────────────────────────────────────────
    const doc = await prisma.document.create({
      data: {
        userId,
        filename,
        localPath,
        mimeType: file.type || "image/jpeg",
        parsedText: text.slice(0, 20000),
      },
    });

    // ── AI analysis ───────────────────────────────────────────────────────────
    const fields = text.trim().length > 20 ? await extractBill(text) : { isBill: false as const };
    let bill = null;
    let reminder = null;
    let summaryText = "";
    let actionableStepsText = "";

    if (fields.isBill && fields.vendor) {
      const dueDate = fields.dueDate ? new Date(fields.dueDate) : null;
      bill = await prisma.bill.create({
        data: {
          userId,
          vendor: fields.vendor,
          amount: fields.amount ?? null,
          currency: fields.currency || "INR",
          dueDate: dueDate && !isNaN(dueDate.getTime()) ? dueDate : null,
          documentId: doc.id,
        },
      });

      if (bill.dueDate) {
        const remindAt = new Date(bill.dueDate.getTime() - 24 * 60 * 60 * 1000);
        reminder = await prisma.reminder.create({
          data: {
            userId,
            text: `${bill.vendor}${bill.amount ? ` (${bill.currency} ${bill.amount})` : ""} is due tomorrow`,
            dueAt: remindAt,
            relatedBillId: bill.id,
          },
        });
      }

      summaryText = fields.summary || `Bill from ${fields.vendor}.`;
      actionableStepsText = `Pay ${fields.currency || "INR"} ${fields.amount ?? ""} to ${fields.vendor}${fields.dueDate ? " by " + fields.dueDate : ""}.`;
    } else if (text.trim().length > 20) {
      const analysis = await summarizeDocument(text);
      summaryText = analysis.summary;
      actionableStepsText = analysis.actionableSteps;
    } else {
      summaryText = "Saved! No text content was detected in this file.";
      actionableStepsText = "None";
    }

    await prisma.document.update({
      where: { id: doc.id },
      data: { summary: summaryText, actionableSteps: actionableStepsText },
    });

    return NextResponse.json({
      ok: true,
      document: { id: doc.id, filename, summary: summaryText, actionableSteps: actionableStepsText },
      bill: bill && { id: bill.id, vendor: bill.vendor, amount: bill.amount, currency: bill.currency, dueDate: bill.dueDate },
      reminderCreated: Boolean(reminder),
    });
  } catch (err) {
    const status = err instanceof SarvamError ? err.status : 500;
    const msg = err instanceof Error ? err.message : "Failed to process document";
    return NextResponse.json({ error: msg }, { status });
  }
}
