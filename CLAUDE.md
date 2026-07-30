# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Marhalaty is a multi-tenant-ready alumni portal, currently piloted single-tenant for Gontor's
"Dynamic Generation" (Class of 2013). Three modules are live: Smart Alumni Directory, Event
Management (RSVP + dynamic pricing + payments), and Baitul Maal (donation/crowdfunding ledger). A
fourth module — a Store/eCommerce marketplace — is planned under `docs/plan/mvp2/` and not yet
implemented.

## Commands

Backend (PHP 8.3+, Laravel 13, Postgres):
- `composer dev` — one-shot dev environment: `php artisan serve` + `queue:listen` + `pail` (log
  tail) + `npm run dev` (Vite), run concurrently.
- `composer test` — clears config cache, then runs `php artisan test`.
- `php artisan test --filter=TestName` or `php artisan test tests/Feature/SomeTest.php` — run a
  single test.
- `vendor/bin/pint` — PHP code style (Laravel Pint, no custom `pint.json`, defaults apply).
- `php artisan migrate` — apply migrations.

Frontend (no JS lockfile is committed; no ESLint configured, only Prettier):
- `npm run dev` / `npm run build` — Vite dev server / production build.
- `npm run format` / `npm run format:check` — Prettier over `resources/js`.
- Project docs (`Agents.md`, `docs/plan/mvp2/README.md`) mandate `pnpm` for installs, but
  `composer dev` itself shells out to `npm run dev` internally — either package manager works
  day-to-day.
- TypeScript is strict (`tsconfig.json`); there's no standalone typecheck script, so type errors
  surface via the Vite build.

## Architecture

### Backend: domain-driven, skinny controllers

- Business logic lives in `app/Domains/{Alumni,Donation,Event,GodMode,Shared}`, not the default
  Laravel folders. Each domain has its own `Controllers/`, `Models/`, `Observers/`, etc. — mirror
  this shape when adding a domain (see `docs/plan/mvp2/README.md` §"D1" for how the planned `Store`
  domain follows the same pattern).
- `app/Domains/Shared/Services/` holds third-party integrations (`IPaymuService`,
  `BrevoApiService`, `TelegramService`) — put new external integrations there, not inline in
  controllers.
- Controllers return Inertia responses and delegate business logic to Service/Action classes; Form
  Requests handle validation.

### Dual auth, single-tenant scoping

- End users authenticate via Google OAuth only (Socialite) — there is no password/OTP flow.
- Admins are a separate model/guard: `App\Models\Admin` behind the `admin` guard and the
  `god-mode.auth` middleware, with all admin routes prefixed `/god-mode` (`routes/web.php`). Admin
  actions are audited in `admin_activity_logs`.
- `App\Models\Scopes\MarhalahScope` is a global scope on `User` that filters by `marhalah_year`
  whenever `config('community.scope') === 'single'` (`.env`: `COMMUNITY_SCOPE=single`,
  `TARGET_MARHALAH_YEAR=2013`) — this is the pilot's single-cohort restriction. Code that needs to
  see users across cohorts must explicitly `withoutGlobalScope(MarhalahScope::class)`.

### Payments

- Provider abstraction is `App\Contracts\PaymentProviderInterface`
  (`initiatePayment`/`parseWebhook`/`verifyWebhook`); the only implementation is `IPaymuService`
  (iPaymu, direct integration — not Midtrans/Xendit, no `spatie/laravel-webhook-client`).
- `transactions.payment_hash` backs public, token-based payment pages (`/payment/{hash}`,
  `/payment-confirmation/{hash}`) that require no login.
- The iPaymu webhook route is exempted from CSRF
  (`->withoutMiddleware([PreventRequestForgery::class])`) and verified via provider signature
  instead — follow this pattern (route-level CSRF exemption + explicit signature check in the
  service) for any new webhook.
- Financial mutations must be wrapped in `DB::transaction()` and be idempotent — webhooks retry.

### Deletion auditing (no soft deletes)

- Instead of `SoftDeletes`, deletions are captured by `DeletedItemObserver` (snapshots the row into
  `deleted_items` before removal) plus Postgres triggers. A model is only audited if it's
  registered in `AppServiceProvider::boot()` (`Model::observe(DeletedItemObserver::class)`) — this
  is not automatic and must be added per model.

