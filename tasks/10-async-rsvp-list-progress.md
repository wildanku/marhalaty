# Async Paginated RSVP List Progress

- [x] Add `api-rsvps` route to `routes/web.php`
- [x] Implement `EventController@apiRsvps` for paginated fetching
- [x] Optimize `EventController@show` to skip loading heavy relations and omit `$rsvps` from Inertia response
- [x] Update frontend `resources/js/Pages/GodMode/Events/Show.tsx` to use local React state for fetching RSVP lists
- [x] Implement Debounce Search and Pagination UI for Peserta Tab
- [x] Implement Async data fetching and Pagination UI for Infak Tab
- [x] Verify functionality (Approve/Reject actions refresh data correctly)
