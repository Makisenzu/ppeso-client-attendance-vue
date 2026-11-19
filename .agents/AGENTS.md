# PPESO CLIENT ATTENDANCE — Master Agent

# Execution Rules

- **Terminal Commands**: Always prefix CLI/terminal commands with `rtk` to reduce output token usage.
  - Use `rtk git status` instead of `git status`
  - Use `rtk git diff` instead of `git diff`
  - Use `rtk npm run <script>` instead of plain npm scripts
  - Use `rtk pnpm` / `rtk npm` for package listing or management tasks
  - Use `rtk npx <command>` (e.g., `rtk npx vue-tsc -b`, `rtk npx supabase db query --linked "..."`) when running one-off executables

- **Context & Workspace Limits**:
  - **No Broad Scans**: Never read whole directories, run workspace-wide `grep`, or scan unrequested folders.
  - **Scoped File Reading**: Read only files explicitly referenced or directly imported by the active file being edited.
  - **Strict Limits**: Inspect/modify a maximum of 3 files per turn. Ask for permission before opening additional files.
  - **Concise Diffs**: Output only minimal code diffs and targeted changes in chat responses—avoid repeating unchanged code.

> **Purpose**: This is the **authoritative primary entry point** for all AI coding agents working on the
> PPESO Client Attendance codebase. Every AI model — regardless of provider (Claude, Gemini, GPT, Copilot, Cursor, etc.) —
> **MUST read this file first** before executing ANY coding request. This document defines the project structure,
> global constraints, and delegates domain-specific execution rules to the 5 specialized agent documents.

---

## 0. Mandatory Pre-Execution Protocol

> [!CAUTION]
> **BEFORE writing, modifying, or deleting ANY code**, you MUST:
>
> 1. **Identify which specialized agents apply** to your task using the Registry & Task Matrix below.
> 2. **Read the relevant specialized agent file(s)** and follow their rules strictly.
> 3. **Never skip an applicable agent** — violating a specialized agent's rules is considered a project constraint violation.

### Specialized Agent Registry

| Agent File                           | Domain                          | Key Responsibilities                                                                                  | Read When...                                                                        |
| ------------------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`BACKEND.md`](BACKEND.md)   | **Service Layer & State**       | Layered architecture, services, Pinia setup stores, composables, realtime, caching, helpers            | Writing/modifying any service, store, composable, or data flow                      |
| [`DATABASE.md`](DATABASE.md) | **Database & Schema**           | `public` + `core` schemas, tables, enums, triggers, pg_cron job, typed queries, migrations             | Writing queries, defining/deriving types, referencing tables/schemas, migrations    |
| [`DESIGN.md`](DESIGN.md)     | **UI & Design System**          | `oklch` tokens, Tailwind CSS v4, shadcn-vue (`new-york`), Lucide icons, dark mode, layouts, tables     | Creating/modifying `.vue` components, layouts, styling, or animations               |
| [`SECURITY.md`](SECURITY.md) | **Auth & Access Control**       | Supabase Auth, route guard, RLS policies, `private` helper functions, profile guard trigger, kiosk     | Touching auth, roles, route guards, RLS, passcodes, or any sensitive operation       |
| [`PRIVACY.md`](PRIVACY.md)   | **Data Privacy Act (RA 10173)** | Personal data of staff, beneficiaries and walk-in clients: purpose, access, exports, retention, breaches | Collecting, showing, storing, sharing, exporting, logging or deleting personal data |

### Task-to-Agent Mapping