### Frontend: Inertia + React + TypeScript

- Pages live in `resources/js/Pages/<Domain>/...` mirroring the backend domains (`Event`,
  `Alumni`, `Donation`, `GodMode`, ...); shared UI in `resources/js/Components`; `GodModeLayout` is
  the persistent admin layout. Path alias `@/*` → `resources/js/*`.
- **No UI kit is installed** — no shadcn/ui, no Radix, no `components/ui`. Styling is Tailwind v4
  utility classes plus hand-rolled components. Icons come from the "Material Symbols Outlined"
  Google Font (string names like `"assignment"`), not an icon library.
- Theme tokens live in `resources/css/app.css` under `@theme`, using Material Design 3–style names
  (`--color-surface`, `--color-on-primary-container`, ...); primary is `--color-legacy-maroon`
  (#560607), secondary `--color-unity-red`. Font is the self-hosted variable font "Overused
  Grotesk".
- **No global state library** (no Zustand) — state is `useState`/`useMemo` plus Inertia shared
  props (via the `HandleInertiaRequests` middleware). Don't introduce a state library without
  checking with the user first.
- **Don't render large datasets as Inertia props.** Controllers must not pass big/unbounded
  collections (product lists, user/alumni lists, order lists, admin tables, etc.) into
  `Inertia::render()` — every full Inertia visit and partial reload re-serializes and re-transfers
  that payload, which is what makes these pages slow to load. For anything list-shaped and
  non-trivial in size, expose a thin JSON endpoint instead (still behind the normal
  auth/policy/Form Request checks) and fetch it client-side with `axios` +
  TanStack React Query (`@tanstack/react-query`) — neither is installed yet, so add both the first
  time this pattern is needed. Reserve Inertia props for the page "shell": current user, small
  lookup/filter option lists, and other bounded, cheap-to-serialize data. Note this is a narrow
  exception to the "no global state library" rule above — React Query manages server-state
  caching, not client/UI state, so it doesn't conflict with that rule.
- i18n is a custom `useTranslate()` hook reading a `translations` Inertia prop backed by flat
  key→value maps in `lang/en.json` / `lang/id.json`; locale switches via `POST /language`.

> `Agents.md` / `skills.md` (both at the repo root and duplicated in `.github/`) describe an
> earlier, aspirational stack — Shadcn UI, Zustand, a green "Ijo Kukus" theme, Midtrans/Xendit —
> that was never actually built (confirmed by the real-vs-documented audit in
> `docs/plan/mvp2/README.md` §1). For anything about the stack, trust this file and the code over
> those two. Their workflow guidance (task-tracking, DDD-lite, skinny-controller/fat-service,
> payment idempotency) still holds and is folded into this file above.

## UI/frontend design work

Before designing or building any new UI screen or page — or meaningfully reshaping an existing
one — read `frontend.skill.md` at the repo root first. It's the studio-style design-approach guide
(distinctive visual choices, typography, motion, restraint) this project expects UI work to
follow; treat it as required reading before writing JSX/Tailwind for a page, not optional
inspiration.

## Task-tracking convention

Before starting a unit of work, create a checklist file in `/tasks/` (e.g.
`tasks/12-store-foundation-progress.md`) with unchecked `- [ ]` items, matching the style of the
existing files there. Work backend-first (migration → model → service/action → controller →
route), then frontend TypeScript, then check items off as they land. This convention is already
used for all shipped work (`tasks/*-progress.md`) and the planned MVP2 phases
(`docs/plan/mvp2/README.md` §8).

## Docs map

- `docs/0.intro.md` … `docs/8.brevo-api-migration.md` — numbered module docs (onboarding, alumni,
  event, baitul maal, payment gateway, email, queues). Treat `0.intro.md`'s stack claims as
  historical intent, not current fact (see the stale-docs note above).
- `docs/plan/mvp2/` — the Store/eCommerce module plan (not yet implemented): `README.md` has the
  architecture decisions and the real-vs-documented audit; `1`–`5` are per-phase specs.
- `docs/guidance/payment-guidance.md` — Satutera payment service integration guidance for MVP2
  (WebSocket, HMAC signing, channel flow).
- `docs/ui/<feature>/` — visual mockups/design references per feature.
