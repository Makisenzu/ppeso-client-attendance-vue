# PPESO CLIENT ATTENDANCE — Backend Agent

> **Purpose**: This document defines all backend conventions, data flow patterns, service architecture,
> and Supabase integration rules for the PPESO Client Attendance project.
> Any AI agent writing backend logic (services, stores, composables, API calls) MUST follow these rules.

---

## 1. Backend Architecture Overview

PPESO Client Attendance is a **client-side Vue 3 SPA** with **Supabase** as the sole backend.
There is no custom Node/Express server. All server-side logic is handled by:

1. **Supabase Auth** — email/password authentication with JWT sessions
2. **Supabase PostgREST** — typed REST API over PostgreSQL (`public` and `core` schemas exposed)
3. **Supabase Realtime** — `postgres_changes` + broadcast channels for live attendance updates
4. **Database triggers & functions** — profile creation, passcode generation, punch-status calculation, profile guard
5. **pg_cron** — nightly absence flagging (`core.flag_daily_absences`)
6. **Row Level Security (RLS)** — server-enforced access control on every table (SECURITY.md §4)

### Key Principle

> All "backend" logic lives in the `src/services/` layer as stateless TypeScript modules.
> Services are the **only** layer permitted to call Supabase.

---

## 2. Layered Architecture — Strict Data Flow

```
Vue Component (.vue)
    ↓ uses
Composable (useXxx.ts)          ← Vue lifecycle, screen state, filters, pagination, selection, dialogs
    ↓ uses (optional)
Pinia Store (xxxStore.ts)       ← State shared across screens (auth, kiosk, offices)
    ↓ calls
Service (xxxService.ts)         ← Supabase queries, realtime channels, API calls (STATELESS)
    ↓ uses
Types (xxx.ts) + Helpers (xxxHelper.ts)  ← Pure functions, type defs
```

Most admin screens are **composable → service** (e.g. `useAttendance` → `attendanceService`) because their state is
screen-local. Add a store only when two or more screens need the same reactive state.

### Layer Boundaries — HARD RULES

| Rule | Enforcement |
| ---- | ----------- |
| Components → Supabase | **FORBIDDEN.** Components must go through composable → service. |
| Services → Vue reactivity | **FORBIDDEN.** Services must not import `ref`, `computed`, `watch`. |
| Helpers → stores/services | **FORBIDDEN.** Helpers are pure functions with zero side effects. |
| Stores → services | **ALLOWED.** |
| Composables → stores + services | **ALLOWED.** Composables are the orchestration glue layer. |

