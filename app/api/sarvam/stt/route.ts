import { NextResponse } from "next/server";
import { speechToText, hasSarvamKey, SarvamError } from "@/lib/sarvam";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!hasSarvamKey()) {
    return NextResponse.json({ error: "no_key" }, { status: 503 });
  }
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }
    const name = (file as File).name || "audio.webm";
    const { transcript, languageCode } = await speechToText(file, name);
    return NextResponse.json({ transcript, languageCode });
  } catch (err) {
    const status = err instanceof SarvamError ? err.status : 500;
    const msg = err instanceof Error ? err.message : "STT failed";
    return NextResponse.json({ error: msg }, { status });
  }
}
