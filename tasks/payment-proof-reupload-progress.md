# Payment Proof Re-upload

- [x] Review event and store manual-transfer proof flows, including payloads and validation
- [x] Expose the existing proof safely to the respective payment pages
- [x] Display the uploaded proof and provide an explicit replacement action
- [x] Allow replacing a pending manual-transfer proof server-side
- [x] Add focused regression coverage and run formatting/type checks — focused test, TypeScript,
      production build, Pint, and route checks pass. Full `php artisan test` has one pre-existing
      `ExampleTest` failure because its SQLite database does not create the `events` table; the
      other 18 tests pass.
