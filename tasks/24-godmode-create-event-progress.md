# God-mode: fitur "Create Event"

Tombol "Create Event" di `/god-mode/events` sudah ada dari lama tapi cuma placeholder (tidak ada
`onClick`, tidak ada route `events.create`/`events.store`). Membangun alurnya dari nol, mengikuti
pola yang sudah dipakai `EventController::edit()`/`update()` dan `Pages/GodMode/Events/Edit.tsx`.

- [x] Route `GET /god-mode/events/create` (`events.create`) — didaftarkan sebelum `/events/{id}` supaya tidak tertangkap sebagai parameter
- [x] Route `POST /god-mode/events` (`events.store`)
- [x] `EventController::create()` — render halaman kosong
- [x] `EventController::store()` — validasi + `Event::create()` + upload gambar opsional; slug opsional (kosong = dibuat otomatis dari title lewat `HasSlug`)
- [x] Halaman `Pages/GodMode/Events/Create.tsx` — form yang sama dengan `Edit.tsx`, tanpa state gambar existing
- [x] Tombol "Create Event" di `Pages/GodMode/Events/Index.tsx` di-link ke `/god-mode/events/create`
- [x] Verifikasi: `php -l`, Pint, `tsc --noEmit`, `pnpm build` — semua bersih; smoke test tinker end-to-end (`create()` render OK, `store()` dengan slug kosong → auto-generate `tinker-test-event`, redirect ke halaman detail event baru, `is_registration_enabled` default `true`) — data uji dibersihkan; `php artisan test` tanpa regresi baru
