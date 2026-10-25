# Fee Tracker — Private Tutoring Student Tracker (PWA)

An installable mobile-first web app for tracking tutoring students and their fee
dues. Free end to end: **Google Sheets** for storage, **Google Apps Script** as a
JSON API, and **Next.js** (hosted free on Vercel/Cloudflare) as the installable PWA.

```
Google Sheet  ──  Apps Script Web App (/exec, JSON)  ──  Next.js PWA
 (Students,          (token-protected API +                (this repo;
  Payments)           due calculation)                      also serves as the
                                                            "mobile app" via
                                                            Add to Home Screen)
```

The browser never sees the secret token: the PWA calls its own `/api/*` route
handlers, which call Apps Script server-side with the token.

**Access is gated by Google sign-in** (NextAuth) with an email allowlist — only the
accounts you list in `ALLOWED_EMAILS` can open the app. Middleware redirects everyone
else to `/signin`.

---

## 1. Backend — Google Apps Script

1. Open the Google Sheet → **Extensions → Apps Script**.
2. Paste the contents of [`apps-script/Code.gs`](apps-script/Code.gs) into the editor.
3. Set `API_TOKEN` near the top to a long random string. Generate one with:
   ```bash
   openssl rand -hex 24
   ```
4. Run the `setup` function once (select `setup` in the toolbar → **Run**). Grant the
   permissions it asks for. This creates the **Students** and **Payments** tabs with
   headers.
5. **Deploy → New deployment → Web app:**
   - **Execute as:** Me
   - **Who has access:** Anyone  *(security comes from the token, not this setting)*
6. Copy the `/exec` URL.

> **After any future edit to `Code.gs`:** Deploy → **Manage deployments** → edit the
> **existing** deployment → Version: **New version**. This keeps the same `/exec` URL
> so the app keeps working. Never create a *new* deployment for an edit — that gives a
> new URL and breaks the app.

### Already have a Sheet/dashboard?
This script creates its own `Students`/`Payments` tabs. If the existing sheet uses
different column names, either rename columns to match `STUDENT_HEADERS` /
`PAYMENT_HEADERS` in `Code.gs`, or adjust those arrays to match the sheet.

---

## 2. Auth — Google OAuth (one-time, free)

1. [Google Cloud Console](https://console.cloud.google.com) → create/pick a project
   (no billing needed).
2. **APIs & Services → OAuth consent screen:** User type **External**, fill the app
   name + support email, and under **Test users** add the tutor's and your Gmail.
   (Leaving it in "Testing" is fine for a private tool — no Google verification needed.)
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web
   application.** Add **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (local)
   - `https://<your-app>.vercel.app/api/auth/callback/google` (after you deploy)
4. Copy the **Client ID** and **Client secret** into the env vars below.

## 3. Frontend — local run

```bash
cp .env.local.example .env.local
# fill in: /exec URL, the SAME token as Code.gs, Google client id/secret,
# NEXTAUTH_SECRET (openssl rand -base64 32), NEXTAUTH_URL, ALLOWED_EMAILS
npm install
npm run dev
```

Open http://localhost:3000 → you'll be sent to `/signin` → Continue with Google.
Only emails in `ALLOWED_EMAILS` get in; anyone else sees an "not on the access list"
message.

Environment variables:

| Variable | Value |
|---|---|
| `APPS_SCRIPT_URL` | the `/exec` URL from step 1 |
| `APPS_SCRIPT_TOKEN` | must **exactly** match `API_TOKEN` in `Code.gs` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from the OAuth client (step 2) |
| `NEXTAUTH_SECRET` | random; `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` locally; the deployment URL on Vercel |

---

## 4. Deploy to Vercel (free)

1. Push this folder to a GitHub repo.
2. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo
   (auto-detects Next.js).
3. **Settings → Environment Variables:** add all the vars above. Set `NEXTAUTH_URL` to
   the real deployment URL (e.g. `https://fee-tracker.vercel.app`).
4. Back in Google Cloud, add the deployment's
   `https://<name>.vercel.app/api/auth/callback/google` to the OAuth redirect URIs.
5. Deploy. Every `git push` to the main branch auto-redeploys — the whole update flow.

Cloudflare Pages works the same way if you prefer it over Vercel's Hobby terms.

---

## 5. Install on a phone (the "mobile app")

Open the deployed HTTPS URL on the phone → browser menu → **Add to Home Screen**.
It launches full-screen with its own icon, no browser chrome. Updates are instant:
push to GitHub, and the next time the icon is opened it has the new version. No app
store, no review, no fee.

---

## How the due amount is calculated

Derived, never stored:

```
due = monthsBilled × monthlyFee − totalPaid
```

`monthsBilled` counts calendar months from `startDate` to today. By default the
current (in-progress) month is counted as owed (`MONTH_ROUNDING = 'up'` in `Code.gs`;
set to `'down'` to bill only fully-elapsed months). A negative `due` means the student
has paid in advance.

> Confirm with the tutor: same fee for everyone or per student, and the partial-month
> rule. Per-student fee is already supported (each student has their own `monthlyFee`).

---

## Data model

**Students:** `id, name, roll, class, guardianPhone, monthlyFee, startDate, createdAt`
**Payments:** `id, studentId, amount, paidOn, method, note`

IDs are UUIDs generated by Apps Script (Sheets has no auto-increment).

---

## Security notes (read this)

- **Two layers:** (1) Google sign-in gates who can open the app (NextAuth, enforced by
  `proxy.ts`); (2) a server-side **shared secret token** protects the Apps Script
  backend, and is never exposed to the browser.
- Access is limited to the test users listed on the OAuth consent screen (while it stays
  in **Testing** mode). To let more people in, add their Gmail as a test user — no code
  change.
- The OAuth consent screen can stay in **Testing** mode (listed test users only); no
  Google verification process is required for a private tool.
- **Dependencies:** on Next.js 16 + React 19, `next-auth` 4.24.15, with `npm audit`
  reporting **0 vulnerabilities**. (The request gate lives in `proxy.ts` — Next 16's
  renamed `middleware` convention.)

---

## Project layout

```
apps-script/Code.gs        Google Apps Script backend (paste into Apps Script editor)
proxy.ts                   Gates all routes behind Google sign-in
app/                       Next.js App Router pages + API route handlers
  page.tsx                 Dashboard (students by highest due)
  signin/                  Google sign-in page (+ access-denied message)
  students/                List (search/filter), new, [id] detail, [id]/edit
  api/students, api/payments   Token-protected proxy to Apps Script
  api/auth/[...nextauth]   NextAuth route handler
  providers.tsx            SessionProvider wrapper
components/                StudentForm, PaymentForm, UserMenu, PWARegister, ListSkeleton
lib/                       auth (NextAuth config), appsScript (server-only fetch), types, format
public/                    manifest.json, sw.js, icons
```
