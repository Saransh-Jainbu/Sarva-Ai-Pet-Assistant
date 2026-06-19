"use client";

import { create } from "zustand";

export type PetMood =
  | "idle"
  | "happy"
  | "listening"
  | "thinking"
  | "speaking"
  | "curious"
  | "sleepy"
  | "concerned";

export type PanelId = "notes" | "docs" | "reminders" | null;

type PetState = {
  name: string;
  mood: PetMood;
  energy: number; // 0..100

  /** Where the user is looking, normalised to roughly -1..1 (drives pupils). */
  gaze: { x: number; y: number };
  /** Whether a face is currently detected on the webcam. */
  present: boolean;
  /** Whether the user appears to be looking at the screen/pet. */
  attentive: boolean;
  /** Whether the webcam is enabled at all. */
  cameraOn: boolean;

  listening: boolean;
  speaking: boolean;
  thinking: boolean;

  /** Whether the pet speaks replies aloud (Bulbul TTS). */
  voiceOn: boolean;

  /** Transient line the pet "says" in a speech bubble. */
  bubble: string | null;

  openPanel: PanelId;

  setName: (name: string) => void;
  setMood: (mood: PetMood) => void;
  setEnergy: (energy: number) => void;
  setGaze: (gaze: { x: number; y: number }) => void;
  setPresence: (present: boolean, attentive?: boolean) => void;
  setCameraOn: (on: boolean) => void;
  setListening: (v: boolean) => void;
  setSpeaking: (v: boolean) => void;
  setThinking: (v: boolean) => void;
  setVoiceOn: (v: boolean) => void;
  say: (text: string | null) => void;
  setOpenPanel: (panel: PanelId) => void;
};

/**
 * Derive the "natural" mood from current activity flags so callers can just set
 * flags (thinking/speaking/listening) and let the pet pick the right face,
 * while still allowing an explicit override via setMood.
 */
function activityMood(s: Pick<PetState, "listening" | "speaking" | "thinking" | "present" | "attentive">): PetMood {
  if (s.speaking) return "speaking";
  if (s.thinking) return "thinking";
  if (s.listening) return "listening";
  if (!s.present) return "sleepy";
  if (s.attentive) return "happy";
  return "curious";
}

export const usePet = create<PetState>((set, get) => ({
  name: "Sarva",
  mood: "idle",
  energy: 80,

  gaze: { x: 0, y: 0 },
  present: false,
  attentive: false,
  cameraOn: false,

  listening: false,
  speaking: false,
  thinking: false,
  voiceOn: true,

  bubble: null,
  openPanel: null,

  setName: (name) => set({ name: name.trim() || "Sarva" }),
  setMood: (mood) => set({ mood }),
  setEnergy: (energy) => set({ energy: Math.max(0, Math.min(100, energy)) }),
  setGaze: (gaze) => set({ gaze }),
  setPresence: (present, attentive) => {
    const next = {
      present,
      attentive: attentive ?? get().attentive,
    };
    set({ ...next, mood: activityMood({ ...get(), ...next }) });
  },
  setCameraOn: (cameraOn) =>
    set((s) =>
      cameraOn
        ? { cameraOn }
        : { cameraOn, present: false, attentive: false, gaze: { x: 0, y: 0 } },
    ),
  setListening: (listening) =>
    set((s) => ({ listening, mood: activityMood({ ...s, listening }) })),
  setSpeaking: (speaking) =>
    set((s) => ({ speaking, mood: activityMood({ ...s, speaking }) })),
  setThinking: (thinking) =>
    set((s) => ({ thinking, mood: activityMood({ ...s, thinking }) })),
  setVoiceOn: (voiceOn) => set({ voiceOn }),
  say: (bubble) => set({ bubble }),
  setOpenPanel: (openPanel) => set({ openPanel }),
}));