| Task                                  | Required Agents                                                                                                                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **New Full-Stack Feature**            | [`BACKEND.md`](BACKEND.md) + [`DATABASE.md`](DATABASE.md) + [`DESIGN.md`](DESIGN.md) + [`SECURITY.md`](SECURITY.md) + [`PRIVACY.md`](PRIVACY.md) |
| **Anything touching personal data** (new field, table, form, export, report, third-party API) | [`PRIVACY.md`](PRIVACY.md) + [`SECURITY.md`](SECURITY.md)                                                                  |
| **New / Modify Vue Component**        | [`DESIGN.md`](DESIGN.md) (+ [`BACKEND.md`](BACKEND.md) if connecting to composables/stores)                                                                             |
| **New / Modify Supabase Query**       | [`DATABASE.md`](DATABASE.md) + [`BACKEND.md`](BACKEND.md) + [`SECURITY.md`](SECURITY.md)                                                                        |
| **New / Modify Pinia Store**          | [`BACKEND.md`](BACKEND.md) + [`DATABASE.md`](DATABASE.md)                                                                                                               |
| **Schema change / Migration / RLS**   | [`DATABASE.md`](DATABASE.md) + [`SECURITY.md`](SECURITY.md) (+ [`PRIVACY.md`](PRIVACY.md) if the table holds personal data)                                     |
| **Fix Styling / Dark Mode / Layout**  | [`DESIGN.md`](DESIGN.md)                                                                                                                                                        |
| **Auth / Login / Signup / User creation** | [`SECURITY.md`](SECURITY.md) + [`BACKEND.md`](BACKEND.md) + [`DATABASE.md`](DATABASE.md)                                                                    |
| **Kiosk / Punch / DTR logic**         | [`BACKEND.md`](BACKEND.md) + [`DATABASE.md`](DATABASE.md) + [`SECURITY.md`](SECURITY.md)                                                                        |
| **Route / Navigation / Guard Change** | [`SECURITY.md`](SECURITY.md) + [`DESIGN.md`](DESIGN.md)                                                                                                                 |
| **Type Definition / Schema Update**   | [`DATABASE.md`](DATABASE.md)                                                                                                                                                    |
| **Data Tables / Charts / CSV Export** | [`DESIGN.md`](DESIGN.md) + [`BACKEND.md`](BACKEND.md) + [`PRIVACY.md`](PRIVACY.md)                                                                              |

---

## 1. Project Overview

**PPESO Client Attendance** is the attendance and client-logging system of the Provincial Public Employment Service
Office (PPESO), Province of Agusan del Sur, Philippines. It records:

- **Daily Time Records (DTR)** of PESO personnel and program beneficiaries (GIP, TUPAD) through a passcode **kiosk**,
  with AM/PM check-in/out, on-time / late / early-out / absent statuses, and printable Civil Service Form 48 DTR slips.
- **Walk-in client visits** (name, gender, address, purpose of visit: GIP, SPES, Job Start, OFW, CEA, Skills, Others).
- **Offices** that personnel and beneficiaries are assigned to, and the **user accounts** themselves.

It serves 3 user roles (`public.profile_roles`): **Admin**, **Supervisor**, and **Beneficiary**.

### Technology Stack — DO NOT CHANGE

| Layer         | Technology                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Framework     | **Vue 3** (Composition API with `<script setup lang="ts">`)                                      |
| Build Tool    | **Vite 8** with `@vitejs/plugin-vue` and `@tailwindcss/vite`                                     |
| Language      | **TypeScript 6** (`vue-tsc -b` runs on every build)                                              |
| State         | **Pinia** (setup stores using `defineStore('name', () => {})`)                                   |
| Routing       | **Vue Router 4** (history mode)                                                                  |
| Backend/DB    | **Supabase** (schemas: `public`, `core`; project `ppeso-client-attendance`, ref `otulzqszdvyzebetiqkn`) |
| UI Components | **shadcn-vue** (`new-york` style, `reka-ui` base) + Tailwind CSS v4                              |
| Styling       | **Tailwind CSS v4** + `tw-animate-css`                                                           |
| Icons         | **Lucide Vue** (`@lucide/vue`)                                                                   |
| Theme         | `@vueuse/core` → `useColorMode()`                                                                |
| Charts        | **chart.js** + **vue-chartjs**                                                                   |
| HTTP          | **axios** (external APIs only — PSGC; all Supabase calls use the JS client)                      |
| Path Alias    | `@` → `./src` (configured in `vite.config.ts`)                                                   |

---

## 2. Directory Structure — ROLE-BASED SEGMENTATION

Business logic follows a **role-based subdirectory pattern**. The segments are `common`, `peso` (admin / PESO staff
screens), `supervisor`, and `beneficiary`.

