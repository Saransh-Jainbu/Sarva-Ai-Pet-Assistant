import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user";
import { toolDefs, runTool } from "@/lib/tools";
import {
  chatCompletion,
  hasSarvamKey,
  SarvamError,
  type ChatMessage,
} from "@/lib/sarvam";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await prisma.chatMessage.findMany({
    where: { userId, role: { in: ["user", "assistant"] } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  rows.reverse();
  return NextResponse.json({
    messages: rows.map((m) => ({ id: m.id, role: m.role, content: m.content })),
  });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const deleted = await prisma.chatMessage.deleteMany({
    where: { userId },
  });

  return NextResponse.json({
    success: true,
    deletedCount: deleted.count,
    message: `Cleared ${deleted.count} chat messages. Starting fresh!`,
  });
}

const buildSystemPrompt = (petName: string) => `You are ${petName}, a cute, caring virtual pet who is also the user's personal AI assistant. You live on their screen as a little companion.

Personality:
- Warm, upbeat, and concise. Talk like a sweet companion, not a corporate bot.
- Keep replies short (1-3 sentences) unless asked for detail. A gentle emoji now and then is welcome.
- You genuinely care about the user's wellbeing and staying on top of their tasks and bills.

Capabilities (via tools):
- Save and list notes (create_note, list_notes).
- Save bills with due dates (save_bill, list_due_dates) — auto-creates a reminder 1 day before.
- Create, list, and delete/cancel reminders (create_reminder, list_reminders, delete_reminder).
- List uploaded documents, answer questions about them, and explain them in plain language (list_documents, query_document, explain_document).

Rules:
- When the user asks to remember, note, save a bill, set a reminder, cancel/delete a reminder, or query/explain a document — call the matching tool.
- To delete a reminder, call list_reminders first if you don't already know its id, then delete_reminder with that id.
- After a tool runs, confirm what you did in one friendly line.
- Never invent due dates or amounts the user didn't provide.`;

const MAX_TOOL_STEPS = 5;
const HISTORY_LIMIT = 16;

export async function POST(req: Request) {
  let userText = "";
  try {
    const body = await req.json();
    userText = (body?.message ?? "").toString().trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!userText) {
    return NextResponse.json({ error: "Message is empty" }, { status: 400 });
  }

  if (!hasSarvamKey()) {
    return NextResponse.json(
      {
        reply:
          "I'd love to chat, but I can't think yet — add your SARVAM_API_KEY to .env.local and restart me. 🐣",
        toolsUsed: [],
        needsKey: true,
      },
      { status: 200 },
    );
  }

  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // The pet's (possibly renamed) identity so it refers to itself correctly.
  const pet = await prisma.petState.findUnique({ where: { userId } });
  const petName = pet?.name?.trim() || "Sarva";

  // Persist the user's message, then load recent history for context.
  await prisma.chatMessage.create({
    data: { userId, role: "user", content: userText },
  });
  const history = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  history.reverse();

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(petName) },
    ...history.map((m) => ({ role: m.role as ChatMessage["role"], content: m.content })),
  ];

  const toolsUsed: string[] = [];

  try {
    let finalText = "";
    for (let step = 0; step < MAX_TOOL_STEPS; step++) {
      const { message } = await chatCompletion({ messages, tools: toolDefs });

      if (message.tool_calls && message.tool_calls.length > 0) {
        // Record the assistant's tool-call turn, then run each tool.
        messages.push({
          role: "assistant",
          content: message.content ?? "",
          tool_calls: message.tool_calls,
        });
        for (const call of message.tool_calls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.function.arguments || "{}");
          } catch {
            /* leave empty */
          }
          toolsUsed.push(call.function.name);
          const result = await runTool(userId, call.function.name, args);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
        }
        continue; // ask the model again with tool results
      }

      finalText = (message.content ?? "").trim();
      break;
    }

    if (!finalText) finalText = "…(I got a little tongue-tied — try again?)";

    await prisma.chatMessage.create({
      data: { userId, role: "assistant", content: finalText },
    });

    return NextResponse.json({ reply: finalText, toolsUsed });
  } catch (err) {
    const status = err instanceof SarvamError ? err.status : 500;
    const msg =
      err instanceof Error ? err.message : "Something went wrong while thinking.";
    return NextResponse.json({ error: msg }, { status });
  }
}
