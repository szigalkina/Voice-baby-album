# Voice Baby Album — Roadmap & Operating Manual

> **Audience:** any developer or AI agent picking up this project. Follow the steps
> LITERALLY and IN ORDER within each action. Do not improvise, do not refactor
> unrelated code, do not skip verification steps. When an action says "STOP", stop
> and ask the owner (Svetlana).

## Ground rules (read first, apply always)

1. Work on branch `main` or a feature branch merged back to `main`. Every commit
   message ends with the `Co-Authored-By` line used in `git log`.
2. **NEVER run `npm run build` while `npm run dev` is running.** They share `.next`
   and the dev server breaks. Kill dev first (`pkill -f "next dev"`), build, restart.
3. After ANY code change run: `npx tsc --noEmit && npm test`. Both must pass before
   commit. If a UI screen changed, also open it in a 375px-wide browser and look.
4. All AI calls go through `lib/ai.ts` only. All storage through `lib/storage.ts`
   only. All DB access through `getDb()` from `lib/db.ts` only. Never import
   providers (Gemini/Blob/Neon/PGlite) anywhere else.
5. The app must ALWAYS keep working with zero env vars (PGlite + disk + mock AI).
   Every new external service needs a local fallback behind an env-var check.
6. Schema changes: edit `lib/schema.ts` AND add matching idempotent SQL
   (`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) to
   the `DDL` string in `lib/db.ts`. Both places, always.
7. UI rules: palette + fonts are defined in `app/globals.css` `@theme` (milk/ink/
   apricot/sage + Fraunces/Outfit/Caveat). Never introduce new colors or fonts.
   Book pages use the handwritten font (`font-hand`). Keep the one-rule book
   layout: one entry = one page.

## Current state (2026-07-19)

Done and verified: recording → AI entry pipeline (Gemini/mock), photo uploads,
password accounts (scrypt), partner invite codes → shared album, photo-book album
(one page per entry, handwritten style, swipe), per-page editing (title, message,
add/remove photos), journal list, PWA manifest. Tests: 17 passing. Not deployed.

---

## ACTION 1 — Deploy to production (blocked on owner login)

Prereq: owner has run `npx vercel login` in the project directory. If not: STOP.

1. `cd` to the project root. Run `npx vercel link --yes` (creates the project).
2. Run `npx vercel deploy` → preview URL. Open it; sign-up page must render.
3. Provision database: `npx vercel integration add neon` (accept defaults; if the
   CLI flow requires the dashboard, do it at vercel.com → Storage → Neon, then
   `npx vercel env pull .env.local` and confirm `DATABASE_URL` appears).
4. Provision blob store: vercel.com → Storage → Blob → Create. Confirm
   `BLOB_READ_WRITE_TOKEN` exists in project env vars.
5. Set remaining env vars (Production scope):
   - `AUTH_SECRET` = output of `openssl rand -hex 32`
   - `APP_URL` = the production URL (e.g. `https://voice-baby-album.vercel.app`)
   - `GEMINI_API_KEY` = owner creates at aistudio.google.com → API keys (free)
6. `npx vercel deploy --prod`.
7. Verify on the production URL, in order: create account → onboarding → record a
   note (real phone!) → entry appears with real AI title → add photo → album book
   shows the page → second account joins via invite code and sees the album.
8. If recording fails on iPhone Safari: check the served page is HTTPS and
   `audio/mp4` is picked (see `pickMime` in `components/Recorder.tsx`).

## ACTION 2 — Password reset by email

Files to create: `app/api/auth/reset-request/route.ts`,
`app/api/auth/reset/route.ts`, `app/reset/page.tsx`.

1. Add table to `lib/schema.ts` AND `lib/db.ts` DDL:
   `reset_tokens (token text primary key, user_id uuid not null references users(id), expires_at timestamp not null)`.
2. `reset-request` POST `{email}`: always respond `{ok:true}` (do not reveal
   whether the email exists). If the user exists: insert token
   (`crypto.randomBytes(32).toString("hex")`, 30 min expiry) and send email via
   Resend (`RESEND_API_KEY`, same fetch pattern that existed in git history —
   see commit `2341b38` for the exact Resend call). Without the env var, return
   `{ok:true, devLink}` exactly like the old magic-link route did.
3. `reset` POST `{token, password}`: validate token not expired, password ≥ 8
   chars, update `users.password_hash` using `hashPassword` from
   `lib/password.ts`, delete token, create session.
4. `app/reset/page.tsx`: form with new password field, reads `?token=` from URL.
   Add "Forgot password?" link on `app/signin/page.tsx` below the form.
5. Tests: reuse `lib/password.test.ts` style; test expired token → 400.

## ACTION 3 — Delete stored files when photos/entries are deleted

Currently deleting a photo/entry leaves the file in storage. Fix:

1. In `lib/storage.ts` add `deleteFile(url: string)`: if url starts with
   `/api/files/`, `fs.unlink` the mapped path under `.data/uploads` (ignore
   errors); else if `BLOB_READ_WRITE_TOKEN` set, `const { del } = await import("@vercel/blob"); await del(url)`.
2. Call it: in `app/api/entries/[id]/photos/[photoId]/route.ts` after DB delete
   (pass `deleted[0].blobUrl`); in `app/api/entries/[id]/route.ts` DELETE — first
   select the entry's photos and audioUrl, delete DB row, then delete each file.
3. Test manually: add + remove a photo locally, confirm the file disappears from
   `.data/uploads/photos/`.

## ACTION 4 — Print-ready PDF export ("Export for print")

Goal: a downloadable PDF of the album at 21×21 cm, 300 DPI, 3 mm bleed — the user
uploads it to Albelli/any print service themselves. No print API integration.

1. `npm install @react-pdf/renderer` (server-side render works on Vercel functions).
2. Create `lib/pdf.tsx`: a React-PDF document that maps `buildBookPages(...)`
   output to fixed pages: page size `[612, 612]`pt equivalent for 21.6×21.6 cm
   incl. bleed (21 cm + 3 mm bleed each side; 1 cm = 28.3465 pt → use 612.3 pt).
   Reuse the exact layout rules from `components/BookPage.tsx`: photo-less page =
   centered text + date; otherwise title/message top, photo grid (1 large / 2x2
   squares), date bottom. Register the Caveat font via `Font.register` (download
   TTF once into `public/fonts/Caveat.ttf` from Google Fonts).
3. Create `app/api/export/route.ts` GET: `requireBaby()`, fetch album entries
   (ready + inAlbum, ascending), render with `renderToBuffer`, respond with
   `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="<baby>-album.pdf"`.
   For photos: load bytes server-side (same dual disk/URL loader as
   `app/api/entries/[id]/retry/route.ts` → `loadAudio`, generalize it).
4. Add an "⬇ Export for print" button in the Album header (book view only).
5. Verify: export locally with demo data, open PDF, check page size and fonts.

## ACTION 5 — Native apps (owner decision: currently PWA-first)

The web app is already installable (manifest + icons). True app-store presence:

**Option A — Capacitor wrapper (recommended, ~1–2 days):**
1. `npm install @capacitor/core @capacitor/cli && npx cap init "Voice Baby Album" com.voicebabyalbum.app`
2. Configure `capacitor.config.ts` with `server: { url: "https://<prod-url>" }`
   (thin shell over the deployed site — no static export needed).
3. `npx cap add ios && npx cap add android`, open in Xcode/Android Studio, set
   icons/splash from `public/icon-512.png`, add microphone + photo permissions to
   Info.plist / AndroidManifest.
4. Costs: Apple Developer $99/year, Google Play $25 one-time. Needs a Mac with
   Xcode for iOS builds (this machine qualifies).
5. STOP before store submission — owner reviews listing copy and screenshots.

**Option B — stay PWA:** $0, installable from browser, already done. Reminder
push notifications on iOS PWAs work since iOS 16.4 via Web Push (see ACTION 6).

**Do NOT rewrite in React Native/Expo.** Not justified; the whole product is one
mobile web UI.

## ACTION 6 — Gentle reminders (Web Push)

1. `npm install web-push`. Generate VAPID keys once
   (`npx web-push generate-vapid-keys`) → env vars `VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY` (+ expose public one to the client).
2. Add `push_subscriptions (user_id uuid, subscription jsonb)` table (schema +
   DDL, rule 6).
3. Add a minimal service worker `public/sw.js` with a `push` event listener
   showing the notification; register it in `app/layout.tsx` client-side.
4. Settings UI: a bell toggle in the journal header → `Notification.requestPermission()`
   → `registration.pushManager.subscribe` → POST subscription to a new
   `app/api/push/subscribe/route.ts`.
5. Sending: Vercel Cron (`vercel.json` → `{"crons":[{"path":"/api/push/nudge","schedule":"0 18 * * *"}]}`)
   → route picks users with no entry in 3+ days → web-push a warm nudge
   ("What did ⟨name⟩ do today? 🎙"). Cap: max 1 nudge per 3 days per user.

## ACTION 7 — Quality/security hardening (do opportunistically)

- Rate-limit `POST /api/auth/login` and `signup`: simplest is an in-memory map
  keyed by IP allowing 10 attempts/10 min (module-level, resets on deploy — fine),
  return 429 beyond it.
- `PATCH /api/entries/[id]`: also accept `recordedAt` (ISO date) so users can
  correct a memory's date; validate with `!isNaN(Date.parse(v))`.
- Photos per entry: server currently accepts unlimited; reject uploads when the
  entry already has 8 photos (book shows 4; journal shows all).
- Add `Suspense`-based loading states if any page starts feeling slow.

## Costs summary (for the owner)

| Item | Cost |
|---|---|
| Vercel Hobby (site + functions + cron) | $0 (fine for a family app) |
| Neon Postgres free tier | $0 (0.5 GB — thousands of entries) |
| Vercel Blob (audio + photos) | ~$0.02/GB-month stored; a full first year (≈500 photos ≈ 2 GB + audio ≈ 0.5 GB) ≈ **pennies/month** |
| Gemini Flash free tier | $0 (1,500 requests/day ≫ needed) |
| Resend free tier | $0 (3,000 emails/month) |
| Apple App Store (only if ACTION 5A) | $99/year |
| Google Play (only if ACTION 5A) | $25 once |

So: web app ≈ **$0/month** at family scale. App stores are the only real cost.
