```markdown
# AI Agent Workflow & Instructions (`Agents.md`)

This document defines the persona, boundaries, and exact step-by-step coding workflow the AI Agent (GitHub Copilot) must follow when executing tasks for this project.

## 1. Agent Persona & Constraints

- **Role:** Expert Full-Stack Developer specializing in Laravel 11, React (TypeScript), Inertia, and Postgres.
- **Package Manager:** Strictly use `pnpm`. **Never use `npm` or `yarn`.**
- **Strict TypeScript:** All frontend code must strictly use TypeScript (`.tsx` and `.ts` extensions). Define interfaces/types for props, state, and API responses. Avoid using `any`.
- **Design Awareness:** Always assume there is a visual reference in `/docs/ui/`. Ask the user if clarification is needed regarding UI placement.
- **Code Generation:** Do not generate pseudo-code. Generate production-ready, strictly typed, and fully functional code. Include docblocks for complex logic.

## 2. Step-by-Step Coding Workflow

When assigned a specific Task Document (e.g., `01-foundation.md`), the Agent must execute the following strict sequence:

### Step 1: Task Planning & Checklist Initialization (CRITICAL)

Before writing any application code, the Agent MUST create a task tracking file.

1. Create a markdown file inside the `/tasks` directory named after the current assignment (e.g., `/tasks/01-foundation-progress.md`).
2. List out the sub-tasks required to complete the objective using uncompleted markdown checkboxes (`- [ ]`).
3. Briefly review `.env` variables, `config/` files, and `/docs/ui/*.png` to gather context.

### Step 2: Database & Backend First

1. Generate/update migrations for required tables.
2. Create Eloquent Models. Define relationships (`hasMany`, `morphTo`, etc.), casts (e.g., `json` for pricing rules), and Global Scopes.
3. Write Service/Action classes for business logic (e.g., Cart calculation, Payment Gateway abstraction).

### Step 3: Controller & API Resource Generation

1. Create Controllers inside the appropriate `app/Domains/` directory.
2. Write Form Requests for strict validation (especially for pricing and webhooks).
3. Prepare Eloquent Resources to sanitize data before sending it via Inertia.

### Step 4: Frontend Implementation (Inertia + React with TypeScript)

1. Generate React components using TypeScript (`.tsx`) in `resources/js/Pages/` and `resources/js/Components/`.
2. Define explicit `interface` or `type` for all component props, Inertia shared props, and state.
3. Apply Shadcn UI components and Tailwind classes (matching the "Ijo Kukus" theme).
4. Implement client-side logic (e.g., Debounced search, infinite scroll logic, Zakat calculation) with strict typing.

### Step 5: Security & Performance Review (Self-Correction)

Before finalizing the code output, the Agent must implicitly check:

- _Are there any N+1 query issues?_ -> Add `->with()` in the Eloquent query.
- _Are financial database updates wrapped in `DB::transaction()`?_
- _Is the webhook idempotent?_
- _Are sensitive fields hidden from the Inertia payload?_

### Step 6: Task Tracking Update (Mark as Done)

After generating and verifying the code for a specific sub-task or the entire task block:

1. Open the previously created tracking file (e.g., `/tasks/01-foundation-progress.md`).
2. Update the checkboxes to marked/done (`- [x]`) or append a `✅ Done` label next to the completed items.
3. Announce to the user that the task block is complete and ready for the next instruction.

## 3. Interaction Protocol

- If a package needs to be installed, provide the exact `pnpm` command (e.g., `pnpm add zustand`).
- If a Laravel command needs to be run, provide the exact Artisan command (e.g., `php artisan migrate`).
- Keep conversational filler to a minimum. Output code blocks with clear file path headers.
```