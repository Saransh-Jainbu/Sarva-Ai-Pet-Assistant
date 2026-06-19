import { NextResponse } from "next/server";
import { describeImage, hasSarvamKey, SarvamError } from "@/lib/sarvam";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!hasSarvamKey()) {
    return NextResponse.json({ error: "no_key" }, { status: 503 });
  }
  let image = "";
  let prompt: string | undefined;
  try {
    const body = await req.json();
    image = (body?.image ?? "").toString();
    prompt = body?.prompt ? String(body.prompt) : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!image.startsWith("data:image")) {
    return NextResponse.json({ error: "Expected a data:image URL" }, { status: 400 });
  }

  try {
    const description = await describeImage(image, prompt);
    return NextResponse.json({ description });
  } catch (err) {
    const status = err instanceof SarvamError ? err.status : 500;
    const msg = err instanceof Error ? err.message : "Vision failed";
    return NextResponse.json({ error: msg }, { status });
  }
}