> [!WARNING]
> **Known violations (fix when touching these files, don't copy them):** `src/stores/authStore.ts` and
> `src/stores/kioskStore.ts` query Supabase instead of calling a service. Move the calls into `authService` /
> `kioskService`. (Components no longer call Supabase: Login, Signup and PesoSidebar now go through
> `useLogin`, `useSignup` and `usePesoSidebar`.)

---

## 3. Supabase Client Configuration

### Singleton Client ([`src/services/supabase.ts`](../src/services/supabase.ts))

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
```

### Rules

> [!CAUTION]
> 1. **ONE Supabase client instance**, imported as `import { supabase } from '@/services/supabase'`.
>    The only permitted second client is a non-persisting temp client for admin account creation (SECURITY.md §6.2).
> 2. **Always use the `VITE_` prefix** for client environment variables — Vite requirement.
> 3. The client is **typed** with the auto-generated `Database` type from `src/types/database.types.ts`.

---

## 4. Multi-Schema Database Access

| Schema   | Domain                              | Tables                                  | How to query                                   |
| -------- | ----------------------------------- | --------------------------------------- | ---------------------------------------------- |
| `public` | Identity & organisation             | `profiles`, `offices`                   | `supabase.from('profiles')` (default schema)   |
| `core`   | Attendance & walk-in client logs    | `attendances`, `walkin_attendances`     | `supabase.schema('core').from('attendances')`  |

```typescript
// ✅ Correct
supabase.from('offices').select('id, name, code')
supabase.schema('core').from('attendances').select('*').eq('attendance_date', today)

// ❌ WRONG — public.attendances does not exist
supabase.from('attendances').select('*')
```

> [!WARNING]
> Several services still try `core` first and fall back to `public.attendances` / `public.walkin_attendances` when the
> `core` schema "is not exposed" (`PGRST106`). `core` **is** exposed and the `public` tables don't exist, so these
> branches are dead code. Don't add new ones; remove them when you touch a service.

---

## 5. Service Layer Conventions

Services are in [`src/services/<role>/`](../src/services).

### Service File Inventory

| Role     | Service Files |
| -------- | ------------- |
| `common` | `authService.ts` (sign in / up / out, current user, profile, auth listener), `accountService.ts` (own account: read, edit own name, change password — Account page for every role), `psgc.ts` (axios instance for psgc.cloud) |
| `peso`   | `attendanceService.ts` (attendance list, delete, bulk delete, DTR range queries, realtime), `kioskService.ts` (passcode punch, today's punches), `clientRecordService.ts` (walk-in CRUD), `officeService.ts` (office CRUD), `directoryService.ts` (office directory CRUD, picker options), `userManagementService.ts` (profiles, account creation, delete) |

### Service Pattern

```typescript
import { supabase } from '@/services/supabase'
import type { WalkinAttendanceRow } from '@/types/peso/clientRecord'

export const someService = {
  async fetchAll(): Promise<WalkinAttendanceRow[]> {
    const { data, error } = await supabase
      .schema('core')
      .from('walkin_attendances')
      .select('id, firstname, lastname, purpose, check_in')
      .order('check_in', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to load walk-in records.')
    return data ?? []
  },

  async deleteMany(ids: string[]): Promise<string[]> {
    const { data, error } = await supabase
      .schema('core')
      .from('walkin_attendances')
      .delete()
      .in('id', ids)
      .select('id')            // returns only the rows RLS actually let us delete

    if (error) throw new Error(error.message || 'Failed to delete records.')
    return (data ?? []).map((row) => row.id)
  },
}
```

### Rules

> [!IMPORTANT]
> 1. Services are **stateless objects** exported as `const xxxService = { ... }`.
> 2. Services **throw errors** (or return `{ success, error }` for form actions, as `officeService` / `userManagementService`
>    do — keep each service consistent with itself). They never show UI feedback.
> 3. Services MUST NOT import Vue reactivity.
> 4. Always provide a human-readable error fallback string.
> 5. Chain `.select()` after `.insert()` / `.update()` / `.delete()` when the caller needs to know which rows changed —
>    RLS silently skips rows instead of erroring.
> 6. Use `.single()` when exactly one row must exist, `.maybeSingle()` when it might not.
> 7. **Bulk changes are one request** (`.in('id', ids)`, chunked at 100 IDs) — never loop single deletes or updates.
>    Reference: `attendanceService.deleteAttendances()`.

---

## 6. Pinia Store Conventions

Stores are in [`src/stores/`](../src/stores) (flat).

### Store Inventory

| Store            | Holds |
| ---------------- | ----- |
| `authStore.ts`   | `userRole`, `isAuthenticated`, `isLoading`; `fetchUserRole()`, `clearAuth()`; exports `getDashboardByRole()` |
| `kioskStore.ts`  | Kiosk punch state (`useAttendanceStore`) |
| `officeStore.ts` | Office list shared by Offices and User Management |

### Setup Store Pattern (REQUIRED)

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { officeService } from '@/services/peso/officeService'
import type { OfficeRecord } from '@/types/peso/office'

export const useOfficeStore = defineStore('office', () => {
  const offices = ref<OfficeRecord[]>([])
  const isLoading = ref(false)

  const fetchOffices = async () => {
    isLoading.value = true
    try {
      offices.value = await officeService.getOffices()
    } finally {
      isLoading.value = false
    }
  }

  return { offices, isLoading, fetchOffices }
})
```

### Rules

> [!IMPORTANT]
> 1. **All stores** use the setup syntax `defineStore('name', () => { ... })`.
> 2. When updating arrays, reassign with a new reference (`items.value = [...]`) so computed lists and tables react.
> 3. Never put passwords, passcodes or tokens in store state.

---

## 7. Composable Conventions

Composables are in [`src/composables/<role>/`](../src/composables).

### Pattern (as in `useAttendance.ts`)

```typescript
export function useSomething() {
  const items = ref<Item[]>([])
  const isLoading = ref(false)
  const searchQuery = ref('')

  const filtered = computed(() => /* search + filters */)
  const paginated = computed(() => /* slice for current page */)

  const fetchItems = async () => { /* call service, set isLoading */ }

  onMounted(() => { fetchItems() })
  onUnmounted(() => { /* unsubscribe realtime, clear timers */ })

  return { items, isLoading, searchQuery, filtered, paginated, fetchItems }
}
```

### Rules

> [!IMPORTANT]
> 1. Data fetching on mount, filters, pagination, bulk selection and dialog state belong in the composable, not the component.
> 2. Use `storeToRefs()` for store state and destructure store actions directly.
> 3. **Always clean up** in `onUnmounted`: realtime channels, `setTimeout` / debounce timers, `BroadcastChannel`s.
> 4. Composable names follow the `useXxx` pattern.
> 5. User feedback goes through `useToastAlert()` (a local `showFeedback(text, type)` wrapper is fine) — toasts
>    show top-right. See DESIGN.md §12.

---

## 8. Authentication Flow

```
router.beforeEach
  ├── supabase.auth.getSession()
  ├── no session + requiresAuth → /login
  └── session → authStore.fetchUserRole() (once)
        └── public.profiles.role for auth.uid()
              ├── on /login → redirect to getDashboardByRole(role)
              └── allowedRoles mismatch → redirect to getDashboardByRole(role)
```

- **Profile rows are created by the database**, never by the client: the `on_auth_user_created` trigger inserts
  `public.profiles` from the signup metadata (`firstname`, `middlename`, `lastname`, `position`), and
  `trigger_set_profile_passcode` assigns a unique 6-digit passcode. New accounts start as `role = 'beneficiary'`,
  `status = 'active'`.
- **Signup** (`Signup.vue`) calls `supabase.auth.signUp()` then signs in — it does not write `profiles`.
- **Admin account creation** (`userManagementService.createUser`) is covered in SECURITY.md §6.2: role, office,
  position and status are written **by the admin session** after the auth user exists.

---

## 9. Realtime & Cross-Tab Sync

`attendanceService.subscribeToAttendances(callback)` combines three signals, and `useAttendance` debounces them (300 ms):

1. `postgres_changes` on `core.attendances`
2. Supabase broadcast channel `peso-global-attendance-events`
3. Browser `BroadcastChannel('peso_attendance_realtime')` for same-browser tabs

After any write, call `attendanceService.notifyAttendanceChange()` so the other open screens refresh.

> [!WARNING]
> `core.attendances` is **not** in the `supabase_realtime` publication, so signal 1 never fires today — the broadcast
> and `BroadcastChannel` signals do the work. To enable it, add the table to the publication in a migration
> (`alter publication supabase_realtime add table core.attendances;`). Realtime respects RLS.

---

## 10. Persistent Caching Pattern

[`src/helpers/common/persistentCache.ts`](../src/helpers/common/persistentCache.ts) — `localStorage` cache with TTL and
in-flight request de-duplication.

| Function                                    | Purpose |
| ------------------------------------------- | ------- |
| `getOrSetPersistentCache(key, ttl, loader)` | Return cached value or run the loader and cache the result |
| `getPersistentCacheValue<T>(key)`           | Read a cached value (`null` if expired) |
| `removePersistentCacheValue(key)`           | Invalidate an entry |

| Cache Key          | TTL     | Used By          |
| ------------------ | ------- | ---------------- |
| `psgc:<endpoint>`  | 30 days | `psgcHelpers.ts` |

> [!CAUTION]
> `localStorage` is readable in DevTools and survives sign-out. **Cache public reference data only** (PSGC).
> Never cache profiles, passcodes, attendance or walk-in records there (PRIVACY.md §0).

---

## 11. External API Access

**axios** is used for external APIs only. All Supabase calls use the Supabase JS client.

| API  | Client | Used For |
| ---- | ------ | -------- |
| PSGC (`https://psgc.cloud/api/v2`) | `src/services/common/psgc.ts` | Province / municipality / barangay pickers for walk-in addresses |

> [!IMPORTANT]
> 1. **NEVER use axios for Supabase calls.**
> 2. **NEVER send personal data to an external API** — PSGC calls carry only location codes.

---

## 12. Type Generation

```bash
rtk npm run types:gen
# npx supabase gen types typescript --project-id otulzqszdvyzebetiqkn --schema public --schema core > src/types/database.types.ts
```

> [!CAUTION]
> 1. **NEVER manually edit** `src/types/database.types.ts`.
> 2. After any schema change, regenerate types.
> 3. Domain types in `src/types/peso/*.ts` derive from `Database['schema']['Tables']['table']['Row' | 'Insert' | 'Update']`.

---

## 13. Error Handling Pattern

```
Service layer:     throw new Error(error.message || 'Human-readable fallback')
    ↑
Composable layer:  try/catch → toast (useToastAlert) on failure; always reset loading flags in finally
    ↑
Component layer:   renders loading / empty / feedback states from composable refs
```

> [!IMPORTANT]
> 1. Services **throw** errors — they never show UI feedback.
> 2. Always reset `isLoading` / `isDeleting` / `isSubmitting` in `finally` blocks.
> 3. Use `console.error()` for unexpected failures, never `console.log()` — and **never log records, profiles or passcodes**
>    (SECURITY.md §9).
> 4. On a failed bulk operation, refetch so the UI matches the database.

---

## 14. Feature Creation Checklist

```
1. supabase/migrations/<timestamp>_<name>.sql   ← Table + RLS + grants (if schema changes)
2. src/types/<role>/featureName.ts              ← Types derived from database.types.ts
3. src/helpers/<role>/featureNameHelper.ts      ← Pure helper functions (formatting, stats, CSV)
4. src/services/<role>/featureNameService.ts    ← Supabase queries
5. src/stores/featureNameStore.ts               ← Only if state is shared across screens
6. src/composables/<role>/useFeatureName.ts     ← Screen state, filters, pagination, selection
7. src/components/<role>/FeatureName/FeatureName.vue ← Vue component
8. src/router/routes/<Role>/<role>.ts           ← Lazy-loaded route under the role's layout
```

> [!IMPORTANT]
> Never skip layers. Never place admin logic in `beneficiary/` or `supervisor/`, or vice versa.

---

## 15. Scale — Size Queries for Real Use

The attendance table grows by one row per active person per working day (plus the nightly absence rows), and the walk-in
log grows every office day. Today every list loads the full table and filters in the browser (`getAttendances()`,
walk-in records). That is acceptable for the current size but will not stay so.

> [!CAUTION]
> 1. **New lists over growing tables page on the server**: filter, search and sort in SQL (a view or RPC), load one page
>    with `.range()` and `{ count: 'exact' }`.
> 2. **Counts, totals and charts come from SQL** (`count(*)`, `GROUP BY`) once a table passes a few thousand rows.
> 3. **Select only the columns the screen shows** — no `select('*')` in new list queries.
> 4. **Index what you filter, sort and join on**, in the same migration that adds the query.
> 5. **No request per row.** Join or batch (`.in()` in chunks of 100) instead of N+1 lookups.
> 6. **Search waits for typing to stop** (debounce ~300 ms).
>
> **Known full-table loads to migrate first:** `attendanceService.getAttendances()` (all attendance rows + all profiles
> and offices), `clientRecordService` walk-in list, `userManagementService.getProfiles()`.
