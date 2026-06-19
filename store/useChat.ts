"use client";

import { create } from "zustand";
import { usePet } from "@/store/usePet";
import { speak } from "@/lib/voice";

export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
};

type ChatState = {
  messages: ChatMsg[];
  busy: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  send: (text: string) => Promise<void>;
  pushAssistant: (text: string) => void;
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Roughly how long to keep the speech bubble up, based on message length. */
function speakDuration(text: string) {
  return Math.min(7000, Math.max(2500, text.length * 45));
}

let bubbleTimer: ReturnType<typeof setTimeout> | null = null;

function petSay(text: string) {
  const pet = usePet.getState();
  pet.say(text.length > 140 ? text.slice(0, 137) + "…" : text);
  if (bubbleTimer) clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => {
    usePet.getState().say(null);
  }, speakDuration(text));

  // Speak aloud (Bulbul TTS drives the speaking mouth); if voice is off this
  // resolves immediately and the pet just shows the bubble.
  void speak(text);
}

export const useChat = create<ChatState>((set, get) => ({
  messages: [],
  busy: false,
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        set({ messages: data.messages ?? [], loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  pushAssistant: (text) => {
    set((s) => ({ messages: [...s.messages, { id: uid(), role: "assistant", content: text }] }));
    petSay(text);
  },

  send: async (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().busy) return;

    const userMsg: ChatMsg = { id: uid(), role: "user", content: trimmed };
    set((s) => ({ messages: [...s.messages, userMsg], busy: true }));
    usePet.getState().setThinking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      usePet.getState().setThinking(false);

      const reply: string =
        data.reply ?? data.error ?? "Hmm, I couldn't reach my brain just now.";
      set((s) => ({
        messages: [...s.messages, { id: uid(), role: "assistant", content: reply }],
      }));
      petSay(reply);
      // Let any open panels refresh if the brain touched notes/bills/reminders.
      if (typeof window !== "undefined" && (data.toolsUsed?.length ?? 0) > 0) {
        window.dispatchEvent(new CustomEvent("sarva:data"));
      }
    } catch {
      usePet.getState().setThinking(false);
      const reply = "I had trouble connecting just now — try again in a moment?";
      set((s) => ({
        messages: [...s.messages, { id: uid(), role: "assistant", content: reply }],
      }));
      petSay(reply);
    } finally {
      set({ busy: false });
    }
  },
}));
