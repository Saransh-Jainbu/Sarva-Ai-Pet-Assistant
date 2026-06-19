"use client";

import { usePet } from "@/store/usePet";

let current: HTMLAudioElement | null = null;
let simTimer: ReturnType<typeof setTimeout> | null = null;

function runSimulation(text: string) {
  if (simTimer) {
    clearTimeout(simTimer);
  }
  usePet.getState().setSpeaking(true);
  const duration = Math.min(7000, Math.max(2500, text.length * 45));
  simTimer = setTimeout(() => {
    usePet.getState().setSpeaking(false);
    simTimer = null;
  }, duration);
}

/** Stop any in-progress pet speech. */
export function stopSpeaking() {
  if (current) {
    current.pause();
    current.src = "";
    current = null;
  }
  if (simTimer) {
    clearTimeout(simTimer);
    simTimer = null;
  }
  usePet.getState().setSpeaking(false);
}

/**
 * Fetch Bulbul TTS for `text` and play it, keeping the pet's "speaking" mouth in
 * sync with real audio playback. Returns when audio ends (or resolves immediately
 * if voice is off / unavailable). Falls back silently on any error.
 */
export async function speak(text: string): Promise<void> {
  const pet = usePet.getState();
  
  if (simTimer) {
    clearTimeout(simTimer);
    simTimer = null;
  }

  if (!pet.voiceOn || !text.trim()) {
    runSimulation(text);
    return;
  }

  try {
    const res = await fetch("/api/sarvam/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      runSimulation(text);
      return;
    }
    const data = await res.json();
    if (!data.audio) {
      runSimulation(text);
      return;
    }

    stopSpeaking();
    const audio = new Audio(`data:${data.mimeType || "audio/wav"};base64,${data.audio}`);
    current = audio;
    usePet.getState().setSpeaking(true);

    await new Promise<void>((resolve) => {
      audio.onended = () => {
        if (current === audio) current = null;
        usePet.getState().setSpeaking(false);
        resolve();
      };
      audio.onerror = () => {
        if (current === audio) current = null;
        runSimulation(text);
        resolve();
      };
      audio.play().catch(() => {
        runSimulation(text);
        resolve();
      });
    });
  } catch {
    runSimulation(text);
  }
}
