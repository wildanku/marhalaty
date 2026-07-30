# Task 13: MVP2 Phase 2 — Product Catalog

## Overview

Produk fisik & non-fisik, varian maks. 2 opsi, stok, media, etalase publik. Depends on Task 12
(store must be `approved` to publish). See `docs/plan/mvp2/2-product-catalog.md`.

## Backend

- [x] Migration: `create_products_table` (ULID PK, foreignUlid store_id, type/status enums, options json, unique [store_id,slug]/[store_id,sku])
- [x] Migration: `create_product_variants_table` (ULID PK, foreignUlid product_id, option1/2 columns, unique [product_id,option1_value,option2_value])
- [x] Delete-tracking triggers for `products`, `product_variants`
- [x] Model `Product` (HasUlids, HasSlug, InteractsWithMedia; media collections `product-images` public + `product-digital-file` local/private; display_price/available_stock accessors; scopeActive)
- [x] Model `ProductVariant` (label + effective_weight accessors)
- [x] Register `Product`/`ProductVariant` with `DeletedItemObserver`
- [x] Form Request `StoreProductRequest` (single-price vs variant-mode rules, max 2 option groups)
- [x] `ProductService::saveProduct()` — transactional create/update, variant upsert-and-deactivate-missing, media handling, business-rule validation (option/variant consistency, digital-no-variants, type-lock guarded against a not-yet-existent `store_order_items` table so it activates automatically once Phase 3 lands)
- [x] Controller `Store\Controllers\ProductController` (manage CRUD: index/create/store/edit/update/status/destroy) guarded by `StorePolicy@manageProducts`
- [x] Controller `Store\Controllers\StoreDirectoryController` (public: directory index w/ query builder, store show, product show) — eager-loads `with(['store','variants','media'])`
- [x] Routes wired: `/my/stores/{store}/products*`, public `/stores`, `/stores/{store:slug}`, `/stores/{store:slug}/products/{productSlug}`

## Frontend

- [x] TS types: `ProductOption`, `ProductVariant`, `Product` in `types/index.d.ts`
- [x] `Components/Store/VariantEditor.tsx` (option groups → combination matrix, bulk-fill price, zero price/stock warnings, hard 2-group cap)
- [x] `Components/Store/VariantPicker.tsx` (option buttons, disable unavailable combos, live price/stock/image) — click-tested in browser, disable/out-of-stock logic confirmed correct
- [x] `Pages/Store/Manage/Products/Index.tsx`
- [x] `Pages/Store/Manage/Products/Form.tsx` (shared create/edit)
- [x] `Pages/Store/Directory.tsx`
- [x] `Pages/Store/Show.tsx`
- [x] `Pages/Store/ProductShow.tsx`

## Definition of Done

- [x] Owner creates single-price physical product w/ weight, publishes it (full round-trip tested in browser: create → list → edit → save)
- [x] Owner creates 2-option variant product (e.g. Ukuran × Warna), each combo has own price/stock (tested via tinker + browser edit view)
- [x] Adding a 3rd option group rejected in UI **and** server (server side verified directly via `ProductService` — UI caps `options.length` at 2 in `VariantEditor`)
- [x] Editing option values preserves price/stock for still-existing combinations (tinker test: dropped a color value, re-saved, kept combos retained their price/stock, dropped combos deactivated not deleted)
- [x] Digital product rejects weight (`weight_grams` forced null in `ProductService`), requires file upload (`ValidationException` verified via tinker), file not reachable via public URL (`product-digital-file` collection uses `useDisk('local')`, confirmed private disk)
- [x] Draft products hidden from public storefront; products of pending/suspended stores hidden too (`Product::scopeActive()` requires `store->publiclyVisible()`)
- [x] Product slug unique per store; two stores may reuse the same slug (tinker test: duplicate product name in the same store auto-suffixed `-1`)
- [x] Deleting an ordered product is rejected, directed to archive instead (`ProductService::hasBeenOrdered()` guards via `Schema::hasTable('store_order_items')` — untestable end-to-end until Phase 3 creates that table, but the guard is in place and safe now)
- [ ] Storefront listing (12 products) fires a constant query count checked via Telescope — eager loading is in place (`with(['variants','media'])`) but not confirmed against the Telescope UI in this session
- [x] `pnpm build` / `tsc --noEmit` passes with zero TypeScript errors; no `any` in new code (grep-verified)

### Bugs found and fixed during implementation (not in the original plan)

- `StoreDirectoryController` passed an array to `QueryBuilder::allowedFilters()`/`allowedSorts()` — this installed version requires variadic arguments (matches the existing `DirectoryController` pattern). Caught via browser 500 error, fixed.
- `CurrencyInput` mis-formatted decimal-cast price strings like `"120000.00"` as `Rp 12.000.000` (stripped the `.` instead of truncating at it) — caught by inspecting the product edit form in the browser, fixed in the shared component.
