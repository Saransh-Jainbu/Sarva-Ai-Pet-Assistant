/**
 * lib/sarvam.ts — Sarvam AI SDK client (server-only).
 *
 * Single source of truth for all Sarvam model calls.
 * Uses the official `sarvamai` npm SDK — no raw fetch calls.
 * Imported only from Next.js route handlers; the API key never reaches the browser.
 *
 * Models in use:
 *   Chat / reasoning  → sarvam-105b   (via client.chat.completions)
 *   Speech → Text     → saaras:v3     (via client.speechToText.transcribe) — state-of-the-art
 *   Text → Speech     → bulbul:v2     (via client.textToSpeech.convert)
 *   Vision / OCR      → sarvam-vision (via client.chat.completions with image_url)
 */

import { SarvamAIClient, SarvamAIError } from "sarvamai";
import { unzipSync, strFromU8 } from "fflate";

// ─── Singleton client ──────────────────────────────────────────────────────────

let _client: SarvamAIClient | null = null;

function getClient(): SarvamAIClient {
  if (!process.env.SARVAM_API_KEY) {
    throw new SarvamError(
      "SARVAM_API_KEY is not set — add it to .env.local and restart.",
      503,
    );
  }
  if (!_client) {
    _client = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY });
  }
  return _client;
}

// ─── Error wrapper ─────────────────────────────────────────────────────────────

export class SarvamError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SarvamError";
    this.status = status;
  }
}

function wrap(e: unknown): never {
  if (e instanceof SarvamAIError) {
    throw new SarvamError(e.message, e.statusCode ?? 500);
  }
  throw new SarvamError(e instanceof Error ? e.message : String(e), 500);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function hasSarvamKey(): boolean {
  return Boolean(process.env.SARVAM_API_KEY);
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ChatRole = "system" | "user" | "assistant" | "tool";

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ChatMessage = {
  role: ChatRole;
  content: string | null;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

export type ToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ChatResult = {
  message: { role: "assistant"; content: string | null; tool_calls?: ToolCall[] };
  finishReason: string;
};

// ─── 1. Chat — Sarvam-105B ────────────────────────────────────────────────────

export async function chatCompletion(opts: {
  messages: ChatMessage[];
  tools?: ToolDef[];
  temperature?: number;
  maxTokens?: number;
}): Promise<ChatResult> {
  try {
    // Model ids come from env, so we relax the SDK's strict literal-union types.
    const res: any = await getClient().chat.completions({
      model: process.env.SARVAM_CHAT_MODEL || "sarvam-105b",
      messages: opts.messages,
      tools: opts.tools,
      temperature: opts.temperature ?? 0.6,
      // Sarvam-105B spends hidden reasoning tokens before emitting a reply,
      // so be generous with max_tokens or responses get truncated.
      max_tokens: opts.maxTokens ?? 3000,
    } as any);
    const choice = res.choices?.[0];
    return {
      message: (choice?.message ?? { role: "assistant", content: "" }) as ChatResult["message"],
      finishReason: choice?.finish_reason ?? "stop",
    };
  } catch (e) {
    wrap(e);
  }
}

// ─── 2. Speech-to-Text — Saaras ───────────────────────────────────────────────

export async function speechToText(
  audio: Blob,
  filename = "audio.webm",
): Promise<{ transcript: string; languageCode?: string }> {
  try {
    const res = await getClient().speechToText.transcribe({
      file: audio,
      model: process.env.SARVAM_STT_MODEL || "saaras:v3",
      language_code: "unknown", // auto-detect
    } as any);
    return { transcript: res.transcript ?? "", languageCode: res.language_code };
  } catch (e) {
    wrap(e);
  }
}

// ─── 3. Text-to-Speech — Bulbul ───────────────────────────────────────────────

export async function textToSpeech(
  text: string,
  opts?: { speaker?: string; language?: string },
): Promise<{ audioBase64: string; mimeType: string }> {
  try {
    const model = process.env.SARVAM_TTS_MODEL || "bulbul:v3";
    const isV3 = model.includes("v3");

    const baseConfig = {
      text: text.slice(0, isV3 ? 2500 : 1500),
      target_language_code: opts?.language || process.env.SARVAM_TTS_LANGUAGE || "en-IN",
      speaker: opts?.speaker || process.env.SARVAM_TTS_SPEAKER || (isV3 ? "shubh" : "anushka"),
      model,
      pace: isV3 ? 1.0 : 1.05,
    };

    const config = isV3
      ? { ...baseConfig, temperature: 0.6 }
      : { ...baseConfig, pitch: 0, loudness: 1.2, enable_preprocessing: true };

    const res = await getClient().textToSpeech.convert(config as any);
    return { audioBase64: res.audios?.[0] ?? "", mimeType: "audio/wav" };
  } catch (e) {
    wrap(e);
  }
}

// ─── 4. Document OCR — Sarvam Document Intelligence ──────────────────────────
// Sarvam's real OCR/vision lives in the Document Digitization API (NOT chat
// completions — chat only accepts plain-string content). It is an async job:
// create → upload (PDF) → start → poll → download a ZIP of markdown. We unzip
// in memory and concatenate the text. Input must be a PDF (see lib/pdf.ts to
// turn a photo into one).

export async function ocrDocument(
  pdf: Uint8Array,
  opts?: { language?: string },
): Promise<string> {
  try {
    const job = await getClient().documentIntelligence.createJob({
      language: (opts?.language as any) || process.env.SARVAM_OCR_LANGUAGE || "en-IN",
      outputFormat: "md",
    });
    await job.uploadFile(new Blob([Buffer.from(pdf)], { type: "application/pdf" }));
    await job.start();
    const status = await job.waitUntilComplete();
    if (status.job_state === "Failed") {
      throw new SarvamError("Document OCR job failed.", 502);
    }

    const links = await job.getDownloadLinks();
    // The output ZIP holds clean markdown plus a verbose JSON of coordinate
    // blocks. Prefer the readable text; only fall back to JSON if nothing else.
    let primary = "";
    let fallback = "";
    for (const info of Object.values(links.download_urls ?? {})) {
      const url = (info as any)?.file_url;
      if (!url) continue;
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      try {
        const files = unzipSync(buf);
        for (const [name, data] of Object.entries(files)) {
          if (/\.(md|markdown|txt|html?)$/i.test(name)) primary += strFromU8(data) + "\n";
          else if (/\.json$/i.test(name)) fallback += strFromU8(data) + "\n";
        }
      } catch {
        primary += strFromU8(buf) + "\n";
      }
    }
    return (primary.trim() || fallback.trim());
  } catch (e) {
    wrap(e);
  }
}

// ─── 5. (legacy) Vision via chat — unsupported by the API, kept for the webcam ─
// NOTE: Sarvam chat completions do NOT accept image content, so this call does
// not actually return a description. Left in place only so the older webcam
// route keeps compiling; prefer ocrDocument() for any real image reading.

export async function describeImage(
  imageDataUrl: string,
  prompt = "In one short, warm sentence, describe what you see in this image.",
): Promise<string> {
  try {
    const res: any = await getClient().chat.completions({
      model: process.env.SARVAM_VISION_MODEL || "sarvam-vision",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      max_tokens: 512,
    } as any);
    return res.choices?.[0]?.message?.content ?? "";
  } catch (e) {
    wrap(e);
  }
}
