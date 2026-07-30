# Task 12: MVP2 Phase 1 — Store Foundation

## Overview

Toko, keanggotaan (owner/admin via invitation), alamat origin, dan alur pengajuan → approval
admin. Domain baru `app/Domains/Store`. See `docs/plan/mvp2/1-store-foundation.md`.

## Backend

- [x] Migration: `create_stores_table` (ULID PK, slug, owner_user_id, status enum, verified_by/created_by_admin_id → admins)
- [x] Migration: `create_store_members_table` (bigint PK, foreignUlid store_id, role/status enums, invitation token)
- [x] Migration: `create_store_addresses_table` (bigint PK, foreignUlid store_id, village_id FK, rajaongkir_destination_id placeholder)
- [x] Migration: delete-tracking triggers for `stores`, `store_members`, `store_addresses` (reuse existing `log_deleted_item()` function)
- [x] Migration: widen `deleted_items.record_id` and `media.model_id` from bigint to string (ULID PKs broke both — not in the original plan, found while implementing)
- [x] Model `Store` (HasUlids, HasSlug, InteractsWithMedia, scopePubliclyVisible, isManagedBy)
- [x] Model `StoreMember`
- [x] Model `StoreAddress` (full_address accessor, village relation)
- [x] `StorePolicy` (view/update/manageMembers/manageProducts/manageOrders) registered via `Gate::policy` in `AppServiceProvider`
- [x] Register `Store`, `StoreMember`, `StoreAddress` with `DeletedItemObserver` in `AppServiceProvider::boot()`
- [x] Action `ApproveStore`
- [x] Action `RejectStore`
- [x] Action `InviteStoreMember` (uses `User::withoutGlobalScope(MarhalahScope::class)`)
- [x] Jobs: `SendStoreApprovedEmail`, `SendStoreRejectedEmail`, `SendStoreInvitationEmail` (+ blade templates under `resources/views/emails/`)
- [x] Telegram notify on new store application (reuse `TelegramService`)
- [x] Controller `StoreApplicationController` (mine/create/store)
- [x] Controller `StoreController` (manage dashboard show/update, address upsert)
- [x] Controller `StoreMemberController` (invite/revoke/invitation show+accept)
- [x] Controller `GodMode\Controllers\StoreController` (index/show/approve/reject/suspend/create/store)
- [x] `LocationController`: add `provinces`, `districts`, `villages` cascading endpoints + optional `province_id` filter on existing `cities`
- [x] Routes wired in `routes/web.php` (`/my/stores/*`, `/store-invitations/{token}`, `/god-mode/stores/*`, `/api/locations/*`)

## Frontend

- [x] TS types: `Store`, `StoreMember`, `StoreAddress` in `types/index.d.ts`
- [x] `Components/Store/RegionPicker.tsx` (cascading province → city → district → village, read-only postal code) built on `AsyncSelect`
- [x] `Pages/Store/MyStores.tsx`
- [x] `Pages/Store/Create.tsx`
- [x] `Pages/Store/Manage/Dashboard.tsx` (single Inertia page with client-side tabs — only one GET route exists per the spec's route table; `Settings`/`Address`/`Members` are tab-content components it imports, not separate routed pages)
- [x] `Pages/Store/Manage/Settings.tsx`
- [x] `Pages/Store/Manage/Address.tsx`
- [x] `Pages/Store/Manage/Members.tsx`
- [x] `Pages/Store/InvitationAccept.tsx`
- [x] `Pages/GodMode/Stores/Index.tsx`
- [x] `Pages/GodMode/Stores/Show.tsx`
- [x] `Pages/GodMode/Stores/Create.tsx`
- [x] `GodModeLayout.tsx` nav item for Stores
- [x] "Toko Saya" entry point in `Pages/Profile/Edit.tsx` + `Components/Header.tsx` dropdown (locked state for unverified users)

## Definition of Done

- [x] Migrations + triggers run clean on Postgres
- [x] Unverified user gets 403 with clear message when applying (verified via HTTP request in a real browser/dev-server session)
- [x] New store is `pending` and invisible publicly (verified via tinker: `isPubliclyVisible()` false while pending)
- [x] Admin approve/reject/suspend flow works end-to-end (verified in god-mode UI); both logged to `admin_activity_logs` (`AdminActivityLog::create` in `ApproveStore`/`RejectStore`/`suspend`)
- [x] Owner/reject emails + Telegram admin notification wired via queued jobs / `TelegramService` (code path verified by inspection; not exercised against a real mailbox/Telegram chat in this session)
- [x] Owner can invite verified user across marhalah cohorts (`InviteStoreMember` explicitly bypasses `MarhalahScope`) and revoke; non-owner blocked by `manageMembers` policy — verified by code inspection, not browser-tested end-to-end
- [x] Expired (>7 day) invitation rejected with clear message (`StoreMember::isExpired()` + `invitationAccept` check)
- [x] Store address stores `village_id` + server-filled `postal_code` (postal_code is never taken from request input)
- [x] Admin-created store sets `created_by_admin_id`, owner becomes `store_members.role=owner`

### Bugs found and fixed during implementation (not in the original plan)

- `media.model_id` / `deleted_items.record_id` were `bigint`, breaking on ULID-keyed `Store`/`Product` — widened to `varchar` via additive migrations.
- Base `App\Http\Controllers\Controller` had no `AuthorizesRequests` trait — added it so `$this->authorize()` works for the new Store policies.
