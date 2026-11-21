# web/: the Kayal Log frontend

Vite, React 19, TypeScript, Tailwind CSS v4, Motion, React Router. `scripts/gon deploy` installs and
builds on gon; `vite build` has no type-check, so never run npm on the laptop.

## Tokens (`src/styles/tokens.css`): utilities like `bg-teak`, or `var(--color-…)`

- Wood: `teak-deep`, `teak`, `teak-raised`, `wood`, `wood-light`. Dark teak for headers and dark pages.
- Cream: `surface` (page), `kasavu` (cards), `line` (dividers), `field-border` (inputs).
- Text: `ink`, `ink-muted` on cream; `ink-inverse`, `ink-inverse-muted` on teak.
- Gold: `gold` (main button), `gold-bright` (hover), `gold-edge` (kasavu border), `gold-ink` (gold text on cream), `focus`.
- Status only: `verified`, `declared`, `overdue`, each with a `-soft` background.
- `scene-*`: the landing illustration only.
- Fonts: `font-display` (Fraunces), `font-sans` (Inter), `font-ml` (Anek Malayalam).
- Sizes: `text-display`, `text-title`, `text-heading`, `text-lead`, `text-body`, `text-small`, `text-caption`.
- `rounded-control`, `rounded-card`, `rounded-pill`; `shadow-card`, `shadow-raised`, `shadow-button`;
  `ease-out`, `ease-in-out`, `--duration-press`, `--duration-ui`.
- Put `surface-light` on any cream area inside a teak page so native controls draw light.

## Shared components (`src/components/`)

- `AppShell` `{ tone?: 'teak' | 'cream', headerEnd?, skipTo?, skipLabel? }`: header, main, footer.
- `Button` `{ variant?: 'primary' | 'secondary' | 'quiet', busy?, block? }` plus button props. One primary per view.
- `Card` `{ kasavu?: boolean (default true), as?, className? }`: cream card with the gold sari edge.
- `StatusBadge` `{ state: 'verified' | 'declared' | 'overdue', bilingual?: boolean }`.
- `Bi` `{ k?: StringKey, text?: {en, ml}, layout?: 'stack' | 'inline' | 'ml-first', as?, mlClassName?, enClassName? }`:
  Malayalam with its English meaning. Every Malayalam string goes through it.
- `lib/api.ts`: `fetchBoats`, `signInInspector`, `readAdminPin` (send it as `x-admin-pin`), `goTo`.

## Strings

Add English to `src/i18n/strings.ts`, deploy, then run `ssh gon 'cd ~/hackathoni && node web/scripts/translate.mjs'`
and `scp gon:hackathoni/web/src/i18n/ml.json web/src/i18n/`. Never type Malayalam by hand.

## Add a page

1. Create `src/pages/<name>/<Name>Page.tsx` with a default export.
2. Add one line to `src/routes.tsx`: `{ path: '/boat/:id', Page: lazy(() => import('./pages/boat/BoatPage.tsx')) },`
3. Add the same path to `WEB_APP_PATHS` in `../server.mjs` (`:id` matches `[\w-]+`).