```
src/
├── assets/                  # Static assets (images, SVGs)
├── components/
│   ├── ui/                  # shadcn-vue primitives (DO NOT edit manually)
│   ├── sidebars/            # PesoSidebar, SupervisorSidebar, BeneficiarySidebar (+ index.ts)
│   ├── peso/                # Admin screens: Dashboard/, attendance/, ClientRecords/, Offices/, Evaluations/, Files/,
│   │                        #   UserManagement/, UserKiosk/, Calendar/
│   ├── supervisor/          # Supervisor screens (Dashboard/, TeamAttendance/, TeamAccomplishments/, TeamEvaluations/) — own office
│   └── beneficiary/         # Beneficiary screens (Dashboard/)
├── composables/
│   ├── common/              # usePsgc, useSidebarUser
│   ├── peso/                # useAttendance, useKiosk, useDtrGenerator, useDtrSlip, useClientRecords,
│   │                        #   useClientRecordSheet, useOffice, useUserManagement, useDashboard
│   ├── supervisor/          # useSupervisorSidebar, useSupervisorDashboard, useTeamAttendance, useTeamAccomplishments,
│   │                        #   useTeamEvaluations
│   ├── beneficiary/         # useBeneficiarySidebar
│   └── useAuthForm.ts       # Shared login/signup form state
├── helpers/
│   ├── common/              # persistentCache, psgcHelpers
│   ├── supervisor/          # teamHelper (today status, member options, team search, GIP report rows)
│   └── peso/                # attendanceHelper, kioskhelper, dtrHelper, clientRecordHelper,
│                            #   dashboardHelper, officeHelper, userManagementHelper
├── layouts/                 # PesoLayout, SupervisorLayout, BeneficiaryLayout, auth/AuthLayout
├── lib/utils.ts             # cn() utility for class merging (shadcn-vue)
├── pages/                   # Login.vue, Signup.vue (public auth pages)
├── router/
│   ├── index.ts             # Main router + global beforeEach guard
│   └── routes/              # Login.ts, Peso/peso.ts, Supervisor/supervisor.ts, Beneficiary/beneficiary.ts
├── services/
│   ├── supabase.ts          # Singleton typed Supabase client
│   ├── common/              # authService, psgc (axios instance)
│   ├── supervisor/          # teamService (own office, team members, team attendance, pending reviews)
│   └── peso/                # attendanceService, kioskService, clientRecordService, officeService,
│                            #   userManagementService
├── stores/                  # authStore, kioskStore, officeStore, avatarStore (flat — no role subfolders yet)
├── types/
│   ├── database.types.ts    # AUTO-GENERATED — DO NOT EDIT MANUALLY
│   ├── router.d.ts          # RouteMeta augmentation (requiresAuth, allowedRoles)
│   ├── supervisor/          # team
│   └── peso/                # attendance, kiosk, dtr, clientRecord, office, userManagement
├── App.vue                  # Root: RouterView with fade transition
├── main.ts                  # Entry point (Pinia + router)
└── style.css                # Design tokens (oklch), Tailwind theme, base layer

supabase/
└── migrations/              # Versioned SQL (baseline schema + RLS). See DATABASE.md §9
```

---

## 3. Universal Architectural Constraints

### 3.1 Layered Data Flow

```
Component (.vue) ──► Composable (useXxx) ──► [Store (xxxStore)] ──► Service (xxxService) ──► Supabase / Types
```

- **Components** never call Supabase or services directly; use composables (and stores where shared state is needed).
- **Services** are stateless TypeScript modules — never import Vue reactivity (`ref`, `computed`).
- **Stores** hold state that is shared across screens (auth, kiosk, offices). Screen-local state lives in the composable.
- **Helpers** are pure, stateless utility functions with no side effects (CSV download helpers are the only DOM exception).

### 3.2 Routing & Role Prefixes

| Role          | Path Prefix         | Layout              | Meta `allowedRoles` |
| ------------- | ------------------- | ------------------- | ------------------- |
| Auth (public) | `/login`, `/signup` | `AuthLayout`        | _(none)_            |
| Admin         | `/dashboard`        | `PesoLayout`        | `['admin']`         |
| Supervisor    | `/supervisor`       | `SupervisorLayout`  | `['supervisor']`    |
| Beneficiary   | `/beneficiary`      | `BeneficiaryLayout` | `['beneficiary']`   |

`/kiosk` redirects to `/dashboard/kiosk` — the kiosk always runs under an **admin** session (see SECURITY.md §5).

### 3.3 File Naming & Imports

