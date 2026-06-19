/**
 * lib/tools.ts — Tools available to the Sarvam-105B brain.
 *
 * Every tool here:
 *   1. Has a JSON schema sent to the model so it knows when/how to call it.
 *   2. Has an executor (runTool) that runs server-side against Neon via Prisma.
 *
 * Uses chatCompletion from lib/sarvam (SDK-backed) for the query_document tool.
 */

import { prisma } from "@/lib/db";
import { chatCompletion, type ToolDef } from "@/lib/sarvam";

// ─── Tool definitions (sent to the model) ─────────────────────────────────────

export const toolDefs: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Save a note for the user. Use when the user asks to remember, note, or jot something.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short title." },
          body: { type: "string", description: "The note content." },
        },
        required: ["body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_notes",
      description: "List the user's most recent saved notes.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "save_bill",
      description: "Save a bill/invoice with its due date. Use when the user mentions a bill, payment, or invoice.",
      parameters: {
        type: "object",
        properties: {
          vendor: { type: "string", description: "Who the bill is from." },
          amount: { type: "number", description: "Amount due." },
          currency: { type: "string", description: "Currency code, e.g. INR, USD. Default INR." },
          due_date: { type: "string", description: "Due date in ISO format (YYYY-MM-DD)." },
        },
        required: ["vendor"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_due_dates",
      description: "List upcoming unpaid bills and their due dates.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_reminder",
      description: "Create a reminder for the user at an optional time.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "What to remind about." },
          due_at: { type: "string", description: "When, in ISO 8601 format. Optional." },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_reminders",
      description: "List the user's active (not done) reminders.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_reminder",
      description:
        "Delete/cancel a reminder. Provide reminder_id (from list_reminders) when known; otherwise pass text to match the reminder by its wording. Use when the user asks to remove, cancel, or delete a reminder.",
      parameters: {
        type: "object",
        properties: {
          reminder_id: { type: "string", description: "ID of the reminder to delete (preferred)." },
          text: { type: "string", description: "Words from the reminder to match if the ID is unknown." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_documents",
      description: "List uploaded documents and bills, including their summaries and IDs.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "query_document",
      description: "Answer a specific question about the contents of an uploaded document.",
      parameters: {
        type: "object",
        properties: {
          document_id: { type: "string", description: "ID of the document to query." },
          question: { type: "string", description: "The question to answer from the document." },
        },
        required: ["document_id", "question"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "explain_document",
      description:
        "Explain an uploaded document in plain, friendly language — what it is, the key details, and what the user should do about it. Use when the user asks you to explain, break down, or walk them through a document.",
      parameters: {
        type: "object",
        properties: {
          document_id: { type: "string", description: "ID of the document to explain." },
        },
        required: ["document_id"],
      },
    },
  },
];

// ─── Tool executor ─────────────────────────────────────────────────────────────

type Args = Record<string, unknown>;

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function runTool(userId: string, name: string, args: Args): Promise<unknown> {
  switch (name) {
    case "create_note": {
      const note = await prisma.note.create({
        data: {
          userId,
          title: (args.title as string) || "Note",
          body: (args.body as string) || "",
        },
      });
      return { ok: true, id: note.id, title: note.title };
    }

    case "list_notes": {
      const notes = await prisma.note.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
      return notes.map((n) => ({ id: n.id, title: n.title, body: n.body, createdAt: n.createdAt }));
    }

    case "save_bill": {
      const bill = await prisma.bill.create({
        data: {
          userId,
          vendor: (args.vendor as string) || "Bill",
          amount: typeof args.amount === "number" ? args.amount : null,
          currency: (args.currency as string) || "INR",
          dueDate: parseDate(args.due_date as string),
        },
      });
      // Auto-create a reminder one day before the due date
      if (bill.dueDate) {
        await prisma.reminder.create({
          data: {
            userId,
            text: `${bill.vendor} bill is due tomorrow`,
            dueAt: new Date(bill.dueDate.getTime() - 24 * 60 * 60 * 1000),
            relatedBillId: bill.id,
          },
        });
      }
      return { ok: true, id: bill.id, vendor: bill.vendor, dueDate: bill.dueDate };
    }

    case "list_due_dates": {
      const bills = await prisma.bill.findMany({
        where: { userId, status: "unpaid" },
        orderBy: { dueDate: "asc" },
        take: 20,
      });
      return bills.map((b) => ({ id: b.id, vendor: b.vendor, amount: b.amount, currency: b.currency, dueDate: b.dueDate }));
    }

    case "create_reminder": {
      const r = await prisma.reminder.create({
        data: {
          userId,
          text: (args.text as string) || "Reminder",
          dueAt: parseDate(args.due_at as string),
        },
      });
      return { ok: true, id: r.id, text: r.text, dueAt: r.dueAt };
    }

    case "list_reminders": {
      const rs = await prisma.reminder.findMany({
        where: { userId, done: false },
        orderBy: { dueAt: "asc" },
        take: 20,
      });
      return rs.map((r) => ({ id: r.id, text: r.text, dueAt: r.dueAt }));
    }

    case "delete_reminder": {
      const id = (args.reminder_id as string)?.trim();
      // Prefer deleting by id (scoped to this user so nobody can delete another's data).
      if (id) {
        const r = await prisma.reminder.findFirst({ where: { id, userId } });
        if (!r) return { error: "No matching reminder found." };
        await prisma.reminder.delete({ where: { id: r.id } });
        return { ok: true, deleted: r.text };
      }
      // Fall back to fuzzy text match when the model only knows the wording.
      const needle = (args.text as string)?.trim().toLowerCase();
      if (!needle) return { error: "Provide a reminder_id or text to match." };
      const candidates = await prisma.reminder.findMany({
        where: { userId, done: false },
        orderBy: { dueAt: "asc" },
        take: 50,
      });
      const matches = candidates.filter((r) => r.text.toLowerCase().includes(needle));
      if (matches.length === 0) return { error: "No reminder matched that text." };
      if (matches.length > 1) {
        return {
          error: "Multiple reminders matched — ask which one, or use its id.",
          matches: matches.map((r) => ({ id: r.id, text: r.text })),
        };
      }
      await prisma.reminder.delete({ where: { id: matches[0].id } });
      return { ok: true, deleted: matches[0].text };
    }

    case "list_documents": {
      const docs = await prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { bills: true },
        take: 15,
      });
      return docs.map((d) => ({
        id: d.id,
        filename: d.filename,
        summary: d.summary || "No summary available.",
        createdAt: d.createdAt,
        isBill: d.bills.length > 0,
      }));
    }

    case "query_document": {
      const doc = await prisma.document.findUnique({ where: { id: args.document_id as string } });
      if (!doc) return { error: "Document not found." };

      const { message } = await chatCompletion({
        temperature: 0.2,
        maxTokens: 2000,
        messages: [
          {
            role: "system",
            content: `Answer questions about this document: "${doc.filename}". Use ONLY the document text provided. If the answer is not in the text, say so. Be concise.`,
          },
          {
            role: "user",
            content: `Document:\n"""\n${doc.parsedText.slice(0, 10000)}\n"""\n\nQuestion: ${args.question}`,
          },
        ],
      });
      return { filename: doc.filename, answer: message.content ?? "I couldn't find the answer in the document." };
    }

    case "explain_document": {
      const doc = await prisma.document.findFirst({
        where: { id: args.document_id as string, userId },
      });
      if (!doc) return { error: "Document not found." };
      if (!doc.parsedText.trim()) {
        return {
          filename: doc.filename,
          explanation:
            "I couldn't read any text from this document, so I can't explain it yet. Try re-uploading a clearer photo or a PDF.",
        };
      }

      const { message } = await chatCompletion({
        temperature: 0.3,
        maxTokens: 2000,
        messages: [
          {
            role: "system",
            content:
              "You are Sarva, a warm virtual pet assistant. Explain the user's document in plain, friendly language: what it is, the most important details (amounts, dates, names), and what they should do next. Use ONLY the provided text. Keep it to a short, easy-to-read paragraph or a few bullets.",
          },
          {
            role: "user",
            content: `Document "${doc.filename}":\n"""\n${doc.parsedText.slice(0, 10000)}\n"""`,
          },
        ],
      });
      return {
        filename: doc.filename,
        explanation: message.content ?? "I couldn't explain this document just now.",
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
