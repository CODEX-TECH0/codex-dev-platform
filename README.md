# CODEX TECH Developer Platform

A runnable, local-first developer platform demo built with React, TypeScript, and Vite. It provides a responsive dashboard, protected demo session, onboarding, project and deployment workflows, tasks, API-key lifecycle controls, notifications, documentation, analytics, theme persistence, and a Ctrl/Cmd+K command palette.

## Run

```bash
npm install
npm run dev
```

Open the printed local URL. Sign in with any valid email and a password containing at least 8 characters, one capital letter, and one number. Registration leads to onboarding. State is persisted in browser local storage; no password is retained.

## Checks

```bash
npm run test
npm run build
```

## Production

Run `npm run build` and deploy the generated `dist/` directory to any static host. Configure SPA fallback to `index.html`. Copy `.env.example` to `.env` for optional branding configuration.

## Architecture

- `src/main.tsx` app shell and feature screens
- `src/data.ts` realistic demo seed data
- `src/types.ts` shared data contracts
- `src/validation.ts` form validation helpers
- `src/style.css` responsive theme system and accessible UI primitives

This demo deliberately does not persist passwords or full API-key material. A production deployment should replace the demo session adapter with an HTTP-only-cookie identity provider and store only hashed/tokenized API-key material server side.
