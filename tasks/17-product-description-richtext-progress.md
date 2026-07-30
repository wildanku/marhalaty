# Task 17: Product Description — Rich Text Editor (HTML)

## Overview

Replace the plain `<textarea>` "Deskripsi" field on the seller-facing product form
(`Pages/Store/Manage/Products/Form.tsx`) with a WYSIWYG rich text editor (Tiptap), stored as
sanitized HTML on `products.description`. Rendered as HTML (not plain text) on the public product
page. Server-side sanitization is mandatory since this HTML is shown to every storefront visitor.

## Backend

- [x] `composer require ezyang/htmlpurifier`
- [x] `App\Domains\Shared\Services\HtmlSanitizerService` — allow-list: `p,br,strong,b,em,i,u,s,ul,ol,li,a[href],h2,h3,blockquote`; forces `target=_blank`+`rel=nofollow` (this HTMLPurifier version has no `HTML.NoOpener` directive, but its `TargetBlank`/URI safety filters already emit `rel="nofollow noreferrer noopener"` in practice — confirmed via tinker); restricts `URI.AllowedSchemes` to http/https/mailto
- [x] `ProductService::saveProduct()` sanitizes `description` through `HtmlSanitizerService` before persisting
- [x] `StoreProductRequest` — bumped `description` max length 5000 → 20000 to account for HTML markup overhead

## Frontend

- [x] `pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-placeholder` (dropped `@tiptap/extension-link` from the plan — Tiptap v3's `StarterKit` already bundles `Link` internally, adding it separately would double-register the extension)
- [x] `Components/RichTextEditor.tsx` — Tiptap-based, controlled (`value`/`onChange` HTML string), toolbar: Bold/Italic/Strike/H2/H3/Bullet list/Numbered list/Blockquote/Link (inline URL popover, not `window.prompt`), styled to match existing Tailwind form inputs. `code`/`codeBlock`/`horizontalRule` explicitly disabled in `StarterKit.configure()` since those tags aren't in the sanitizer's allow-list and would otherwise silently vanish after save.
- [x] `.rich-text` utility block in `resources/css/app.css` styling the same allow-listed tags (no `@tailwindcss/typography` dependency — hand-rolled since the tag set is small and fixed by the sanitizer)
- [x] `Pages/Store/Manage/Products/Form.tsx` — swapped `<textarea>` for `RichTextEditor`
- [x] `Pages/Store/ProductShow.tsx` — renders `product.description` via `dangerouslySetInnerHTML` wrapped in `.rich-text` instead of plain `<p>`

## Definition of Done

- [x] Owner formats a description (bold/list/link) in the editor, saves, and it round-trips correctly on re-edit — **browser-tested**: created a product with a bold word, a 2-item bullet list, and a link, saved, reloaded the edit page, content matched exactly
- [x] Public product page renders the formatted HTML (not raw tags) with readable styling — **browser-tested** on the public storefront (`/stores/dynamic-merch/products/...`)
- [x] Raw `<script>`/`onerror=`/`javascript:` payload posted directly to the store endpoint (bypassing the editor) is stripped server-side — **tinker-tested**: `<script>`, `onclick`/`onerror` attributes, `<img>`, `<iframe>`, and the `javascript:` URI were all stripped; only `<p>`, `<b>`, `<strong>`, and a bare (href-less) `<a>` survived
- [x] Links in descriptions open in a new tab with `rel` hardening — **tinker-verified** stored output: `<a href="..." rel="nofollow noreferrer noopener" target="_blank">`

### Notes / deviations from the original plan

- Asked the user up front whether to hand-roll a `contentEditable` editor or add Tiptap, given
  this project's stated "no UI kit, hand-rolled components" preference in `CLAUDE.md` — user chose
  Tiptap (recommended: avoids the well-known cursor/paste edge cases of raw `contentEditable` +
  `execCommand`).
- `HTML.NoOpener` doesn't exist in the installed `ezyang/htmlpurifier` (4.19) — caused a 500 on
  first load. Removed it; `HTML.TargetBlank` + `HTML.Nofollow` were kept, and the actual purified
  output already includes `noreferrer noopener` regardless (verified via tinker), so no gap in
  practice.
- Bundled `@tiptap/extension-link` was removed from `package.json` after discovering Tiptap v3's
  `StarterKit` ships `Link` internally — kept the dependency list to only what's actually imported.
