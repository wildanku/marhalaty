# Public Events Tabs Progress

- [x] Review public event data flow and existing UI reference
- [x] Filter public events by upcoming or passed schedule from the selected tab
- [x] Add the upcoming and previous-events tabs to the public events page
- [x] Verify types, syntax, and relevant automated checks

✅ Done

> `php artisan test` remains blocked by the existing SQLite in-memory setup: its feature test does
> not run the migrations, so the `events` table is unavailable. PHP lint, Prettier for the changed
> page, and the production Vite build pass.
