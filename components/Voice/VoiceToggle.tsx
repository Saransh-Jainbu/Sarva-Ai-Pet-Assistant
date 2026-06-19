"use client";

import { usePet } from "@/store/usePet";
import { stopSpeaking } from "@/lib/voice";

export default function VoiceToggle() {
  const voiceOn = usePet((s) => s.voiceOn);
  const setVoiceOn = usePet((s) => s.setVoiceOn);

  return (
    <button
      type="button"
      onClick={() => {
        if (voiceOn) stopSpeaking();
        setVoiceOn(!voiceOn);
      }}
      title={voiceOn ? "Mute Sarva's voice" : "Let Sarva speak"}
      aria-label={voiceOn ? "Mute voice" : "Unmute voice"}
      className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-surface)] text-[var(--color-ink-soft)] ring-1 ring-[var(--color-line)] transition hover:text-[var(--color-ink)]"
    >
      {voiceOn ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H2v6h4l5 4V5Z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H2v6h4l5 4V5Z" />
          <path d="m22 9-6 6" />
          <path d="m16 9 6 6" />
        </svg>
      )}
    </button>
  );
}
