"use client";

import { useEffect } from "react";
import Image from "next/image";
import PetStage from "@/components/Pet/PetStage";
import ChatThread from "@/components/Chat/ChatThread";
import ChatDock from "@/components/Chat/ChatDock";
import VoiceToggle from "@/components/Voice/VoiceToggle";
import WebcamPet from "@/components/Webcam/WebcamPet";
import LiveConversation from "@/components/Voice/LiveConversation";
import PanelNav from "@/components/panels/PanelNav";
import NotesPanel from "@/components/panels/NotesPanel";
import DocsPanel from "@/components/panels/DocsPanel";
import RemindersPanel from "@/components/panels/RemindersPanel";
import UserMenu from "@/components/auth/UserMenu";
import { usePet } from "@/store/usePet";

export default function Dashboard({
  user,
}: {
  user: { name: string; image: string | null };
}) {
  const say = usePet((s) => s.say);
  const energy = usePet((s) => s.energy);
  const openPanel = usePet((s) => s.openPanel);

  // Load the saved pet name/energy so it carries across sessions.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/pet")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.name) usePet.getState().setName(data.name);
        if (typeof data.energy === "number") usePet.getState().setEnergy(data.energy);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const first = user.name.split(" ")[0] || "friend";
    say(`hi ${first}! i'm ${usePet.getState().name} ✨`);
    const id = setTimeout(() => say(null), 3500);
    return () => clearTimeout(id);
  }, [say, user.name]);

  return (
    <main className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      <header className="w-full mx-auto flex max-w-3xl lg:max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Sarvam Pet"
            width={48}
            height={48}
            priority
            className="w-12 h-12"
          />
        </div>
        <div className="flex items-center gap-2">
          <PanelNav />
          <VoiceToggle />
          <UserMenu name={user.name} image={user.image} />
        </div>
      </header>

      {/* Main Body Grid */}
      <div className="mx-auto max-w-3xl lg:max-w-7xl px-4 pt-4 lg:px-6 lg:pt-6 flex flex-col lg:flex-row gap-6 items-stretch w-full flex-1 pb-10">
        
        {/* Left Column: Pet Companion Card */}
        <div className="flex flex-col items-center w-full lg:w-80 lg:shrink-0">
          <div className="w-full rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 lg:p-6 shadow-sm flex flex-col items-center gap-4">
            <PetStage />
            
            {/* Pet Stats Bar */}
            <div className="w-full border-t border-[var(--color-line)] pt-4 mt-2">
              <div className="flex items-center justify-between text-xs text-[var(--color-ink-soft)] mb-2 font-medium">
                <span>Energy Level</span>
                <span className="font-semibold">{energy}%</span>
              </div>
              <div className="h-2 w-full bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[var(--color-mint)] transition-all duration-500" 
                  style={{ width: `${energy}%` }}
                />
              </div>
            </div>
            
            {/* Webcam feed embedded inside the card on desktop if active */}
            <div className="hidden lg:block w-full">
              <WebcamPet inline={true} />
            </div>
          </div>
        </div>

        {/* Center Column: Chat Card */}
        <div className="flex-1 flex flex-col w-full min-w-0">
          <div className="w-full rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 lg:p-6 shadow-sm flex flex-col flex-1 min-h-[400px] h-[520px] lg:h-auto max-h-[70vh] lg:max-h-[640px]">
            <header className="flex items-center justify-between border-b border-[var(--color-line)] pb-3 mb-4 shrink-0">
              <h2 className="text-sm font-semibold tracking-tight text-[var(--color-ink-soft)]">
                Chat Workspace
              </h2>
              <span className="text-xs text-[var(--color-mint)] font-medium bg-[var(--color-mint)]/10 px-2 py-0.5 rounded-full">
                Online
              </span>
            </header>
            <div className="flex-1 overflow-y-auto min-h-0">
              <ChatThread />
            </div>
            <div className="mt-4 shrink-0">
              <ChatDock />
            </div>
          </div>
        </div>

        {/* Right Column: Inline Workspace Panel */}
        <div className="w-full lg:w-96 lg:shrink-0 flex flex-col">
          {openPanel ? (
            <div className="h-full rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 lg:p-6 shadow-sm min-h-[400px] max-h-[600px] lg:max-h-[640px] flex flex-col">
              {openPanel === "notes" && <NotesPanel inline={true} />}
              {openPanel === "docs" && <DocsPanel inline={true} />}
              {openPanel === "reminders" && <RemindersPanel inline={true} />}
            </div>
          ) : (
            <div className="hidden lg:flex flex-col h-full rounded-3xl border border-dashed border-[var(--color-line)] p-8 text-center justify-center items-center text-[var(--color-ink-soft)] gap-4 bg-[var(--color-surface)]/30 min-h-[460px] max-h-[640px]">

              <div className="h-14 w-14 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-xl shadow-sm border border-[var(--color-line)] animate-floaty">
                ✨
              </div>
              <div>
                <h4 className="font-semibold text-sm text-[var(--color-ink)]">Interactive Workspace</h4>
                <p className="text-xs text-[var(--color-ink-soft)] mt-1.5 max-w-[240px] mx-auto leading-relaxed">
                  Click **Notes**, **Docs & Bills**, or **Reminders** in the navigation bar to inspect and manage items side-by-side with your pet.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hands-free voice loop while the camera is on */}
      <LiveConversation />

      {/* Mobile-only drawers and webcam */}
      <div className="lg:hidden">
        <WebcamPet />
        <NotesPanel />
        <DocsPanel />
        <RemindersPanel />
      </div>
    </main>
  );
}
