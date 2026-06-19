"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.7 34.6 27 35.5 24 35.5c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.6 5.6C41.9 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z" />
  </svg>
);

const go = () => signIn("google", { callbackUrl: "/" });

const MODELS = [
  { name: "Sarvam-105B", role: "the brain" },
  { name: "Bulbul v3", role: "her voice" },
  { name: "Saaras v3", role: "her ears" },
  { name: "Sarvam Vision", role: "reads docs" },
];

const FEATURES = [
  {
    emoji: "💬",
    title: "Chats & remembers",
    body: "Talk to Sarva like a friend. She keeps notes, recalls context, and actually gets things done with tools.",
    tone: "var(--color-accent)",
  },
  {
    emoji: "🔊",
    title: "Talks back",
    body: "Real, warm speech powered by Bulbul — her little mouth moves in sync as she replies.",
    tone: "var(--color-mint)",
  },
  {
    emoji: "🧾",
    title: "Bills → reminders",
    body: "Snap a photo of a bill. She reads it, pulls the due date and amount, and nudges you before it's late.",
    tone: "var(--color-amber)",
  },
  {
    emoji: "📄",
    title: "Reads your documents",
    body: "Sarvam Vision OCR turns any document into something Sarva can summarise, explain, and answer questions about.",
    tone: "var(--color-accent)",
  },
  {
    emoji: "🐾",
    title: "Pat & play",
    body: "Boop her head for a meow, tickle her whiskers for a purr. A real pet that lives on your screen.",
    tone: "var(--color-rose)",
  },
  {
    emoji: "🔒",
    title: "Private to you",
    body: "Google sign-in, your own isolated data. Every Sarvam call runs server-side — your key never leaves home.",
    tone: "var(--color-mint)",
  },
];

const STEPS = [
  { n: "1", title: "Adopt Sarva", body: "Sign in with Google — she's yours in one tap, completely free." },
  { n: "2", title: "Say hi", body: "Chat or talk. Drop in a bill or a note and watch her take care of it." },
  { n: "3", title: "She looks after you", body: "Reminders, summaries, and a friendly face that's always happy to see you." },
];

