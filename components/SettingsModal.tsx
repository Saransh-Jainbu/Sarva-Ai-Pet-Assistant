"use client";

import { useEffect, useRef, useState } from "react";
import { usePet } from "@/store/usePet";

/** Settings dialog. Currently lets the user rename their pet (persisted to the
 *  PetState row via /api/pet). Opened from the account menu. */
export default function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const name = usePet((s) => s.name);
  const setName = usePet((s) => s.setName);
  const say = usePet((s) => s.say);

  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync the field to the current name each time the dialog opens.
  useEffect(() => {
    if (open) {
      setValue(name);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const save = async () => {
    const next = value.trim();
    if (!next) {
      setError("Please enter a name.");
      return;
    }
    if (next === name) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pet", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't save. Try again?");
        return;
      }
      setName(data.name ?? next);
      say(`I'm ${data.name ?? next} now! 💜`);
      setTimeout(() => usePet.getState().say(null), 3000);
      onClose();
    } catch {
      setError("Couldn't save. Try again?");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="animate-rise relative w-full max-w-sm rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--color-accent-soft)] text-xl">
            🐱
          </span>
          <div>
            <h2 className="text-base font-semibold">Settings</h2>
            <p className="text-xs text-[var(--color-ink-soft)]">Make your pet yours.</p>
          </div>
        </div>

        <div className="mt-6">
          <label htmlFor="pet-name" className="text-xs font-semibold text-[var(--color-ink-soft)]">
            Pet name
          </label>
          <input
            id="pet-name"
            ref={inputRef}
            value={value}
            maxLength={24}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void save();
              }
            }}
            placeholder="e.g. Mochi, Pixel, Bujji…"
            className="mt-1.5 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)]"
          />
          {error && <p className="mt-2 text-xs text-[var(--color-rose)]">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--color-ink-soft)] transition hover:bg-[var(--color-surface-2)]"
          >
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
