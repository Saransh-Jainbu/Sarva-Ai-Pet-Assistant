"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useChat } from "@/store/useChat";

/** Render the small subset of Markdown the Sarvam brain emits — **bold**,
 *  *italic*, and line breaks — as real elements instead of literal asterisks.
 *  Plain text only (no HTML), so it's safe from injection. */
function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|__([^_]+)__|_([^_]+)_/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const bold = m[1] ?? m[3];
    const italic = m[2] ?? m[4];
    if (bold != null) out.push(<strong key={key++}>{bold}</strong>);
    else out.push(<em key={key++}>{italic}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderRich(text: string): ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => (
    <span key={i}>
      {renderInline(line)}
      {i < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

export default function ChatThread() {
  const messages = useChat((s) => s.messages);
  const busy = useChat((s) => s.busy);
  const load = useChat((s) => s.load);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, busy]);

  if (messages.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-[var(--color-ink-soft)]">
        Say hi to Sarva, or ask it to take a note, save a bill, or check your email. ✨
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-1 py-1">
      {messages.map((m) => (
        <div
          key={m.id}
          className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
        >
          <div
            className={
              m.role === "user"
                ? "max-w-[80%] rounded-2xl rounded-br-md bg-[var(--color-accent)] px-3.5 py-2 text-sm text-white"
                : "max-w-[80%] rounded-2xl rounded-bl-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2 text-sm"
            }
          >
            {renderRich(m.content)}
          </div>
        </div>
      ))}
      {busy && (
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-bl-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5">
            <span className="inline-flex gap-1">
              <Dot delay={0} />
              <Dot delay={0.15} />
              <Dot delay={0.3} />
            </span>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-ink-soft)]"
      style={{ animation: `floaty 0.9s ease-in-out ${delay}s infinite` }}
    />
  );
}
