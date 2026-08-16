# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page static site ("My Projects") for showcasing a portfolio of project links, each rendered as a card with a live iframe preview. No build step, no package manager, no framework — plain HTML/CSS/JS served as static files.

## Running locally

There is no dev server or build command. Open `index.html` directly in a browser, or serve the directory with any static file server, e.g.:

```
npx serve .
```

Deployment is via Vercel (see `.vercel/project.json`); pushing/deploying is handled through the Vercel CLI or dashboard, not from scripts in this repo.

## Architecture

- `index.html` — page shell: header (title + machine UUID display), the "Add New Project" form, and an empty `#projectsContainer` that JS populates.
- `app.js` — all logic, in one file:
  - `generateUUID()` / `displayUUID()`: generates a per-browser UUID on first load and persists it in `localStorage` under `machineUUID`, purely for display in the header. It is not sent anywhere.
  - `projects` array: the entire data model, loaded from and saved to `localStorage` under the `projects` key (`saveProjects()`). There is no backend/API — all state lives in the browser.
  - `renderProjects()`: re-renders `#projectsContainer` from the `projects` array on every add/delete. Each card embeds the target URL in a sandboxed `<iframe>` (`allow-scripts allow-same-origin`) as a live preview, plus a link and a delete button.
  - Form submit handler pushes `{ name, url }` onto `projects`, saves, and re-renders.
- `styles.css` — single stylesheet, card/grid layout, no preprocessor or CSS framework.

Because all persistence is `localStorage`, data is per-browser/per-device and never synced — keep this in mind when changing the data model (e.g. adding fields requires no migration logic since there's no schema versioning, but existing users' `localStorage` won't have new fields until they add/edit a project).

## Notes

- `.env.local` exists but is gitignored; check it if a task requires environment-specific values, but do not commit it.
- No tests, linter, or type checker are configured in this repo.
