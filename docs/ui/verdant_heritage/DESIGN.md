# Design System Philosophy: The Academic Sanctuary

### 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Academic Sanctuary."** 

An alumni portal should not feel like a cold, transactional database; it should feel like a prestigious, quiet lounge where legacy meets future opportunity. This design system rejects the "template" look of modern SaaS by embracing an editorial, high-end aesthetic. We achieve this through **Organic Asymmetry** and **Tonal Depth**. Instead of rigid, boxed-in grids, we use expansive breathing room and layered surfaces to guide the eye. The "Ijo Kukus" (Steamed Green) serves as our foundational anchor—a color that represents growth, wisdom, and calm authority.

---

### 2. Colors: Tonal Sophistication
Our palette is rooted in the organic transitions of nature. We move away from harsh blacks and clinical whites in favor of warm, "lived-in" neutrals and muted botanicals.

*   **The Primary Axis (Ijo Kukus):** Use `primary` (#506447) for key brand moments and `primary-container` (#8da382) for softer emphasis. These greens should feel "steamed"—muted and sophisticated, never neon or synthetic.
*   **The Secondary Warmth:** The `surface` (#faf9f6) and `secondary-container` (#e6e2d7) provide the "warm cream" foundation. This creates a tactile, paper-like quality that feels premium.
*   **The Golden Accent:** The `tertiary` (#775a19) is our "Gold." It is reserved strictly for high-conversion CTAs and moments of prestige (e.g., "Featured Alumni" or "Donate").

#### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section off content. Boundaries must be defined solely through background color shifts. For example, a card (`surface-container-lowest`) sits on a section background (`surface-container-low`). The change in tone is the border.

#### The "Glass & Gradient" Rule
To add "soul" to the digital interface, use subtle linear gradients for hero sections, transitioning from `primary` (#506447) to `primary-container` (#8da382). For floating navigation or over-image headers, apply **Glassmorphism**: use a semi-transparent `surface` color with a 12px–20px backdrop-blur to allow the organic greens to bleed through.

---

### 3. Typography: The Editorial Voice
We utilize a pairing of **Manrope** for impact and **Inter** for utility.

*   **Display & Headline (Manrope):** These are your "Editorial" voices. Use `display-lg` and `headline-md` with slightly tighter letter-spacing (-0.02em) to create a sense of authoritative, high-end print media.
*   **Body & Titles (Inter):** These are your "Functional" voices. Inter provides the clarity required for a complex portal. Ensure `body-lg` (#1a1c1a) is used for long-form community posts to maintain readability.
*   **Visual Hierarchy:** Use `on-surface-variant` (#444840) for sub-captions. This ensures the eye hits the `headline` first, then the `body`, creating a structured path through the content.

---

### 4. Elevation & Depth: Tonal Layering
In this system, depth is biological, not mechanical. We avoid the "floating in space" look of traditional material design.

*   **The Layering Principle:** Stacking is the primary way to show importance.
    1.  **Base Layer:** `surface` (#faf9f6)
    2.  **Section Layer:** `surface-container-low` (#f4f3f1)
    3.  **Card Layer:** `surface-container-lowest` (#ffffff)
*   **Ambient Shadows:** If a card must float (e.g., a hover state), use an extra-diffused shadow. 
    *   *Shadow Recipe:* `0px 10px 40px rgba(80, 100, 71, 0.08)`. Notice the shadow is tinted with the Primary Green to mimic natural light.
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke, use `outline-variant` (#c4c8bd) at **20% opacity**. This creates a "suggestion" of a line rather than a hard boundary.

---

### 5. Components: Curated Interactions

#### Cards (The Core Unit)
Cards are the heart of the alumni portal. 
*   **Styling:** No borders. Use `md` (0.75rem) or `lg` (1rem) corner radius.
*   **Content:** Forbid the use of divider lines. Separate user information from card metadata using 24px of vertical white space (from the spacing scale).

#### Buttons
*   **Primary (The Gold Standard):** Use `tertiary` (#775a19) with `on-tertiary` (#ffffff) text. These should have a `full` (pill-shaped) radius to contrast against the architectural cards.
*   **Secondary:** Use `primary` (#506447) with a ghost-style interaction or a `primary-fixed-dim` background.
*   **Tertiary:** Text-only, using `primary` color with an underline that appears only on hover.

#### Chips & Badges
Use `secondary-container` (#e6e2d7) for "Class Year" or "Industry" tags. They should feel like soft labels resting on the surface. For "Verified Alumni," use a small `tertiary` (gold) icon.

#### Input Fields
Text inputs should use `surface-container-high` (#e9e8e5) as a background with a bottom-only "active" stroke in `primary`. This mimics high-end stationery.

---

### 6. Do's and Don'ts

*   **DO:** Use asymmetrical layouts. Place a large `display-md` headline on the left with a wide margin, letting the content cards stagger on the right.
*   **DO:** Use the `primary-fixed` (#d2eac5) color for success states or "Join" buttons to keep the palette harmonious.
*   **DON'T:** Use pure black (#000000) for text. Always use `on-surface` (#1a1c1a) to maintain the warmth of the "Academic Sanctuary."
*   **DON'T:** Use standard "drop shadows" that look like gray blurs. If it's not tinted with a hint of green or cream, it doesn't belong in this system.
*   **DO:** Prioritize white space over information density. If a screen feels "busy," increase the padding to the `xl` (1.5rem) scale.
*   **DON'T:** Use 1px dividers to separate list items in the Directory. Use a subtle background toggle between `surface` and `surface-container-low` for every second item.

---

### 7. Signature Portal Component: The "Legacy Card"
Designed specifically for this system, the **Legacy Card** is an oversized card using `surface-container-highest` (#e3e2e0) with a subtle `primary-container` gradient overlay at 5% opacity. It is used to highlight distinguished alumni. It features a large `display-sm` name and uses the Gold `tertiary` for a single, prominent "Connect" CTA.