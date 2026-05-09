# Task 4: RSVP & Event Management

## Overview

Implement the dynamic event commerce features including RSVP, flexible infak logic, and merchandise catalog.

## Tasks

- [x] Install `zod` dependency.
- [x] Implement `create_event_management_tables` migration.
- [x] Create Models: `Event`, `EventAddon`, `Rsvp`.
- [x] Implement `EventController.php` and `RsvpController.php`.
- [x] Implement `resources/js/Pages/Event/Index.tsx`
- [x] Implement `resources/js/Pages/Event/Show.tsx` with Dynamic pricing logic.
- [x] Update `routes/web.php`.
- [x] Verify functionality and calculations.

✅ Done

---

## Payment Gateway (iPaymu + Manual Transfer)

### Completed:

- [x] Migration: `transactions` table (payment_provider, status, external_reference, payment_url, metadata, etc.)
- [x] Migration: `payment_proofs` table (file_path, original_name, notes, reviewed_by, review_note)
- [x] Model: `Transaction` with relationships (rsvp, user, proof)
- [x] Model: `PaymentProof` with relationships (transaction, reviewer)
- [x] Updated `Rsvp` model: added `transactions()` and `latestTransaction()` relationships
- [x] Contract: `App\Contracts\PaymentProviderInterface`
- [x] Service: `App\Domains\Shared\Services\IPaymuService` (HMAC-SHA256 signature, redirect payment)
- [x] Controller: `PaymentController` (user-facing: show, ipaymuWebhook, ipaymuReturn)
- [x] Controller: `PaymentProofController` (upload/re-upload proof for manual payments)
- [x] Controller: `GodMode/PaymentController` (index, approve, reject, downloadProof)
- [x] Updated `RsvpController@store`: accepts `payment_provider`, creates Transaction, handles iPaymu redirect vs manual flow
- [x] Routes: `/payments/{id}`, `/payments/{id}/proof`, `/payments/ipaymu/webhook` (CSRF-exempt)
- [x] God Mode Routes: `/god-mode/payments`, approve, reject, proof download
- [x] `config/services.php`: iPaymu VA/API key/sandbox + manual payment bank info env vars
- [x] TypeScript types: `Transaction`, `PaymentProof` interfaces added to `types/index.d.ts`
- [x] Updated `Rsvp` type: added `latest_transaction` field
- [x] Frontend `Event/Show.tsx`: Payment method selection (iPaymu vs Manual Transfer radio buttons)
- [x] Frontend `Payment/Show.tsx`: Status page with bank info + proof upload (manual) or iPaymu redirect
- [x] Frontend `GodMode/Payments/Index.tsx`: Admin panel to approve/reject manual payments with modal

### Flow Summary:

1. User submits RSVP → selects payment method (iPaymu or Manual)
2. **iPaymu**: RSVP + Transaction created → `IPaymuService::initiatePayment()` called → user redirected to iPaymu URL
3. **Manual**: RSVP + Transaction created → user redirected to `/payments/{id}` with bank info
4. **Manual upload**: User uploads proof → `POST /payments/{id}/proof` → stored in `storage/app/payment-proofs/`
5. **Admin review**: God Mode `/god-mode/payments` shows all pending manual transactions → approve sets `paid`, reject sets `failed`
6. **iPaymu webhook**: `POST /payments/ipaymu/webhook` (CSRF-exempt) → idempotent status update on Transaction + Rsvp

### Required `.env` variables:

```
IPAYMU_VA=your-va-number
IPAYMU_API_KEY=your-api-key
IPAYMU_SANDBOX=true

MANUAL_PAYMENT_BANK_NAME=BCA
MANUAL_PAYMENT_ACCOUNT_NUMBER=1234567890
MANUAL_PAYMENT_ACCOUNT_HOLDER=Nama Pemilik Rekening
```

---

## Seeder: "Muleh" Event

### Completed:

- [x] Add `metadata` JSON column to events table migration
- [x] Create EventSeeder with "Muleh" event
- [x] Configure pricing_rules with flexible options (20rb, 50rb, 100rb, custom min 10rb)
- [x] Add 3 merchandise add-ons (Kaos, Tote Bag, Merchandise Pack)
- [x] Configure custom_forms metadata (nama, alamat)
- [x] Update Event model with metadata fillable & casts
- [x] Update DatabaseSeeder to call EventSeeder
- [x] Run migrations: `php artisan migrate:fresh --seed`
- [x] Verify event data in database ✅

### Event Details - "Muleh":

- **Title**: Muleh - Reuni Akbar Dynamic di Gontor
- **Date**: July 20, 2026
- **Location**: Ponorogo, Jawa Timur
- **Payment Type**: Flexible
- **Pricing Options**: 20.000, 50.000, 100.000, Custom (min 10.000)
- **Add-ons**:
  - Kaos Muleh (75.000) - Sizes XS-XXL, Colors
  - Tote Bag Premium (50.000) - Designs & Materials
  - Merchandise Pack (35.000) - Pin, Stiker, Bookmark
- **Custom Forms**: Nama Lengkap, Alamat
