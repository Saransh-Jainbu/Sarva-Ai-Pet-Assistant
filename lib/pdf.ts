/**
 * lib/pdf.ts — tiny, dependency-free image → PDF wrapper.
 *
 * Sarvam's Document Intelligence (OCR) API only accepts PDF/ZIP, but users snap
 * photos of their bills. We normalise any image to a baseline JPEG with `sharp`
 * (already a dependency) and hand-build a minimal one-page PDF that embeds the
 * JPEG directly via the /DCTDecode filter — no PDF library required.
 */

import sharp from "sharp";

const enc = (s: string) => Buffer.from(s, "latin1");

/** Wrap a single raster image into a minimal one-page PDF. */
export async function imageToPdf(input: Buffer): Promise<Uint8Array> {
  // Auto-orient from EXIF, drop alpha onto white, re-encode as baseline JPEG.
  const jpeg = await sharp(input)
    .rotate()
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 90, progressive: false })
    .toBuffer();
  const meta = await sharp(jpeg).metadata();
  const w = meta.width ?? 1000;
  const h = meta.height ?? 1400;

  const parts: Buffer[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (b: Buffer) => {
    parts.push(b);
    pos += b.length;
  };

  push(enc("%PDF-1.4\n"));

  const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;

  offsets[1] = pos;
  push(enc("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"));

  offsets[2] = pos;
  push(enc("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"));

  offsets[3] = pos;
  push(
    enc(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] ` +
        `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
    ),
  );

  offsets[4] = pos;
  push(
    enc(
      `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
        `/Length ${jpeg.length} >>\nstream\n`,
    ),
  );
  push(jpeg);
  push(enc("\nendstream\nendobj\n"));

  offsets[5] = pos;
  push(
    enc(
      `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
    ),
  );

  // Cross-reference table — each entry is exactly 20 bytes.
  const xrefStart = pos;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  push(enc(xref));
  push(enc(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`));

  return new Uint8Array(Buffer.concat(parts));
}
