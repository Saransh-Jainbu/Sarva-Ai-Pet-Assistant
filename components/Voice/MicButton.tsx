"use client";

import { useRef, useState } from "react";
import { usePet } from "@/store/usePet";
import { stopSpeaking } from "@/lib/voice";
import { blobToWav16k } from "@/lib/wav";

type State = "idle" | "recording" | "transcribing";

export default function MicButton({
  onTranscript,
  onSend,
  onStatusChange,
}: {
  onTranscript?: (text: string) => void;
  onSend?: (text: string) => Promise<void>;
  onStatusChange?: (status: string) => void;
}) {
  const [state, setState] = useState<State>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    stopSpeaking();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        usePet.getState().setListening(false);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 1200) {
          setState("idle");
          onStatusChange?.("");
          return;
        }
        setState("transcribing");
        onStatusChange?.("transcribing…");
        usePet.getState().setThinking(true);
        try {
          // Normalise to 16kHz mono WAV so Saaras reliably accepts it.
          const wav = await blobToWav16k(blob);
          const form = new FormData();
          form.append("audio", wav, "speech.wav");
          const res = await fetch("/api/sarvam/stt", { method: "POST", body: form });
          const data = await res.json().catch(() => ({}));
          usePet.getState().setThinking(false);
          const transcript = (data.transcript || "").trim();
          if (transcript) {
            // Show what Sarva heard, then auto-send if onSend is provided.
            if (onSend) {
              await onSend(transcript);
            } else if (onTranscript) {
              onTranscript(transcript);
            }
          } else {
            console.warn("STT returned no transcript:", data);
            usePet.getState().say("I didn't catch that 👂");
            setTimeout(() => usePet.getState().say(null), 2500);
          }
        } catch (err) {
          console.error("STT/convert error:", err);
          usePet.getState().setThinking(false);
          usePet.getState().say("my ears glitched — try again? 🎧");
          setTimeout(() => usePet.getState().say(null), 2500);
        } finally {
          setState("idle");
          onStatusChange?.("");
        }
      };
      rec.start();
      recorderRef.current = rec;
      setState("recording");
      onStatusChange?.("listening…");
      usePet.getState().setListening(true);
    } catch {
      usePet.getState().say("I need mic access to listen 🎤");
      setTimeout(() => usePet.getState().say(null), 2800);
      setState("idle");
      onStatusChange?.("");
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  const onClick = () => {
    if (state === "recording") stop();
    else if (state === "idle") void start();
  };

  const recording = state === "recording";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "transcribing"}
      title={recording ? "Stop & send" : "Hold a thought — tap to talk"}
      aria-label={recording ? "Stop recording" : "Start voice input"}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${
        recording
          ? "bg-[var(--color-rose)] text-white"
          : state === "transcribing"
            ? "text-[var(--color-ink-soft)] opacity-60"
            : "text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
      }`}
    >
      {recording ? (
        <span className="h-3 w-3 animate-pulse rounded-sm bg-white" />
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <path d="M12 17v4" />
        </svg>
      )}
    </button>
  );
}
