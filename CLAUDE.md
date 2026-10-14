@AGENTS.md

# PipelineHQ (Demo) — project rules

A portfolio CRM demo for Emmanuel Kelvin. It must look and feel like a real SaaS
product, but it is a demo.

## Demo only

- Fake data only. Use clearly fictional people and companies, `example.com`
  emails and `555-01xx` phone numbers. Never use real people or real companies.
- Every page shows a visible "Demo" indicator (the global `DemoBanner` in the
  root layout covers this; do not remove it).

## Rendering

- Server Components by default. Add `"use client"` only where a component needs
  state, effects, browser APIs or event handlers.
- All Firebase code is client-side (Firebase client SDK). Keep it in Client
  Components or in modules that only Client Components import.
- `cacheComponents` and `partialPrefetching` are on (see `next.config.ts`).
  Read `node_modules/next/dist/docs/` before using an API you are unsure about.

## Secrets and Firebase

- Never commit secrets. `.env*` is gitignored except `.env.example`.
- Only `NEXT_PUBLIC_FIREBASE_*` values are used. They identify the project and
  are not secrets; access control lives in `firestore.rules`.
- No service accounts, no Firebase Admin SDK.
- All user data lives under `users/{uid}/...`. Components never build Firestore
  paths themselves: go through `src/lib/crm/repo.ts`.
- When a schema in `src/lib/crm/` changes, update `firestore.rules` to match
  (field list, types and limits from `src/lib/crm/limits.ts`).

## Accessibility and layout

- Semantic HTML, full keyboard navigation, visible focus styles, WCAG AA
  contrast, and respect `prefers-reduced-motion`.
- Mobile-first. Check layouts at 375px, 768px and 1280px wide.

## Definition of done

Run all of these and make sure they pass before declaring a task done:

```bash
npm run lint
npm run format:check
npm test
npm run build
```
