import { NextResponse } from "next/server";
import { textToSpeech, hasSarvamKey, SarvamError } from "@/lib/sarvam";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!hasSarvamKey()) {
    return NextResponse.json({ error: "no_key" }, { status: 503 });
  }
  let text = "";
  try {
    const body = await req.json();
    text = (body?.text ?? "").toString().trim();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: "Empty text" }, { status: 400 });

  try {
    const { audioBase64, mimeType } = await textToSpeech(text);
    return NextResponse.json({ audio: audioBase64, mimeType });
  } catch (err) {
    const status = err instanceof SarvamError ? err.status : 500;
    const msg = err instanceof Error ? err.message : "TTS failed";
    return NextResponse.json({ error: msg }, { status });
  }
}
