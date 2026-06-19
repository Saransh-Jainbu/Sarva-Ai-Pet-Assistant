"use client";

import { useCallback, useEffect, useState } from "react";
import SlideOver from "./SlideOver";
import { usePet } from "@/store/usePet";

type Reminder = { id: string; text: string; dueAt: string | null; overdue: boolean };

function when(dueAt: string | null) {
  if (!dueAt) return "someday";
  const d = new Date(dueAt);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RemindersPanel({ inline = false }: { inline?: boolean }) {
  const open = usePet((s) => s.openPanel) === "reminders";
  const [items, setItems] = useState<Reminder[]>([]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/reminders");
    const data = await res.json();
    setItems(data.reminders ?? []);
  }, []);

  useEffect(() => {
    if (open || inline) refresh();
  }, [open, inline, refresh]);

  useEffect(() => {
    const h = () => (open || inline) && refresh();
    window.addEventListener("sarva:data", h);
    return () => window.removeEventListener("sarva:data", h);
  }, [open, inline, refresh]);

  const done = async (id: string) => {
    setItems((r) => r.filter((x) => x.id !== id));
    await fetch("/api/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, done: true }),
    });
    window.dispatchEvent(new CustomEvent("sarva:data"));
  };

  const remove = async (id: string) => {
    setItems((r) => r.filter((x) => x.id !== id));
    await fetch(`/api/reminders?id=${id}`, { method: "DELETE" });
    window.dispatchEvent(new CustomEvent("sarva:data"));
  };

  const content = (
    <>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)]">
          Nothing pending. I&apos;ll nudge you when a bill is due. 🔔
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((r) => (
            <li
              key={r.id}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                r.overdue
                  ? "border-[var(--color-rose)]/40 bg-[var(--color-rose)]/5"
                  : "border-[var(--color-line)] bg-[var(--color-surface)]"
              }`}
            >
              <button
                onClick={() => done(r.id)}
                className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[var(--color-line)] hover:border-[var(--color-mint)]"
                aria-label="Mark done"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{r.text}</p>
                <p
                  className={`mt-0.5 text-xs ${
                    r.overdue ? "text-[var(--color-rose)]" : "text-[var(--color-ink-soft)]"
                  }`}
                >
                  {r.overdue ? "overdue · " : ""}
                  {when(r.dueAt)}
                </p>
              </div>
              <button
                onClick={() => remove(r.id)}
                className="shrink-0 text-[var(--color-ink-soft)] hover:text-[var(--color-rose)]"
                aria-label="Delete reminder"
                title="Delete"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between border-b border-[var(--color-line)] pb-3 mb-4 shrink-0">
          <h2 className="text-sm font-semibold">Reminders</h2>
        </header>
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">{content}</div>
      </div>
    );
  }

  return (
    <SlideOver id="reminders" title="Reminders">
      {content}
    </SlideOver>
  );
}
