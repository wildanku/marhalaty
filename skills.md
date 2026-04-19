# Agent Skills Definition (`skills.md`)

This document outlines the required technical skills, best practices, and architectural standards the AI Agent must adhere to when generating code for the SaaS Alumni Portal.

## 1. Laravel (Backend Architecture & Best Practices)

- **Domain-Driven Design (DDD) Lite:** Keep the `app/` directory organized by business domains (e.g., `app/Domains/Alumni`, `app/Domains/Event`). Avoid fat, monolithic standard folders.
- **Skinny Controllers, Fat Services:** Controllers should only handle HTTP requests, input validation (Form Requests), and returning Inertia responses. Put core business logic inside Service or Action classes.
- **Strict Typing:** Always use return types and argument types in PHP 8.2+ (`string`, `int`, `array`, `?Model`, etc.).
- **Database Optimization:** Prevent N+1 query problems by using Eloquent's `with()` for eager loading.
- **API Resources:** Use Eloquent API Resources (`JsonResource`) to format data cleanly before sending it to Inertia. Never send hidden fields (like passwords or raw tokens) to the frontend.

## 2. React.js & Inertia.js (Frontend Integration)

- **Single Page Application (SPA) Feel:** Utilize `<Link>` from `@inertiajs/react` for all internal navigations to prevent full page reloads.
- **Partial Reloads:** Use Inertia's `only` property when requesting data updates (e.g., filtering the directory) to save bandwidth and server resources.
- **Persistent Layouts:** Implement Inertia persistent layouts so components like sidebars, navigation bars, and audio players do not unmount during page transitions.
- **State Management:** Use `Zustand` for global client-side states (e.g., UI preferences, Zakat Calculator state). Rely on Inertia props for server-side state.

## 3. Tailwind CSS & Shadcn UI (Styling & UX)

- **Utility-First:** Strictly use Tailwind classes for styling. Avoid writing custom CSS unless absolutely necessary (e.g., complex animations).
- **Theming via CSS Variables:** Use `globals.css` to define the core color palette (the "Ijo Kukus" / Muted Green theme) so Shadcn UI components automatically inherit the styling.
- **Component Encapsulation:** Utilize Shadcn UI for base components (Buttons, Cards, Dialogs, Forms) and modify them gracefully. Do not clutter the main page files with raw SVG icons or massive class strings; extract them into reusable micro-components.
- **Visual Matching:** Always refer to the UI mockups in `/docs/ui/` to match padding, typography, and visual hierarchy. However, feel free to propose better ideas or implement UI/UX improvements for elements or states (e.g., loading, empty states) that are not explicitly covered in the mockups.

## 4. Payment Gateway Integration (Midtrans / Xendit)

- **Strategy Pattern:** Never hardcode Midtrans or Xendit logic into the main controllers. Always code against the `PaymentGatewayInterface` and resolve the implementation via Laravel's Service Container based on the `.env` configuration.
- **Idempotency (Crucial):** Payment webhooks can be triggered multiple times by the provider. Always use `spatie/laravel-webhook-client` to ensure a webhook payload is only processed once.
- **Database Transactions:** Any database update triggered by a payment success (e.g., updating RSVP status AND incrementing Campaign funds) must be wrapped in `DB::transaction()`.
- **Background Processing:** External API calls to payment gateways and sending confirmation emails must be dispatched to Laravel Queues (Redis/Horizon) to ensure the user UI doesn't hang.
