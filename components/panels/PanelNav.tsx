"use client";

import { useCallback, useEffect, useState } from "react";
import { usePet, type PanelId } from "@/store/usePet";

const ITEMS: { id: Exclude<PanelId, null>; label: string }[] = [
  { id: "notes", label: "Notes" },
  { id: "docs", label: "Docs & Bills" },
  { id: "reminders", label: "Reminders" },
];

const ICONS: Record<Exclude<PanelId, null>, React.ReactNode> = {
  notes: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  ),
  docs: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  reminders: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
};

export default function PanelNav() {
  const setOpenPanel = usePet((s) => s.setOpenPanel);
  const setMood = usePet((s) => s.setMood);
  const [dueCount, setDueCount] = useState(0);

  const refreshDue = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders");
      const data = await res.json();
      const items: { overdue: boolean; dueAt: string | null }[] = data.reminders ?? [];
      const soon = items.filter(
        (r) => r.overdue || (r.dueAt && new Date(r.dueAt).getTime() - Date.now() < 3 * 86400000),
      ).length;
      setDueCount(soon);
      if (soon > 0) setMood("concerned");
    } catch {
      /* ignore */
    }
  }, [setMood]);

  useEffect(() => {
    refreshDue();
    const h = () => refreshDue();
    window.addEventListener("sarva:data", h);
    return () => window.removeEventListener("sarva:data", h);
  }, [refreshDue]);

  return (
    <nav className="flex items-center gap-1">
      {ITEMS.map((it) => (
        <button
          key={it.id}
          onClick={() => setOpenPanel(it.id)}
          className="relative flex items-center gap-1.5 rounded-full px-2 py-2 md:px-3 md:py-1.5 text-xs font-semibold text-[var(--color-ink-soft)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] cursor-pointer select-none"
          title={it.label}
        >
          {ICONS[it.id]}
          <span className="hidden md:inline">{it.label}</span>
          {it.id === "reminders" && dueCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--color-rose)] px-1 text-[9px] font-semibold text-white">
              {dueCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
