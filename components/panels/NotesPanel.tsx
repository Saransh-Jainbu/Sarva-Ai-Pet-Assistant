"use client";

import { useCallback, useEffect, useState } from "react";
import SlideOver from "./SlideOver";
import { usePet } from "@/store/usePet";

type Note = { id: string; title: string; body: string; createdAt: string };

export default function NotesPanel({ inline = false }: { inline?: boolean }) {
  const open = usePet((s) => s.openPanel) === "notes";
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", body: "" });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      setNotes(data.notes ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open || inline) refresh();
  }, [open, inline, refresh]);

  useEffect(() => {
    const h = () => (open || inline) && refresh();
    window.addEventListener("sarva:data", h);
    return () => window.removeEventListener("sarva:data", h);
  }, [open, inline, refresh]);

  const remove = async (id: string) => {
    setNotes((n) => n.filter((x) => x.id !== id));
    await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
  };

  const startEdit = (n: Note) => {
    setEditId(n.id);
    setDraft({ title: n.title, body: n.body });
  };

  const saveEdit = async () => {
    if (!editId) return;
    const id = editId;
    setNotes((n) =>
      n.map((x) => (x.id === id ? { ...x, title: draft.title, body: draft.body } : x)),
    );
    setEditId(null);
    await fetch("/api/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title: draft.title, body: draft.body }),
    });
  };

  const content = (
    <>
      {loading && notes.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)]">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)]">
          No notes yet. Ask Sarva to remember something for you. 🌿
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((n) =>
            editId === n.id ? (
              <li
                key={n.id}
                className="rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-surface)] p-3"
              >
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  className="w-full rounded-lg bg-[var(--color-surface-2)] px-2 py-1.5 text-sm font-medium outline-none"
                  placeholder="Title"
                />
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-lg bg-[var(--color-surface-2)] px-2 py-1.5 text-sm outline-none"
                  placeholder="Note"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setEditId(null)}
                    className="rounded-full px-3 py-1 text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                  >
                    cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    className="rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs text-white"
                  >
                    save
                  </button>
                </div>
              </li>
            ) : (
              <li
                key={n.id}
                className="group rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  <div className="flex shrink-0 gap-2 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => startEdit(n)}
                      className="text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]"
                      aria-label="Edit note"
                    >
                      edit
                    </button>
                    <button
                      onClick={() => remove(n.id)}
                      className="text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-rose)]"
                      aria-label="Delete note"
                    >
                      delete
                    </button>
                  </div>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-ink-soft)]">
                  {n.body}
                </p>
              </li>
            ),
          )}
        </ul>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between border-b border-[var(--color-line)] pb-3 mb-4 shrink-0">
          <h2 className="text-sm font-semibold">Notes</h2>
        </header>
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">{content}</div>
      </div>
    );
  }

  return (
    <SlideOver id="notes" title="Notes">
      {content}
    </SlideOver>
  );
}