export default function Landing() {
  return (
    <main className="relative min-h-dvh overflow-x-hidden">
      {/* decorative background blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-blob absolute -left-24 top-10 h-72 w-72 rounded-full bg-[var(--color-accent-soft)] blur-3xl opacity-70" />
        <div className="animate-blob absolute right-[-6rem] top-40 h-80 w-80 rounded-full bg-[#dff3ea] blur-3xl opacity-70" style={{ animationDelay: "3s" }} />
        <div className="animate-blob absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#fbeede] blur-3xl opacity-60" style={{ animationDelay: "6s" }} />
      </div>

      {/* nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Image
            src="/logo.png"
            alt="Sarvam Pet"
            width={40}
            height={40}
            priority
            className="w-10 h-10"
          />
          Sarva
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-soft)] ring-1 ring-[var(--color-line)] sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-mint)]" />
            Powered by Sarvam
          </span>
          <button
            onClick={go}
            className="rounded-xl bg-[var(--color-ink)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Sign in
          </button>
        </div>
      </nav>

      {/* hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-8 pt-10 md:grid-cols-2 md:pt-16">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)]">
            ✨ Your pixel pet, powered by AI
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Meet <span className="text-shimmer">Sarva</span>,<br />
            the cutest little<br />
            AI companion.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--color-ink-soft)]">
            She chats, talks back, watches over your bills, reads your documents, and
            purrs when you tickle her whiskers — all running entirely on Sarvam models.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={go}
              className="group flex items-center gap-3 rounded-xl bg-[var(--color-surface)] px-5 py-3 text-sm font-medium shadow-sm ring-1 ring-[var(--color-line)] transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <GoogleIcon />
              Adopt Sarva — it&apos;s free
            </button>
            <a
              href="#features"
              className="rounded-xl px-5 py-3 text-sm font-medium text-[var(--color-ink-soft)] transition hover:text-[var(--color-ink)]"
            >
              See what she does ↓
            </a>
          </div>
          <p className="mt-4 text-xs text-[var(--color-ink-soft)]">
            Free • Google sign-in • Your data stays private to your account.
          </p>
        </div>

        {/* hero cat card */}
        <div className="animate-rise relative mx-auto w-full max-w-sm" style={{ animationDelay: "0.12s" }}>
          {/* floating sparkles */}
          <span className="animate-twinkle absolute -left-2 top-6 text-2xl">✦</span>
          <span className="animate-twinkle absolute right-2 top-0 text-xl" style={{ animationDelay: "1s" }}>✦</span>
          <span className="animate-twinkle absolute -right-3 bottom-24 text-lg" style={{ animationDelay: "1.6s" }}>♥</span>

          <div className="rounded-[28px] border border-[var(--color-line)] bg-[var(--color-surface)]/80 p-6 shadow-[0_30px_60px_-25px_rgba(124,108,240,0.45)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Sarva</p>
                <p className="text-xs text-[var(--color-ink-soft)]">feeling playful</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-mint)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-mint)]" /> online
              </span>
            </div>

            <div className="relative mt-4 grid place-items-center rounded-3xl bg-gradient-to-b from-[var(--color-accent-soft)] to-[var(--color-surface-2)] py-10">
              <div className="absolute right-6 top-5 rounded-2xl rounded-br-sm bg-[var(--color-surface)] px-3 py-1.5 text-xs shadow-sm ring-1 ring-[var(--color-line)]">
                meow! 🐾
              </div>
              <div className="animate-floaty drop-shadow-[0_18px_22px_rgba(124,108,240,0.25)]">
                <Image
                  src="/hero.png"
                  alt="Sarva"
                  width={200}
                  height={200}
                  className="w-32 h-32"
                  priority
                />
              </div>
            </div>

            {/* energy bar */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-[var(--color-ink-soft)]">
                <span>Energy</span>
                <span>92%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-[var(--color-mint)] to-[var(--color-accent)]" />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              {["💬 chat", "🔊 talk", "🧾 bills"].map((t) => (
                <span key={t} className="flex-1 rounded-xl bg-[var(--color-surface-2)] py-2 text-center text-xs font-medium text-[var(--color-ink-soft)]">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* powered by sarvam strip */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-soft)]">
          Powered entirely by Sarvam
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {MODELS.map((m) => (
            <div
              key={m.name}
              className="flex items-center gap-2 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2.5 shadow-sm"
            >
              <span className="text-sm font-semibold">{m.name}</span>
              <span className="text-xs text-[var(--color-ink-soft)]">· {m.role}</span>
            </div>
          ))}
        </div>
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            A pet that actually <span className="text-[var(--color-accent)]">helps</span>.
          </h2>
          <p className="mt-3 text-[var(--color-ink-soft)]">
            Sarva is adorable on the surface and genuinely useful underneath.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div
                className="grid h-12 w-12 place-items-center rounded-2xl text-2xl transition group-hover:scale-110"
                style={{ background: "color-mix(in srgb, " + f.tone + " 14%, transparent)" }}
              >
                {f.emoji}
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-soft)]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)]/70 p-6 backdrop-blur">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-accent)] text-sm font-bold text-white">
                {s.n}
              </div>
              <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-soft)]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* final CTA */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="relative overflow-hidden rounded-[32px] border border-[var(--color-line)] bg-gradient-to-br from-[var(--color-accent-soft)] via-[var(--color-surface)] to-[#dff3ea] px-8 py-14 text-center shadow-sm">
          <span className="animate-twinkle absolute left-10 top-8 text-2xl">✦</span>
          <span className="animate-twinkle absolute right-12 bottom-10 text-xl" style={{ animationDelay: "1.2s" }}>♥</span>
          <div className="animate-floaty mx-auto h-20 w-20 rounded-full bg-[var(--color-surface)] shadow-sm overflow-hidden">
            <Image
              src="/logo.png"
              alt="Sarva"
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
            Give Sarva a home.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[var(--color-ink-soft)]">
            Your warm, clever, slightly mischievous AI companion is waiting to meet you.
          </p>
          <button
            onClick={go}
            className="mx-auto mt-7 flex items-center gap-3 rounded-xl bg-[var(--color-ink)] px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:opacity-90"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-center text-xs text-[var(--color-ink-soft)]">
        Made with 🐾 and Sarvam AI · Sarva keeps your data private to your account.
      </footer>
    </main>
  );
}