- **Components / Layouts / Sidebars**: `PascalCase.vue` (e.g., `AttendanceKiosk.vue`, `PesoSidebar.vue`)
- **Composables**: `useCamelCase.ts` (e.g., `useAttendance.ts`)
- **Stores**: `camelCaseStore.ts` (e.g., `officeStore.ts`)
- **Services**: `camelCaseService.ts` (e.g., `attendanceService.ts`)
- **Helpers / Types**: `camelCaseHelper.ts` / `camelCase.ts`
- **Imports**: Always use the `@/` alias (e.g., `@/services/peso/attendanceService`). Never use relative traversal (`../../`).
- **Type-only imports**: Always use `import type { ... }`.

---

## 4. Universal Critical DON'Ts — HARD RULES

> [!CAUTION]
>
> 1. **DO NOT edit `src/types/database.types.ts`** — it is auto-generated via `npm run types:gen`.
> 2. **DO NOT edit files inside `src/components/ui/`** — they are shadcn-vue primitives managed via CLI.
> 3. **DO NOT install alternative UI component libraries** (Vuetify, PrimeVue, Element Plus, etc.).
> 4. **DO NOT create secondary Supabase clients** except the non-persisting temp client for admin account creation
>    (SECURITY.md §6.2).
> 5. **DO NOT query `core` tables without `.schema('core')`.** `public` tables (`profiles`, `offices`) use the default
>    client. Never add new `public.attendances` fallbacks — that table does not exist (DATABASE.md §10).
> 6. **DO NOT use Options API** in Vue components or new stores (`<script setup lang="ts">` only).
> 7. **DO NOT bypass the layered architecture** (Component → Composable → [Store] → Service). `.vue` files contain
>    rendering only: no logic in `<script setup>` or templates beyond composable wiring. See [`DESIGN.md`](DESIGN.md) §12.1.
> 8. **DO NOT remove or weaken the `router.beforeEach` guard** in `src/router/index.ts`.
> 9. **DO NOT store sensitive data** (passwords, passcodes, tokens) in Pinia state or `localStorage`.
> 10. **DO NOT mix role-specific logic** across role folders (e.g., no admin code in `beneficiary/`).
> 11. **DO NOT hard-code color hex values or raw palette colors** — use semantic design tokens from `style.css`.
> 12. **DO NOT use `any`** without explicit necessity and an explanatory comment.
> 13. **DO NOT remove unrelated existing comments, docstrings, or code blocks.**
> 14. **DO NOT change the database without a migration.** Every schema, RLS, grant or function change is a new file in
>     `supabase/migrations/`, applied with `rtk npx supabase db push --linked`, then `npm run types:gen`.
>     Never edit an applied migration. See DATABASE.md §9.
> 15. **DO NOT ship a table without RLS** or a policy wider than the role needs. The access model in SECURITY.md §4 is
>     the contract; the client-side guard is only UX.
> 16. **DO NOT let anyone change their own role, status, office, position or passcode.** Only admins can — enforced by
>     the `trg_guard_profile_update` trigger. Never write those columns while signed in as the affected user.
> 17. **DO NOT ship anything that breaks the Data Privacy Act (RA 10173).** No personal data in logs, URLs or third-party
>     calls; select only the columns a screen shows; exports are admin-only. See [`PRIVACY.md`](PRIVACY.md) §0.
> 18. **Pick the date format by use** in new or modified UI: a **written date** (`November 13, 2026`) where the date is
>     read as text (table date / period columns, descriptions, status lines), a **numeric date** (`11/13/2026`) where
>     dates are compared or entered (dense grids, next to date pickers, exports). Never abbreviated months or other
>     orders. Display only — the database, payloads and date inputs keep ISO dates. See [`DESIGN.md`](DESIGN.md) §3.1.
> 19. **DO NOT ship a data table without bulk selection and bulk delete** (unless its records must never be deleted).
>     See [`DESIGN.md`](DESIGN.md) §11.1.
> 20. **DO NOT finish a change with failing checks.** Before handing work back run `rtk npm run build`
>     (`vue-tsc -b && vite build`, 0 errors). Keep components under ~1,500 lines: split big pages into section
>     components that share the page composable.
> 21. **Viewing a DTR or an accomplishment report always shows its printed form**, for every role and every status:
>     the Civil Service Form 48 (`DtrPrintSheet`, via `useDtrPreview` for the record's month) or the report's official
>     form (`AccomplishmentDocumentPreview`). Never show the raw punches or entries in a View dialog or sheet.
