"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SlideOver from "./SlideOver";
import { usePet } from "@/store/usePet";
import { useChat } from "@/store/useChat";

type Bill = {
  id: string;
  vendor: string;
  amount: number | null;
  currency: string;
  dueDate: string | null;
  status: string;
};
type Doc = { id: string; filename: string; summary: string; actionableSteps: string; createdAt: string; bills: Bill[] };

function dueLabel(d: string | null) {
  if (!d) return null;
  const date = new Date(d);
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
  const nice = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (days < 0) return { text: `overdue (${nice})`, tone: "rose" as const };
  if (days <= 3) return { text: `due in ${days}d (${nice})`, tone: "amber" as const };
  return { text: `due ${nice}`, tone: "soft" as const };
}

export default function DocsPanel({ inline = false }: { inline?: boolean }) {
  const open = usePet((s) => s.openPanel) === "docs";
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [docQuery, setDocQuery] = useState("");
  const [queryingId, setQueryingId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedDoc(expandedDoc === id ? null : id);
    setDocQuery("");
  };

  const askQuestion = async (docId: string, filename: string) => {
    const q = docQuery.trim();
    if (!q) return;
    setQueryingId(docId);
    
    // Close panel to show chat interface and pet reaction
    const pet = usePet.getState();
    pet.setOpenPanel(null);
    pet.setThinking(true);
    pet.say(`searching document ${filename}… 🔍`);

    try {
      await useChat.getState().send(`About document "${filename}" (ID: ${docId}): ${q}`);
    } catch (e) {
      console.error(e);
      pet.say("sorry, I had trouble reading the document 📁");
    } finally {
      setDocQuery("");
      setQueryingId(null);
      pet.setThinking(false);
    }
  };

  const refresh = useCallback(async () => {
    const res = await fetch("/api/docs");
    const data = await res.json();
    setDocs(data.documents ?? []);
  }, []);

  useEffect(() => {
    if (open || inline) refresh();
  }, [open, inline, refresh]);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    const pet = usePet.getState();
    pet.setThinking(true);
    pet.say(`reading ${file.name}… 📄`);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/docs", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      pet.setThinking(false);
      if (!res.ok) {
        setError(data.error || "Upload failed");
        pet.say("hmm, I couldn't read that one 😕");
      } else if (data.bill) {
        const due = data.bill.dueDate
          ? ` due ${new Date(data.bill.dueDate).toLocaleDateString()}`
          : "";
        pet.say(`saved ${data.bill.vendor}${due} — I'll remind you! ✅`);
      } else {
        pet.say(data.summary || "saved that document for you 📁");
      }
      setTimeout(() => usePet.getState().say(null), 5000);
      window.dispatchEvent(new CustomEvent("sarva:data"));
      await refresh();
    } catch {
      pet.setThinking(false);
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const togglePaid = async (id: string, current: string) => {
    const next = current === "paid" ? "unpaid" : "paid";
    setDocs((ds) =>
      ds.map((d) => ({
        ...d,
        bills: d.bills.map((b) => (b.id === id ? { ...b, status: next } : b)),
      })),
    );
    await fetch("/api/bills", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    window.dispatchEvent(new CustomEvent("sarva:data"));
  };

  const removeDoc = async (id: string) => {
    setDocs((ds) => ds.filter((d) => d.id !== id));
    await fetch(`/api/docs?id=${id}`, { method: "DELETE" });
    window.dispatchEvent(new CustomEvent("sarva:data"));
  };

  const content = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="mb-4 w-full rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-5 text-sm text-[var(--color-ink-soft)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-ink)] disabled:opacity-60"
      >
        {uploading ? "Reading your document…" : "＋ Upload a photo of a bill or document"}
      </button>
      {error && <p className="mb-3 text-xs text-[var(--color-rose)]">{error}</p>}

      {docs.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)]">
          Drop in a bill and I&apos;ll pull out the due date and remind you before it&apos;s due.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {docs.map((d) => (
            <li
              key={d.id}
              className="group rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => toggleExpand(d.id)}
                  className="flex-1 text-left truncate text-sm font-medium hover:text-[var(--color-accent)] transition outline-none"
                >
                  {d.filename}
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => toggleExpand(d.id)}
                    className="text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] transition text-xs font-semibold"
                    title="Toggle details"
                  >
                    {expandedDoc === d.id ? "▲ hide" : "▼ details"}
                  </button>
                  <button
                    onClick={() => removeDoc(d.id)}
                    className="shrink-0 text-[var(--color-ink-soft)] opacity-0 transition group-hover:opacity-100 hover:text-[var(--color-rose)]"
                    aria-label="Delete document"
                    title="Delete document"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                </div>
              </div>

              {expandedDoc === d.id && (
                <div className="mt-2.5 pt-2.5 border-t border-[var(--color-line)] text-xs flex flex-col gap-2.5 animate-fadeIn">
                  {d.summary && (
                    <div>
                      <p className="font-semibold text-[var(--color-ink-soft)] uppercase tracking-wider text-[9px] mb-1">Summary</p>
                      <p className="text-[var(--color-ink)] bg-[var(--color-surface-2)] p-2 rounded-lg leading-relaxed">{d.summary}</p>
                    </div>
                  )}
                  {d.actionableSteps && d.actionableSteps !== "None" && (
                    <div>
                      <p className="font-semibold text-[var(--color-ink-soft)] uppercase tracking-wider text-[9px] mb-1">Tasks / Actionable Steps</p>
                      <p className="text-[var(--color-ink)] bg-[var(--color-surface-2)] p-2 rounded-lg leading-relaxed whitespace-pre-line">{d.actionableSteps}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 mt-1">
                    <p className="font-semibold text-[var(--color-ink-soft)] uppercase tracking-wider text-[9px]">Ask Sarva about this document</p>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Ask a question..."
                        value={docQuery}
                        onChange={(e) => setDocQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && docQuery.trim() && queryingId !== d.id) {
                            e.preventDefault();
                            void askQuestion(d.id, d.filename);
                          }
                        }}
                        className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[var(--color-accent)]"
                      />
                      <button
                        onClick={() => askQuestion(d.id, d.filename)}
                        disabled={!docQuery.trim() || queryingId === d.id}
                        className="bg-[var(--color-accent)] text-white px-3 py-1.5 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-40"
                      >
                        {queryingId === d.id ? "Asking..." : "Ask"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {d.bills.map((b) => {
                const due = dueLabel(b.dueDate);
                return (
                  <div
                    key={b.id}
                    className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-[var(--color-surface-2)] px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        {b.vendor}
                        {b.amount != null && (
                          <span className="text-[var(--color-ink-soft)]">
                            {" "}
                            · {b.currency} {b.amount}
                          </span>
                        )}
                      </p>
                      {due && (
                        <p
                          className={`text-xs ${
                            due.tone === "rose"
                              ? "text-[var(--color-rose)]"
                              : due.tone === "amber"
                                ? "text-[var(--color-amber)]"
                                : "text-[var(--color-ink-soft)]"
                          }`}
                        >
                          {due.text}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => togglePaid(b.id, b.status)}
                      title={b.status === "paid" ? "Mark as unpaid" : "Mark as paid"}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs ring-1 transition ${
                        b.status === "paid"
                          ? "text-[var(--color-mint)] ring-[var(--color-mint)]/40 hover:ring-[var(--color-mint)]"
                          : "bg-[var(--color-surface)] ring-[var(--color-line)] hover:ring-[var(--color-mint)]"
                      }`}
                    >
                      {b.status === "paid" ? "paid ✓" : "mark paid"}
                    </button>
                  </div>
                );
              })}
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
          <h2 className="text-sm font-semibold">Docs & Bills</h2>
        </header>
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">{content}</div>
      </div>
    );
  }

  return (
    <SlideOver id="docs" title="Docs & Bills">
      {content}
    </SlideOver>
  );
}
