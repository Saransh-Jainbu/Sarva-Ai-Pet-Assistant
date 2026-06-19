# Sarvam Pet 🐣

A cute **3D virtual pet** that's also your personal AI assistant — powered **exclusively by Sarvam AI** models. Chat or speak to Sarva, let it watch you through your webcam, upload photos of bills and it extracts due dates and reminds you.

## Powered by Sarvam
| Capability | Model | Used for |
|---|---|---|
| **Brain** | Sarvam-105B (reasoning + tools) | Chat, notes, bills, reminders |
| **Voice out** | Bulbul TTS | Sarva speaks aloud |
| **Voice in** | Saaras STT | Talk with the mic |
| **Document OCR** | Sarvam Vision | Extract text/vendor/amount from bill photos |

**Non-AI sensors:** Google MediaPipe (on-device gaze tracking for eye animation); webcam (presence detection).

## Stack
Next.js 16 · React 19 · Tailwind v4 · Prisma 6 → Neon Postgres · Zustand · Framer Motion · Three.js · MediaPipe.

## Setup
1. `npm install`
2. Create `.env` with your Neon URL:
   ```
   DATABASE_URL="postgresql://…neon…?sslmode=require"
   ```
3. Create `.env.local` (see `.env.example`) with your Sarvam key and Google sign-in:
   ```
   SARVAM_API_KEY="…"
   AUTH_SECRET="…"            # openssl rand -base64 32
   AUTH_GOOGLE_ID="…"         # Google Cloud OAuth client (Web)
   AUTH_GOOGLE_SECRET="…"
   AUTH_URL="http://localhost:3000"
   ```
   In Google Cloud Console → Credentials → OAuth client ID (Web), set the
   **authorized redirect URI** to `http://localhost:3000/api/auth/callback/google`.
4. `npx prisma db push` — sync the schema to Neon
5. `npm run dev` — open http://localhost:3000 and sign in with Google

## Accounts & privacy
Sign-in is **Google OAuth via Auth.js**, with **database-backed sessions** (one row per
login in the `Session` table). Every user's notes/docs/bills/reminders/chat are isolated to
their account — visitors only ever see their own data.

Handy: `npm run check:sarvam` (verify your key), `npm run db:studio` (browse data).

## Features (v1)
- 🐣 **3D animated pet** with 8 moods; eyes follow your gaze (on-device)
- 🧠 **Sarvam-105B brain** with tools: create/edit notes, save bills, set reminders (all persisted to Neon)
- 🎙️ **Voice in/out**: Talk to Sarva (Saaras STT), it responds aloud (Bulbul TTS); mute toggle
- 👀 **Webcam presence**: Pet knows when you're watching; snapshot button → "what do you see?" (Sarvam Vision)
- 📸 **Bill photos**: Upload a photo of a bill → Sarvam Vision OCR + Sarvam-105B extract vendor/amount/due-date → auto-reminder
- 📝 **Panels**: Notes, Docs & Bills, Reminders (slide-over or inline)
- 🔐 **Accounts**: Google OAuth via Auth.js, database-backed sessions; full per-user data isolation

## Next: real Gmail + scheduled reminders
- **Gmail**: `read_emails` / `draft_email` tools in `lib/tools.ts` are stubbed (return sample). Full integration needs Gmail OAuth scopes + access token from Auth.js.
- **Cron reminders**: Push notifications for due-date reminders at scheduled times.

## Architecture notes
- **All Sarvam SDK calls** live in `lib/sarvam.ts` and are imported into route handlers (`/api/sarvam/*` and `/api/docs`). The API key never reaches the browser.
- **Sarvam-105B** is a reasoning model — it needs generous `max_tokens` (default 3000) or responses truncate.
- **Environment**: `DATABASE_URL` in `.env` (Prisma CLI requirement); Sarvam/Google keys in `.env.local`.
- **Database**: Prisma 6 with Neon Postgres (serverless); session table + User/Note/Bill/Reminder/Doc models.
- **Pet gaze**: Google MediaPipe FaceLandmarker (on-device WASM, no API call) drives eye animation; Sarvam has no real-time gaze model, so we use this as a sensor (like the camera itself).
