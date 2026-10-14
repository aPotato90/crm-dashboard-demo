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
- Pages under `/app` render only in the browser behind the auth gate, so each
  `page.tsx` there (and the layout) exports `instant = false`. The `/app`
  layout also renders `<DynamicMarker />` beside the gate; it lets dynamic
  routes like `/app/contacts/[id]` build under Cache Components. Do not
  remove it.
- Components that call `useSearchParams` or `useParams` must sit inside a
  `<Suspense>` boundary (the page wraps them with a skeleton fallback).
- Public pages (`/`, `/about`) live in the `(site)` route group, which also
  scopes the generated Open Graph image to them.

## Secrets and Firebase

- Never commit secrets. `.env*` is gitignored except `.env.example`.
- Only `NEXT_PUBLIC_FIREBASE_*` values are used. They identify the project and
  are not secrets; access control lives in `firestore.rules`.
- No service accounts, no Firebase Admin SDK.
- All user data lives under `users/{uid}/...`. Components never build Firestore
  paths themselves: go through `src/lib/crm/repo.ts`.
- Reads use the real-time hooks in `src/lib/crm/hooks.ts` (or `useCrmData`);
  writes use the repo helpers, and multi-document writes use
  `src/lib/crm/mutations.ts` (batched, at most 500 per batch). Calculations
  belong in pure, unit-tested modules (`metrics.ts`, `pipeline.ts`,
  `contacts-table.ts`, `tasks.ts`, `cascade.ts`) that take `now` as a
  parameter.
- Deletes go through `CascadeDeleteDialog`: it shows what else is removed,
  deletes in batches and offers Undo. Every create, update and delete shows a
  toast.
- List filters, sorting and pagination live in the URL search params.
- When a schema in `src/lib/crm/` changes, update `firestore.rules` to match
  (field list, types and limits from `src/lib/crm/limits.ts`).

## Accessibility and layout

- Semantic HTML, full keyboard navigation, visible focus styles, WCAG AA
  contrast, and respect `prefers-reduced-motion`.
- Mobile-first. Check layouts at 375px, 768px and 1280px wide, in light and
  dark themes, with no horizontal page overflow.
- Chart colours come from the validated `--chart-*` tokens in `globals.css`
  (light and dark). Every chart needs an accessible name and a visually hidden
  data table.

## UI conventions

- Every page has a unique, meaningful `<title>` (static `metadata`, or
  `useDocumentTitle` for data-dependent titles such as a contact's name).
- Loading uses skeletons; failed listeners show `ListenerError` with retry;
  empty and no-results states use `EmptyState`.
- Links inside sentences are underlined, not distinguished by colour alone.
- Run an axe-core audit in both themes for new screens.

## Definition of done

Run all of these and make sure they pass before declaring a task done:

```bash
npm run lint
npm run format:check
npm test
npm run test:rules   # needs Java 21+ (Firestore emulator)
npm run build
```
