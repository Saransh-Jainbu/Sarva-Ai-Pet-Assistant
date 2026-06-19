<div align="center">

# 🐾 Sarva 

### A stateful AI companion that lives on your screen — built entirely on Sarvam's Indian-first models.

Talk to it. Speak to it. Hand it your bills. It remembers, reasons, and acts.

**[Live Demo →](https://sarva-ai-pet-assistant.vercel.app/)**

`sarvam-105b` · `saaras:v3` · `bulbul` · `Sarvam Document Intelligence`

</div>

---

## Table of Contents

- [What is Sarva?](#what-is-sarvam-pet)
- [Why it's different](#why-its-different)
- [Feature tour](#feature-tour)
- [Which Sarvam models, and why](#which-sarvam-models-and-why)
- [Architecture](#architecture)
- [The agentic chat loop](#the-agentic-chat-loop)
- [Tool catalog](#tool-catalog)
- [Data model](#data-model)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Google OAuth setup](#google-oauth-setup)
- [API reference](#api-reference)
- [Deployment](#deployment)
- [Security notes](#security-notes)
- [Roadmap](#roadmap)

---

## What is Sarva?

Most AI assistants are stateless. You ask, they answer, the context evaporates. **Sarva** is built around the opposite idea: a small, warm companion that *persists* — it remembers your conversations, holds a name and a mood across sessions, and actually does things for you.

Under the cute 3D exterior it's a fully **agentic assistant**. Sarvam-105B drives a tool-using loop that can save notes, track bills and auto-create reminders, read documents you upload, and answer questions about them — in text **or** voice, across English and Indic languages.

It's for anyone who wants an AI that feels less like a search box and more like a tiny teammate.

---

## Why it's different

| Typical chatbot | Sarva |
|---|---|
| Stateless — forgets every session | **Persistent memory** in Postgres; conversation, mood, and pet identity survive restarts |
| Text only | **Text + voice** with auto language detection (Saaras) and natural TTS (Bulbul) |
| Answers questions | **Takes actions** via an agentic tool loop (notes, bills, reminders, documents) |
| English-first | **Indic-first** — handles code-mixed Hindi/English and Indian financial context |
| Wraps one API call | **Multimodal pipeline** — LLM + STT + TTS + Document Intelligence working together |

---

## Feature tour

- 🐣 **3D animated pet** — a Three.js companion with multiple moods; eyes follow your gaze via on-device MediaPipe (no API call).
- 💬 **Conversational chat** — Sarvam-105B with a warm, concise pet persona and short-term memory of recent turns.
- 🎙️ **Voice in / voice out** — speak to the pet; it transcribes with Saaras, replies, and talks back with Bulbul. Hands-free live conversation mode is available while the camera is on.
- 🧾 **Bills & reminders** — mention a bill ("Airtel is ₹599, due the 20th") and it's saved, with a reminder auto-created one day before the due date.
- 📝 **Notes** — ask it to remember something and it persists a note you can browse in a side panel.
- 📄 **Document intelligence** — upload a PDF or photo of a bill/letter; Sarvam Document Intelligence OCRs it, and the pet can summarize, explain in plain language, or answer specific questions about it.
- 👀 **Webcam presence** — the pet knows when you're watching and reacts.
- 🐱 **Personality & continuity** — rename your pet, watch its energy/mood, and pick the conversation back up where you left off.
- 🔐 **Per-user isolation** — Google sign-in; every note, bill, and message is scoped to your account.
- 🧹 **Fresh start** — clear your entire chat history from Settings whenever you want the pet to start clean.

---

## Which Sarvam models, and why

Every model choice is deliberate. The point isn't "we called an API" — it's that each model does something here that a generic English-only stack does poorly.

### `sarvam-105b` — the brain (chat + reasoning + tool use)
The flagship 105B model runs the agentic loop. It decides *which tool to call* from natural language, understands Indian financial vocabulary (₹, EMI, due dates), and handles code-switched Hindi/English without losing the thread. It's also the model behind `query_document` and `explain_document`.

> ⚙️ Sarvam-105B spends hidden reasoning tokens before replying, so `max_tokens` is set generously (3000) to avoid truncated answers — see [`lib/sarvam.ts`](lib/sarvam.ts).

### `saaras:v3` — speech-to-text
Saaras transcribes voice input with **automatic language detection** (`language_code: "unknown"`), so a user can speak Hindi, English, or a mix and it just works. Low latency keeps the voice loop feeling alive.

### `bulbul` — text-to-speech
Bulbul turns the pet's replies into natural-sounding speech. Both `bulbul:v3` and `bulbul:v2` are supported with version-aware config (speaker, pace, temperature vs. pitch/loudness) in [`lib/sarvam.ts`](lib/sarvam.ts). This is what gives the pet a *voice* instead of a robotic readout.

### Sarvam Document Intelligence — OCR
Real document reading is handled by Sarvam's **Document Digitization API**, not chat-with-image. It's an async job: create → upload PDF → start → poll → download a ZIP of clean markdown, which we unzip in memory with `fflate`. It reads Indic scripts natively — try that with most closed OCR stacks. Photos are converted to PDF first (see [`lib/pdf.ts`](lib/pdf.ts)).

> The chat-based `describeImage` helper exists only as a legacy shim for the webcam route — Sarvam chat completions do not accept image content, so **`ocrDocument` is the real path** for reading documents.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Next.js App (React 19)                    │
│  Pet stage · Chat dock · Voice toggle · Webcam · Panels       │
│  Zustand store (pet name / mood / energy / speech bubble)     │
└───────────────┬──────────────────────────────────────────────┘
                │  fetch()
                ▼
┌──────────────────────────────────────────────────────────────┐
│              Next.js Route Handlers (server-only)             │
│                                                               │
│  /api/chat          POST  → agentic loop (105B + tools)       │
│                     GET   → load history   DELETE → clear     │
│  /api/pet           GET / PATCH → pet identity & mood         │
│  /api/notes         CRUD notes                                │
│  /api/bills         CRUD bills                                │
│  /api/reminders     CRUD reminders                            │
│  /api/docs          upload + OCR + store documents            │
│  /api/sarvam/stt    Saaras transcription                      │
│  /api/sarvam/tts    Bulbul synthesis                          │
│  /api/sarvam/vision webcam describe (legacy)                  │
│  /api/auth/[...]    Auth.js (Google)                          │
└───────┬───────────────────────────────────┬──────────────────┘
        │                                    │
        ▼                                    ▼
┌────────────────────┐            ┌──────────────────────────┐
│   Sarvam AI SDK    │            │   Prisma → Neon Postgres │
│  (server, keyed)   │            │  Users, Sessions, Pet,   │
│  105B · Saaras ·   │            │  Messages, Notes, Bills, │
│  Bulbul · Doc Intel│            │  Reminders, Documents    │
└────────────────────┘            └──────────────────────────┘
```

**Key principle:** the `SARVAM_API_KEY` is only ever read inside server route handlers via [`lib/sarvam.ts`](lib/sarvam.ts). It never reaches the browser.

---

## The agentic chat loop

The heart of the app lives in [`app/api/chat/route.ts`](app/api/chat/route.ts). A single user message flows through:

1. **Persist the user message** immediately (so nothing is lost if generation fails).
2. **Load recent history** — the last 16 messages, in chronological order, to keep context tight and within token budget.
3. **Build the prompt** — a personality system prompt (with the pet's current name) + history.
4. **Call Sarvam-105B with tools.** If the model returns `tool_calls`, each tool is executed server-side against Neon, results are appended, and the model is called again — up to **5 iterations**.
5. **Persist the assistant's final reply** and return it (plus which tools were used).

```ts
for (let step = 0; step < MAX_TOOL_STEPS; step++) {
  const { message } = await chatCompletion({ messages, tools: toolDefs });

  if (message.tool_calls?.length) {
    messages.push({ role: "assistant", content: message.content ?? "", tool_calls: message.tool_calls });
    for (const call of message.tool_calls) {
      const args = JSON.parse(call.function.arguments || "{}");
      const result = await runTool(userId, call.function.name, args);
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
    continue; // re-ask the model with tool results
  }

  finalText = (message.content ?? "").trim();
  break;
}
```

This is what turns a chatbot into an assistant: the model *reasons about intent*, picks a tool, sees the result, and decides what to say.

---

## Tool catalog

Defined and executed in [`lib/tools.ts`](lib/tools.ts). Schemas are sent to the model; executors run against Prisma/Neon, always scoped to the signed-in `userId`.

| Tool | What it does |
|---|---|
| `create_note` | Save a note (title optional, body required). |
| `list_notes` | Return the 10 most recent notes. |
| `save_bill` | Save a bill (vendor, amount, currency, due date). **Auto-creates a reminder 1 day before the due date.** |
| `list_due_dates` | List upcoming **unpaid** bills, soonest first. |
| `create_reminder` | Create a reminder with optional ISO `due_at`. |
| `list_reminders` | List active (not-done) reminders. |
| `delete_reminder` | Delete by `reminder_id`, or fuzzy-match by `text` (asks for clarification if multiple match). |
| `list_documents` | List uploaded documents/bills with summaries and IDs. |
| `query_document` | Answer a specific question grounded **only** in a document's text (105B, low temperature). |
| `explain_document` | Explain a document in plain, friendly language: what it is, key details, what to do next. |

---

## Data model

Postgres via Prisma — see [`prisma/schema.prisma`](prisma/schema.prisma). All app data cascades from `User`.

```
User ─┬─ PetState      (name, mood, energy, lastSeen)   1:1
      ├─ ChatMessage   (role, content, createdAt)        1:N   @@index([userId, createdAt])
      ├─ Note                                            1:N
      ├─ Document ──┐  (filename, parsedText, summary…)  1:N
      ├─ Bill ◄─────┘  (vendor, amount, dueDate, status) 1:N   @@index([userId, dueDate])
      └─ Reminder      (text, dueAt, done, relatedBill)  1:N   @@index([userId, dueAt])

Auth.js: Account, Session, VerificationToken
```

Design notes:
- **`role` is a string**, not an enum — leaves room for `system`/`tool` turns and future kinds.
- **Composite indexes** on `(userId, time)` — every query is user-scoped then time-ordered.
- **`onDelete: Cascade`** everywhere — deleting a user cleans up all their data.
- **Bills ↔ Reminders** are linked so a bill's auto-reminder can reference it (`relatedBillId`, `onDelete: SetNull`).

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, route handlers) |
| UI | **React 19**, **Tailwind CSS v4**, **Framer Motion**, **Three.js** (3D pet) |
| State | **Zustand** |
| AI | **`sarvamai` SDK** — 105B, Saaras, Bulbul, Document Intelligence |
| DB | **Prisma 6** → **Neon** (serverless Postgres) |
| Auth | **Auth.js (NextAuth v5)** with Google + Prisma adapter, database sessions |
| Sensors | **MediaPipe** FaceLandmarker (on-device gaze tracking — not an API call) |
| Misc | `fflate` (in-memory unzip of OCR output) |

---

## Project structure

```
.
├── app/
│   ├── api/
│   │   ├── chat/route.ts        # agentic loop (GET/POST/DELETE)
│   │   ├── pet/route.ts         # pet identity & mood
│   │   ├── notes/route.ts
│   │   ├── bills/route.ts
│   │   ├── reminders/route.ts
│   │   ├── docs/route.ts        # upload + OCR + persist
│   │   ├── sarvam/{stt,tts,vision}/route.ts
│   │   └── auth/[...nextauth]/route.ts
│   ├── layout.tsx
│   └── page.tsx                 # Landing (signed-out) / Dashboard (signed-in)
├── components/
│   ├── Pet/        (PetStage, ThreeCat)
│   ├── Chat/       (ChatThread, ChatDock)
│   ├── Voice/      (VoiceToggle, MicButton, LiveConversation)
│   ├── Webcam/     (WebcamPet, CameraButton)
│   ├── panels/     (Notes, Docs, Reminders, PanelNav, SlideOver)
│   ├── auth/       (SignIn, UserMenu)
│   └── Dashboard.tsx, Landing.tsx, SettingsModal.tsx
├── lib/
│   ├── sarvam.ts   # single source of truth for all Sarvam calls
│   ├── tools.ts    # tool schemas + executors
│   ├── db.ts       # Prisma client singleton
│   ├── user.ts     # getCurrentUserId / lazy PetState creation
│   ├── pdf.ts      # photo → PDF for OCR
│   └── voice.ts, wav.ts
├── prisma/schema.prisma
├── store/usePet.ts
├── auth.ts
└── .env.example
```

---

## Getting started

### Prerequisites
- **Node.js 18+**
- A **Neon** (or any Postgres) database URL
- A **Sarvam API key** — [dashboard.sarvam.ai](https://dashboard.sarvam.ai)
- **Google OAuth** credentials (for sign-in)

### Setup

```bash
# 1. Clone and install
git clone <your-repo-url>
cd "Sarvam Ai"
npm install

# 2. Configure environment
cp .env.example .env.local
#    then fill in the values (see below)
#    Prisma's CLI also reads DATABASE_URL from .env

# 3. Push the schema to your database
npm run db:push

# 4. Run the dev server
npm run dev
```

Open <http://localhost:3000>. Sign in with Google, and your pet is born on first login.

Scripts:

```bash
npm run dev        # start dev server
npm run build      # production build
npm run start      # run the production build
npm run lint       # lint
npm run db:push    # sync Prisma schema → database
npm run db:studio  # open Prisma Studio
```

---

## Environment variables

Copy `.env.example` → `.env.local` and fill in. **Never commit `.env.local`.** Prisma's CLI reads `DATABASE_URL` from `.env`, so keep it in both (or in `.env`).

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon/Postgres connection string (`?sslmode=require`). |
| `SARVAM_API_KEY` | ✅ | Sarvam API subscription key. |
| `SARVAM_CHAT_MODEL` | – | Defaults to `sarvam-105b`. |
| `SARVAM_STT_MODEL` | – | Defaults to `saaras:v3`. |
| `SARVAM_TTS_MODEL` | – | Defaults to `bulbul:v3` (`.env.example` uses `bulbul:v2`). |
| `SARVAM_TTS_SPEAKER` | – | Voice, e.g. `anushka` / `shubh`. |
| `SARVAM_TTS_LANGUAGE` | – | e.g. `en-IN`. |
| `SARVAM_OCR_LANGUAGE` | – | OCR language, defaults `en-IN`. |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 32`. |
| `AUTH_GOOGLE_ID` | ✅ | Google OAuth client ID (Web). |
| `AUTH_GOOGLE_SECRET` | ✅ | Google OAuth client secret. |
| `AUTH_URL` | ✅ | Base URL — `http://localhost:3000` locally, your domain in prod. |

> Auth.js v5 uses `AUTH_*` names (not `NEXTAUTH_*`). On Vercel, set `AUTH_URL` to your deployment URL.

---

## Google OAuth setup

In [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials → OAuth 2.0 Client (Web):**

**Authorized JavaScript origins**
```
http://localhost:3000
https://your-domain.vercel.app
```

**Authorized redirect URIs**
```
http://localhost:3000/api/auth/callback/google
https://your-domain.vercel.app/api/auth/callback/google
```

Then set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `AUTH_URL` accordingly.

---

## API reference

All routes require an authenticated session and return `401` otherwise. Data is always scoped to the signed-in user.

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/chat` | Send a message; runs the agentic loop. Returns `{ reply, toolsUsed }`. |
| `GET` | `/api/chat` | Load the last 40 user/assistant messages. |
| `DELETE` | `/api/chat` | Clear all chat messages for the user. Returns `{ deletedCount }`. |
| `GET` / `PATCH` | `/api/pet` | Read or update pet name/mood/energy. |
| `*` | `/api/notes` | Manage notes. |
| `*` | `/api/bills` | Manage bills. |
| `*` | `/api/reminders` | Manage reminders. |
| `POST` | `/api/docs` | Upload a document → OCR → persist. |
| `POST` | `/api/sarvam/stt` | Transcribe audio (Saaras). |
| `POST` | `/api/sarvam/tts` | Synthesize speech (Bulbul). |

If `SARVAM_API_KEY` is missing, `/api/chat` degrades gracefully with a friendly "I can't think yet" message rather than erroring.

---

## Deployment

Deployed on **Vercel** + **Neon**.

1. Push to GitHub, import the repo in Vercel.
2. Add every variable from [Environment variables](#environment-variables) to Vercel project settings.
3. Set `AUTH_URL` to your Vercel URL and add that URL to Google OAuth origins/redirects.
4. Ensure your Neon `DATABASE_URL` is reachable; run `prisma db push` (locally against the prod DB, or as a build step).

---

## Security notes

- 🔑 **API key is server-only** — read exclusively inside route handlers via [`lib/sarvam.ts`](lib/sarvam.ts).
- 👤 **Per-user isolation** — every query filters on `session.user.id`; routes `401` when unauthenticated (see [`lib/user.ts`](lib/user.ts)).
- 🗑️ **Cascade deletes** — removing a user removes all their data.
- 🧾 **Grounded document answers** — `query_document` is instructed to use only the document text and to admit when an answer isn't present.

---

## Roadmap

- **Gmail tools** — `read_emails` / `draft_email` are stubbed in [`lib/tools.ts`](lib/tools.ts); full integration needs Gmail OAuth scopes + access token from Auth.js.
- **Scheduled reminders** — cron + push notifications for due-date reminders.
- **Sentiment-driven mood** — adapt the pet's mood from conversation tone over time.
- **Long-term semantic memory** — embeddings beyond the recent-message window.
- **Multi-pet / household sharing** with per-member memory.

---

<div align="center">

**Built with `sarvam-105b`, `saaras:v3`, `bulbul`, and Sarvam Document Intelligence.**

Next.js · Prisma · Neon · Auth.js · Three.js

*If you're building voice agents, document pipelines, or Indic-first assistants — this stack is a great place to start.*

</div>
