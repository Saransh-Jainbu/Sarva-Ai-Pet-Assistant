"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePet } from "@/store/usePet";

export default function SlideOver({
  id,
  title,
  children,
}: {
  id: "notes" | "docs" | "reminders";
  title: string;
  children: React.ReactNode;
}) {
  const openPanel = usePet((s) => s.openPanel);
  const setOpenPanel = usePet((s) => s.setOpenPanel);
  const open = openPanel === id;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenPanel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpenPanel]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-30 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenPanel(null)}
          />
          <motion.aside
            className="fixed right-0 top-0 z-40 flex h-dvh w-full max-w-sm flex-col border-l border-[var(--color-line)] bg-[var(--color-bg)] shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <header className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
              <h2 className="text-sm font-semibold">{title}</h2>
              <button
                onClick={() => setOpenPanel(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-2)]"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
