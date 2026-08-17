# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page site ("My Projects") for showcasing a portfolio of project links, each rendered as a card with a live iframe preview. The frontend is still plain HTML/CSS/JS with no bundler, but the site now has a small backend: Vercel Serverless Functions under `api/` backed by Postgres (via Vercel's Neon integration), plus Google Sign-In restricted to a single admin.

## Running locally

`/api` functions need Vercel's local emulation layer to run, so a plain static server (`npx serve .`) is no longer enough. Use:

```
npm install
npx vercel dev
```

`vercel dev` pulls env vars from the linked Vercel project (`.vercel/project.json`) — run `npx vercel env pull .env.development.local` if they're out of sync.

Deployment is via Vercel (see `.vercel/project.json`); pushing/deploying is handled through the Vercel CLI or dashboard, not from scripts in this repo.

## Architecture

- `index.html` — page shell: header (title, machine UUID display, Google Sign-In button / signed-in-as / sign-out), the "Add New Project" form (`#addCard`, hidden unless the visitor is the authenticated admin), and an empty `#projectsContainer` that JS populates.
- `app.js` — frontend logic:
  - `generateUUID()` / `displayUUID()`: per-browser UUID in `localStorage` under `machineUUID`, purely cosmetic, not sent anywhere.
  - `loadProjects()` / `renderProjects()`: fetches the project list from `GET /api/projects` (public) and renders cards via `createElement`/`textContent` (not `innerHTML`, to avoid stored-XSS from project name/url); iframe `src` and link `href` are only set when the URL passes `isSafeUrl()` (`http(s)://` only).
  - `initGoogleSignIn()` / `handleGoogleCredential()`: renders the Google Identity Services button and POSTs the resulting ID token to `/api/auth/login`.
  - `refreshSession()`: calls `GET /api/auth/me` to decide whether to show the admin UI (add form, delete buttons, sign-out). This is UX only — the real authorization check happens server-side on every write.
  - Add/delete handlers call `POST /api/projects` and `DELETE /api/projects?id=`.
  - `GOOGLE_CLIENT_ID` constant at the top of the file — a public identifier (not a secret), must match the `GOOGLE_CLIENT_ID` env var used server-side.
- `styles.css` — single stylesheet, glass/blur card-and-grid layout, no preprocessor or framework.
- `api/projects.js` — `GET` (public), `POST`/`DELETE` (admin-only via `requireAdmin`, see `lib/auth.js`). Talks to Postgres through `lib/db.js`.
- `api/auth/login.js` — verifies a Google ID token server-side (`google-auth-library`), checks `email_verified` and that the email matches `ADMIN_EMAIL`, and if so sets a signed session cookie.
- `api/auth/logout.js` — clears the session cookie.
- `api/auth/me.js` — reports whether the current request has a valid admin session.
- `lib/auth.js` — Google token verification, session JWT sign/verify (`jsonwebtoken`, secret from `SESSION_SECRET`), `requireAdmin(req, res)` guard used by every write endpoint.
- `lib/db.js` — Neon Postgres client (`@neondatabase/serverless`) and idempotent `CREATE TABLE IF NOT EXISTS projects (...)` schema bootstrap (no manual migration step).

### Auth model

- Reading the project list is public; no login required to view the site.
- Writing (add/delete) requires a session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`) minted only after server-side verification of a Google ID token whose email exactly matches `ADMIN_EMAIL` (`pedro.mf.santos@outlook.pt`). Only one admin is supported by design — there's no user table or role system.
- The Google Cloud OAuth consent screen is kept in **Testing** mode with only the admin listed as a test user, as a second independent gate on top of the app's own email check.
- Google Sign-In only works from Authorized JavaScript Origins registered in Google Cloud Console (the production domain + `localhost` for `vercel dev`) — it will not work on Vercel preview-deployment URLs, by design/accepted limitation.

### Environment variables (set via `vercel env`, pulled into `.env.local`/`.env.development.local`)

- `DATABASE_URL` (and related `PG*`/`POSTGRES_*` vars) — injected automatically by the Neon integration.
- `GOOGLE_CLIENT_ID` — Google OAuth Web Client ID; also hardcoded client-side in `app.js` (not a secret).
- `SESSION_SECRET` — random secret used to sign session JWTs.
- `ADMIN_EMAIL` — the single authorized admin email.

## Notes

- `.env.local` / `.env.development.local` exist but are gitignored; check them if a task requires environment-specific values, but do not commit them.
- No tests, linter, or type checker are configured in this repo.
