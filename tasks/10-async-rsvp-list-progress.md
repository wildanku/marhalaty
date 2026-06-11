# Async Paginated RSVP List Progress

- [ ] Add `api-rsvps` route to `routes/web.php`
- [ ] Implement `EventController@apiRsvps` for paginated fetching
- [ ] Optimize `EventController@show` to skip loading heavy relations and omit `$rsvps` from Inertia response
- [ ] Update frontend `resources/js/Pages/GodMode/Events/Show.tsx` to use local React state for fetching RSVP lists
- [ ] Implement Debounce Search and Pagination UI for Peserta Tab
- [ ] Implement Async data fetching and Pagination UI for Infak Tab
- [ ] Verify functionality (Approve/Reject actions refresh data correctly)
