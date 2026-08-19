# JobSwipe — Deployment Runbook

Everything needed to get from "runs on my PC" to "in testers' hands."
Work top to bottom; each phase depends on the one before.

---

## Phase 1 — Host the backend

Your app currently talks to your PC. Testers need an always-on server.

**Railway** (simplest) or **Render**. Both deploy straight from GitHub.

1. Push your repo (make sure `.env` is gitignored — it must never be committed).
2. Create a new project from the repo, root directory `BackEnd`.
3. Build command `npm install`, start command `npm start`.
4. Add environment variables from `.env.example` — **generate a NEW `JWT_SECRET`**;
   never reuse the development one. In PowerShell:
   `-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 64 | %{[char]$_})`
5. In MongoDB Atlas → Network Access, allow your host's IPs (or `0.0.0.0/0`
   if the host uses dynamic IPs — acceptable because your database still
   requires credentials).
6. Deploy, then check `https://your-app.up.railway.app/health` returns
   `{"ok":true}`.

Then in `FrontEnd/config.js` set:
```js
const MANUAL_API_URL = "https://your-app.up.railway.app";
```

## Phase 2 — Cloud file storage (do NOT skip)

Hosting platforms wipe local disk on every redeploy. Without this, every user
CV and avatar disappears the next time you deploy.

**Cloudflare R2** has a generous free tier and no egress fees.

1. Cloudflare dashboard → R2 → create a bucket (e.g. `jobswipe-files`).
2. Create an API token with Object Read & Write.
3. Set on your host: `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`,
   `S3_REGION=auto`, and `S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`
4. Enable public access on the bucket (files are served by URL to the app).
5. Redeploy. The startup log should read `☁️ File storage: S3 → jobswipe-files`.

Upload a CV and confirm the stored path is an `https://` URL, not a disk path.

## Phase 3 — Database migrations

Run once against the production database, from `BackEnd/`:

```bash
node scripts/syncIndexes.js    # builds the geo + per-job unique indexes
node scripts/backfillGeo.js    # gives existing listings coordinates
```

Do **not** run `seedJobs.js` against production — it creates fake businesses.

## Phase 4 — First build

```bash
npm install -g eas-cli
eas login                 # create a free Expo account first
cd FrontEnd
eas build:configure
eas build --profile preview --platform android
```

Install the resulting APK on a real phone. This is the first time your app runs
outside Expo Go — test everything, especially:

- login and session persistence
- location permission prompt (your custom text should appear)
- push notifications (they behave differently in standalone builds)
- CV upload and application flow
- account deletion

## Phase 5 — Developer accounts

Register both now; verification takes days and runs in parallel with your work.

- **Apple Developer Program** — $99/year, developer.apple.com
- **Google Play Console** — $25 once, play.google.com/console

On Google, note that a **personal** account created after Nov 2023 must run a
closed test with 12+ testers opted in continuously for 14 days before it can
apply for production access. Organization accounts skip this but need a D-U-N-S
number and 2–4 weeks of verification.

## Phase 6 — iOS via TestFlight

```bash
eas build --profile production --platform ios
eas submit --platform ios
```

Then in App Store Connect, add internal testers (up to 100, near-instant) or
external testers (needs a short Apple review). This is your fastest route to
real feedback.

## Phase 7 — Android closed test

```bash
eas build --profile production --platform android
eas submit --platform android
```

In Play Console, create a **closed testing** track and invite 15–20 people
(recruit more than 12 so dropouts don't reset your eligibility). The 14-day
clock only counts people who actually opt in — an invited email that never
clicks counts for nothing.

## Phase 8 — Store listings

Prepare for both stores:

- **Screenshots** — the swipe deck, applications tracker, a match, business
  applicants view. Required sizes differ per store; EAS docs list them.
- **Description** and short tagline
- **Privacy policy URL** — host `PRIVACY_POLICY.md` publicly (GitHub Pages is free)
- **Age rating** questionnaire
- **Data safety / privacy nutrition labels** — declare: location, contact info,
  user content (CVs), messages
- **Demo accounts in the review notes** — one job seeker and one business, with
  passwords, plus a note that businesses and seekers see different screens.
  Reviewers reject apps they cannot fully log into.

---

## Pre-launch checklist

- [ ] `.env` is gitignored and production secrets differ from development ones
- [ ] `MANUAL_API_URL` points at the hosted backend
- [ ] `DEV_FORCE_LOGIN` is `false` in `config.js`
- [ ] File storage is on R2/S3, verified by an upload
- [ ] Migrations run against production
- [ ] Real app icon and splash replace the placeholder artwork
- [ ] Account deletion works end to end
- [ ] Privacy policy is live at a public URL
- [ ] Seed/test accounts removed from the production database
- [ ] Push notifications tested in a standalone build, not Expo Go
