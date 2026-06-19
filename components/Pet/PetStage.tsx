"use client";

import { AnimatePresence, motion } from "framer-motion";
import ThreeCat from "./ThreeCat";
import { usePet, type PetMood } from "@/store/usePet";

const moodCaption: Record<PetMood, string> = {
  idle: "hanging out",
  happy: "happy you're here",
  listening: "listening…",
  thinking: "thinking…",
  speaking: "talking",
  curious: "curious",
  sleepy: "a little sleepy",
  concerned: "something's due soon",
};

export default function PetStage() {
  const name = usePet((s) => s.name);
  const mood = usePet((s) => s.mood);
  const bubble = usePet((s) => s.bubble);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* speech bubble */}
      <div className="h-16 flex items-end">
        <AnimatePresence>
          {bubble && (
            <motion.div
              key={bubble}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="relative max-w-xs rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm shadow-sm"
            >
              {bubble}
              <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-[var(--color-line)] bg-[var(--color-surface)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* the pet */}
      <div className="animate-floaty drop-shadow-[0_18px_24px_rgba(44,125,102,0.18)]">
        <ThreeCat />
      </div>

      {/* shadow puck */}
      <div className="-mt-2 h-2 w-28 rounded-full bg-black/10 blur-[3px]" />

      {/* name + mood */}
      <div className="text-center">
        <p
          className="text-[var(--color-ink)]"
          style={{ fontFamily: "var(--font-pixel)", fontSize: 14 }}
        >
          {name}
        </p>
        <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{moodCaption[mood]}</p>
      </div>
    </div>
  );
}
