"use client";

import { useRef, useState } from "react";
import { useChat } from "@/store/useChat";
import MicButton from "@/components/Voice/MicButton";
import CameraButton from "@/components/Webcam/CameraButton";

export default function ChatDock() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const send = useChat((s) => s.send);
  const busy = useChat((s) => s.busy);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const submit = () => {
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    void send(t);
  };

  const autoSendTranscript = async (transcript: string) => {
    setText("");
    await send(transcript);
  };

  return (
    <div className="flex items-end gap-2 rounded-[var(--radius-xl)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2 shadow-sm">
      <MicButton
        onSend={autoSendTranscript}
        onStatusChange={setStatus}
      />
      <CameraButton />
      <div className="flex-1 flex flex-col justify-center">
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={status || "Talk to Sarva…"}
          className="max-h-32 min-h-[40px] resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[var(--color-ink-soft)]"
        />
        {status && (
          <div className="px-2 text-xs text-[var(--color-ink-soft)] italic animate-pulse">
            {status}
          </div>
        )}
      </div>
      <button
        onClick={submit}
        disabled={busy || !text.trim()}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-accent)] text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Send"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2 11 13" />
          <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
        </svg>
      </button>
    </div>
  );
}
