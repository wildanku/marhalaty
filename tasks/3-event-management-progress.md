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
