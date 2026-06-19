"use client";

import { useEffect, useState } from "react";
import { usePet } from "@/store/usePet";
import { useChat } from "@/store/useChat";
import { blobToWav16k } from "@/lib/wav";

/**
 * Hands-free conversation while the camera is on. Sarva listens continuously,
 * uses simple energy-based voice-activity detection to grab each spoken phrase,
 * transcribes it with Sarvam STT (Saaras), and sends it to the chat brain —
 * which replies and speaks back via Bulbul.
 *
 * To avoid hearing herself, the loop won't start a new phrase while Sarva is
 * thinking or speaking (and the mic uses echo cancellation).
 */

// VAD tuning (RMS of normalised mic samples).
const START_RMS = 0.05; // loud enough to count as the start of speech
const KEEP_RMS = 0.022; // still talking
const SILENCE_MS = 900; // trailing silence that ends a phrase
const MAX_PHRASE_MS = 15000; // hard cap so a noisy room can't record forever
const MIN_BLOB = 1800; // ignore tiny clicks

type LoopState = "idle" | "recording" | "busy";

export default function LiveConversation() {
  const cameraOn = usePet((s) => s.cameraOn);
  const [active, setActive] = useState(false);
  const [hint, setHint] = useState("listening…");

  useEffect(() => {
    if (!cameraOn) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let buf: Float32Array | null = null;
    let rec: MediaRecorder | null = null;
    let chunks: Blob[] = [];
    let interval: ReturnType<typeof setInterval> | null = null;

    let state: LoopState = "idle";
    let lastVoice = 0;
    let speechStart = 0;
    let voiceFrames = 0;

    const gateOpen = () => {
      const p = usePet.getState();
      return !p.speaking && !p.thinking && !useChat.getState().busy;
    };

    const startUtterance = () => {
      chunks = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      rec = new MediaRecorder(stream!, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      rec.onstop = onUtteranceEnd;
      rec.start();
      state = "recording";
      speechStart = performance.now();
      lastVoice = speechStart;
      usePet.getState().setListening(true);
      setHint("listening…");
    };

    const onUtteranceEnd = async () => {
      usePet.getState().setListening(false);
      const dur = performance.now() - speechStart;
      const type = rec?.mimeType || "audio/webm";
      const blob = new Blob(chunks, { type });
      rec = null;
      if (cancelled) return;
      if (blob.size < MIN_BLOB || dur < 400) {
        state = "idle";
        return;
      }

      state = "busy";
      setHint("got it…");
      try {
        const wav = await blobToWav16k(blob);
        const form = new FormData();
        form.append("audio", wav, "speech.wav");
        const res = await fetch("/api/sarvam/stt", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        const transcript = (data.transcript || "").trim();
        if (transcript && !cancelled) {
          setHint("replying…");
          await useChat.getState().send(transcript); // reply + TTS
        }
      } catch (e) {
        console.error("Live STT error:", e);
      } finally {
        if (!cancelled) {
          state = "idle";
          setHint("listening…");
        }
      }
    };

    const tick = () => {
      if (cancelled || !analyser || !buf) return;
      analyser.getFloatTimeDomainData(buf as unknown as Float32Array<ArrayBuffer>);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      const now = performance.now();

      if (state === "idle") {
        if (rms > START_RMS && gateOpen()) {
          voiceFrames++;
          if (voiceFrames >= 2) startUtterance();
        } else {
          voiceFrames = 0;
        }
      } else if (state === "recording") {
        if (rms > KEEP_RMS) lastVoice = now;
        if (now - lastVoice > SILENCE_MS || now - speechStart > MAX_PHRASE_MS) {
          try {
            rec?.stop();
          } catch {
            /* ignore */
          }
        }
      }
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        await ctx.resume();
        const src = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        buf = new Float32Array(analyser.fftSize);
        src.connect(analyser);
        interval = setInterval(tick, 40);
        setActive(true);
        const pet = usePet.getState();
        pet.say("I'm all ears — just talk to me 🎙️");
        setTimeout(() => {
          if (usePet.getState().bubble?.includes("all ears")) usePet.getState().say(null);
        }, 3500);
      } catch (e) {
        console.error("Live mic error:", e);
        usePet.getState().say("I need mic access to chat live 🎤");
        setTimeout(() => usePet.getState().say(null), 3000);
      }
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      try {
        rec?.stop();
      } catch {
        /* ignore */
      }
      if (ctx) {
        try {
          void ctx.close();
        } catch {
          /* ignore */
        }
      }
      if (stream) stream.getTracks().forEach((t) => t.stop());
      usePet.getState().setListening(false);
      setActive(false);
    };
  }, [cameraOn]);

  if (!cameraOn || !active) return null;

  return (
    <div className="fixed bottom-5 left-5 z-30 flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-medium shadow-lg">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-rose)] opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-rose)]" />
      </span>
      Live · {hint}
    </div>
  );
}
