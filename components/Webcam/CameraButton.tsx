"use client";

import { usePet } from "@/store/usePet";

export default function CameraButton() {
  const cameraOn = usePet((s) => s.cameraOn);
  const setCameraOn = usePet((s) => s.setCameraOn);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setCameraOn(!cameraOn)}
        title={cameraOn ? "Turn camera off" : "Let Sarva see you"}
        aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${
          cameraOn
            ? "bg-[var(--color-mint)] text-white"
            : "text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 7l-7 5 7 5V7Z" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
      </button>
      {cameraOn && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("sarva:describe"))}
          title="Ask Sarva what it sees"
          aria-label="Ask what the pet sees"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[var(--color-ink-soft)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      )}
    </div>
  );
}
