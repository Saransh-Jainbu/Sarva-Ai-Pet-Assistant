"use client";

import { useEffect, useRef, useState } from "react";
import { usePet } from "@/store/usePet";

/**
 * "The pet sees you." Runs Google MediaPipe FaceLandmarker fully on-device (no
 * AI API, private) to derive where the user is looking + whether they're present
 * and attentive, then pushes that into the pet store so Sarva's eyes follow the
 * user. A throttled snapshot can be sent to Sarvam Vision via `sarva:describe`.
 *
 * MediaPipe WASM + model are fetched from a CDN, so this needs network in the
 * browser. Everything is torn down when the camera is toggled off.
 */

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

function bs(cats: { categoryName: string; score: number }[], name: string) {
  return cats.find((c) => c.categoryName === name)?.score ?? 0;
}

export default function WebcamPet({ inline = false }: { inline?: boolean }) {
  const cameraOn = usePet((s) => s.cameraOn);
  const [status, setStatus] = useState<"off" | "loading" | "on" | "error">("off");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!cameraOn) {
      setStatus("off");
      return;
    }

    let stream: MediaStream | null = null;
    let landmarker: { detectForVideo: (v: HTMLVideoElement, t: number) => unknown; close: () => void } | null = null;
    let raf = 0;
    let cancelled = false;
    const smooth = { x: 0, y: 0 };
    let lastStoreUpdate = 0;

    const describe = async () => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return;
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = Math.round((video.videoHeight / video.videoWidth) * 320) || 240;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      const pet = usePet.getState();
      pet.setThinking(true);
      pet.say("let me look… 👀");
      try {
        const res = await fetch("/api/sarvam/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        });
        const data = await res.json().catch(() => ({}));
        pet.setThinking(false);
        const text = (data.description || data.error || "I can't quite see right now.").toString();
        pet.say(text.length > 140 ? text.slice(0, 137) + "…" : text);
        const { speak } = await import("@/lib/voice");
        void speak(text);
        setTimeout(() => usePet.getState().say(null), 6000);
      } catch {
        pet.setThinking(false);
        pet.say("my eyes went blurry for a sec 🫣");
        setTimeout(() => usePet.getState().say(null), 3000);
      }
    };

    const onDescribe = () => void describe();
    window.addEventListener("sarva:describe", onDescribe);

    (async () => {
      try {
        setStatus("loading");
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_CDN);
        const fl = await vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
        if (cancelled) {
          fl.close();
          return;
        }
        landmarker = fl as unknown as typeof landmarker;

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        const video = videoRef.current;
        if (!video || cancelled) return;
        video.srcObject = stream;
        await video.play();
        setStatus("on");

        const loop = () => {
          if (cancelled || !landmarker || !video) return;
          const now = performance.now();
          let present = false;
          let gx = 0;
          let gy = 0;
          try {
            const result = landmarker.detectForVideo(video, now) as {
              faceBlendshapes?: { categories: { categoryName: string; score: number }[] }[];
            };
            const shapes = result.faceBlendshapes?.[0]?.categories;
            if (shapes && shapes.length) {
              present = true;
              const leftX = bs(shapes, "eyeLookOutLeft") - bs(shapes, "eyeLookInLeft");
              const rightX = bs(shapes, "eyeLookInRight") - bs(shapes, "eyeLookOutRight");
              gx = ((leftX + rightX) / 2) * 2.2; // amplify into ~-1..1
              const up = (bs(shapes, "eyeLookUpLeft") + bs(shapes, "eyeLookUpRight")) / 2;
              const down = (bs(shapes, "eyeLookDownLeft") + bs(shapes, "eyeLookDownRight")) / 2;
              gy = (down - up) * 2.4;
            }
          } catch {
            /* skip frame */
          }

          // smooth
          smooth.x += (Math.max(-1, Math.min(1, gx)) - smooth.x) * 0.25;
          smooth.y += (Math.max(-1, Math.min(1, gy)) - smooth.y) * 0.25;

          // throttle store writes to ~20fps
          if (now - lastStoreUpdate > 50) {
            lastStoreUpdate = now;
            const pet = usePet.getState();
            pet.setGaze({ x: smooth.x, y: smooth.y });
            const attentive = present && Math.abs(smooth.x) < 0.45 && Math.abs(smooth.y) < 0.5;
            if (pet.present !== present || pet.attentive !== attentive) {
              pet.setPresence(present, attentive);
            }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (err) {
        console.error("Webcam/MediaPipe error:", err);
        setStatus("error");
        usePet.getState().say("I couldn't open the camera 📷");
        setTimeout(() => usePet.getState().say(null), 3000);
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("sarva:describe", onDescribe);
      cancelAnimationFrame(raf);
      if (landmarker) {
        try {
          landmarker.close();
        } catch {
          /* ignore */
        }
      }
      if (stream) stream.getTracks().forEach((t) => t.stop());
      usePet.getState().setPresence(false, false);
      usePet.getState().setGaze({ x: 0, y: 0 });
    };
  }, [cameraOn]);

  if (!cameraOn) return null;

  return (
    <div className={inline
      ? "relative w-full overflow-hidden rounded-2xl border border-[var(--color-line)] bg-black/80 shadow-sm mt-3"
      : "fixed bottom-5 right-5 z-20 w-40 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-black/80 shadow-lg lg:hidden"
    }>
      <video
        ref={videoRef}
        muted
        playsInline
        className="block w-full -scale-x-100"
        style={{ aspectRatio: "4 / 3", objectFit: "cover" }}
      />
      <div className="flex items-center justify-between px-2 py-1 text-[10px] text-white/90">
        <span className="flex items-center gap-1">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === "on" ? "bg-[var(--color-mint)]" : "bg-[var(--color-amber)]"
            }`}
          />
          {status === "on" ? "watching" : status === "loading" ? "waking up…" : status}
        </span>
        <span className="opacity-70">on-device</span>
      </div>
    </div>
  );
}
