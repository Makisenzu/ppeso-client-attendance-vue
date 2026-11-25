# PPESO CLIENT ATTENDANCE — Security Agent

> **Purpose**: This document defines all security policies, authentication rules, access control patterns,
> and data protection requirements for the PPESO Client Attendance project.
> Any AI agent must follow these rules to prevent security vulnerabilities.

---

## 1. Security Architecture Overview

The project uses a **defense-in-depth** model:

```
┌──────────────────────────────────────────────────────────┐
│  Layer 1: Client-Side Route Guard (Vue Router)           │
│  → Hides screens a role shouldn't see (UX only)          │
├──────────────────────────────────────────────────────────┤
│  Layer 2: Supabase Auth (JWT)                            │
│  → Session management, token refresh                     │
├──────────────────────────────────────────────────────────┤
│  Layer 3: Table Grants                                   │
│  → anon: nothing · authenticated: CRUD only (no TRUNCATE)│
├──────────────────────────────────────────────────────────┤
│  Layer 4: Row Level Security (RLS)                       │
│  → Per-role row access on every table                    │
├──────────────────────────────────────────────────────────┤
│  Layer 5: Guard Trigger & DEFINER Functions              │
│  → Column-level protection on profiles; locked functions │
└──────────────────────────────────────────────────────────┘
```

> [!CAUTION]
> **Client-side route guards are a UX convenience, NOT a security boundary.**
> Anyone with the anon key can call the API directly. RLS and the guard trigger are the real enforcement.

---

## 2. Authentication

### 2.1 Auth Provider

- **Supabase Auth** with email/password
- JWT session stored in `localStorage` by the Supabase JS client (`persistSession: true`, `autoRefreshToken: true`)

### 2.2 Auth State

[`src/stores/authStore.ts`](../src/stores/authStore.ts) holds `userRole`, `isAuthenticated`, `isLoading`.
`fetchUserRole()` reads `public.profiles.role` for the signed-in user; `clearAuth()` resets state on sign-out.

### Rules

> [!CAUTION]
> 1. **The role always comes from `public.profiles`** — never from `user_metadata` (the user controls their metadata).
> 2. **NEVER store session tokens manually** — Supabase handles persistence.
> 3. **NEVER create multiple `onAuthStateChange` listeners** for the same purpose; unsubscribe in `onUnmounted`.

---

## 3. Route-Level Access Control

### 3.1 Navigation Guard ([`src/router/index.ts`](../src/router/index.ts))

```
1. Authentication:   route.meta.requiresAuth && !session        → /login
2. Public routes:    session && to = 'login'                    → getDashboardByRole(role)
3. Role enforcement: meta.allowedRoles && role ∉ allowedRoles   → getDashboardByRole(role)
```

### 3.2 Role-to-Dashboard Mapping (`getDashboardByRole` in `authStore.ts`)

| Role          | Route name              | Path           |
| ------------- | ----------------------- | -------------- |
| `admin`       | `dashboard`             | `/dashboard`   |
| `supervisor`  | `supervisor-dashboard`  | `/supervisor`  |
| `beneficiary` | `beneficiary-dashboard` | `/beneficiary` |
| `null`        | `login`                 | `/login`       |

### 3.3 Route Meta Configuration

Set on the **parent** layout record of each role (typed in `src/types/router.d.ts`):

```typescript
meta: {
  requiresAuth: true,           // REQUIRED
  allowedRoles: ['admin'],      // REQUIRED for role-specific sections
}
```

### Rules

> [!CAUTION]
> 1. **NEVER remove or weaken the `beforeEach` guard.**
> 2. **NEVER add an authenticated route outside its role's parent record** (which carries `requiresAuth` + `allowedRoles`).
> 3. **NEVER add admin routes to `supervisor.ts` or `beneficiary.ts`**, or vice versa.
> 4. A new screen for a role also needs matching **RLS** — hiding a route does not hide data.

---

## 4. Row Level Security (RLS)

Defined in `supabase/migrations/20261113000100_rls_policies.sql`. Verified on the live database on 11/13/2026.

### 4.1 Access Model

| Role            | `profiles`                          | `offices` / `directories` / `holidays` | `attendances`        | `walkin_attendances` |
| --------------- | ----------------------------------- | ------------------------- | -------------------- | -------------------- |
| **Admin**       | all; create, update, delete others  | all                       | all                  | all                  |
| **Supervisor**  | read users in **own office**        | read                      | read **own office**  | read                 |
| **Beneficiary** | read own; edit own **name only**    | read                      | read own             | —                    |

**Special days** (`core.special_days`): admins set and remove them only through the DEFINER RPCs
`core.admin_set_special_day` / `core.admin_delete_special_day` (no direct table writes for anyone); a beneficiary reads
their own and their office's, a supervisor reads their office's, admins read all.

**Accomplishment reports** (`core.accomplishment_reports`): the owner reads, writes and deletes their own until
Reviewed; admins read all, review and delete; a supervisor reads and reviews reports of people in their office.
Reviewers can change only status and remarks (`core.check_accomplishment_report`). `profiles.funding` is admin-only.

**GIP evaluations** (`core.gip_evaluations`, `core.evaluation_questions`): admins manage the questions and read / delete
every evaluation; a supervisor reads the active questions and writes this month's evaluations of active GIPs in their
office (drafts editable, submitted ones locked — `core.check_gip_evaluation`). GIPs can't read evaluations or questions.

**Profile pictures** (Storage bucket `avatars`, private): each user reads / writes only `<their id>/…`; admins read
(GIP IDs, DTR tables) and delete (account deletion — done from the client, since SQL can't delete storage files);
supervisors read the photos of their own office's members (`private.supervises`, migration `20261123000100`), for the
Team Attendance table. Photos open through short-lived signed URLs only (`PersonAvatar` / `useAvatarUrl`).

**Files** (`core.pacd_files` + Storage bucket `pacd-files`, private): admins only — read, upload, edit details and
delete. Files open with 10-minute signed URLs.
| **anon**        | —                                   | —                         | —                    | —                    |

**Inactive / pending accounts** get no admin or supervisor rights (`private.user_role()` only returns a role for
`status = 'active'`). They keep read access to their own profile and attendance.

### 4.2 Client Code Implications

```typescript
// ✅ RLS filters automatically — a beneficiary gets only their own rows
const { data } = await supabase.schema('core').from('attendances').select('*')

// ✅ Writes that RLS rejects affect 0 rows WITHOUT an error — check what came back
const { data: deleted } = await supabase.schema('core').from('attendances')
  .delete().in('id', ids).select('id')
if ((deleted?.length ?? 0) < ids.length) { /* report the skipped rows */ }
```

### 4.3 RLS Helper Functions (`private` schema)

| Function                   | Returns |
| -------------------------- | ------- |
| `private.user_role()`      | caller's role if their profile is active, else `null` |
| `private.user_office_id()` | caller's office if active |
| `private.is_admin()`       | `true` for active admins |
| `private.is_supervisor()`  | `true` for active supervisors |
| `private.supervises(uuid)` | `true` if caller is a supervisor and the profile is in their office |

The client-callable DEFINER functions on `auth.users` all check `private.is_admin()` first:
`public.admin_delete_user(uuid)` (User Management → Delete) refuses the caller's own id, then deletes the `auth.users`
row (profile + attendance cascade); `public.admin_get_user_email(uuid)` / `public.admin_update_user_email(uuid, text)`
(User Management → Edit User) read and change the sign-in email (validated, unique, confirmed right away; the email
identity follows). Emails are fetched only when the edit panel opens, never in the user list.
`public.login_email_exists(text)` is the one DEFINER function `anon` may call: after a failed sign-in, the login page
asks it whether the email has an account, so only the wrong field is marked. It returns a boolean only. This allows
email enumeration — an accepted trade-off (11/24/2026); never widen it to return any other data.

They are `SECURITY DEFINER` (owner `postgres`, bypasses RLS — no policy recursion), `STABLE`, `SET search_path = ''`.
The `private` schema is not exposed through the Data API, so they cannot be called as RPCs.
In policies, wrap them as `(select private.is_admin())` so Postgres evaluates them once per query.

### 4.4 Profile Guard Trigger

`public.guard_profile_update()` (`BEFORE UPDATE ON public.profiles`): when the caller is a signed-in non-admin, any
change to `id`, `role`, `status`, `office_id`, `position`, `passcode` or `created_at` raises `42501`
*"Only an administrator can change role, status, office, position or passcode."* Backend roles (no `auth.uid()`) and
admins pass.

### Rules

> [!CAUTION]
> 1. **NEVER assume client code can bypass RLS** — it cannot, and must not try.
> 2. **NEVER widen a policy "for convenience"** (e.g. `using (true)` for writes, or `to public`). Add the narrowest
>    policy that the new screen needs.
> 3. **NEVER create a `SECURITY DEFINER` function without explicit approval.** When one is approved: `SET search_path = ''`,
>    check `private.is_admin()` (or the right role) inside it, and revoke execute from `public, anon` unless needed.
> 4. **NEVER grant anything to `anon`** — the app has no logged-out data screens.
>    **Approved exceptions:** `public.login_email_exists(text)` (boolean only) and `public.submit_walk_in(...)`
>    (public `/walk-in` form, migration `20261125000000_public_walk_in.sql`): insert-only, returns nothing, validates
>    every field, requires privacy consent and a gender, and rate-limits (errcode `PT429` → HTTP 429): 5 per IP per
>    10 minutes and 20 per day, 30 per minute overall, and no repeat of the same name within 30 minutes
>    (`core.walk_in_submission_log`, MD5 IP hashes kept 1 day; migration `20261125000100`). anon still has no table
>    grants and no `core` usage.
> 5. **NEVER grant `TRUNCATE`, `TRIGGER` or `REFERENCES`** to `authenticated` (TRUNCATE ignores RLS).
> 6. **Test every policy change with a non-admin user** (impersonation snippet in DATABASE.md §9).
> 7. **Profiles are created only by the `on_auth_user_created` trigger**, and it must never read `role` from metadata.

---

## 5. The Kiosk

There are two kiosks, and both record punches **only** through `core.record_punch(passcode, mode)` (migration
`20261119000400_office_kiosks.sql`). That `SECURITY DEFINER` function looks up the passcode, applies the punch rules
(next punch, 5-minute cooldown, on-time / late in Philippine time) and returns just the result and the person's name.
The browser never reads passcodes or writes `core.attendances` for a punch.

- **Admin kiosk** (`/dashboard/kiosk`): runs in an admin session at the PESO office and accepts anyone with a passcode.
- **Office kiosks** (`/office-kiosk`, `KioskLayout` → `AttendanceKiosk.vue`): an office's PACD computer, signed in with
  a **kiosk account** — a profile with role `kiosk` and an office, created on PACD → Office Kiosks. `record_punch`
  refuses anyone whose office isn't the kiosk's ("not assigned to this office"). A kiosk account has no passcode, is
  never flagged absent, and RLS gives it only its own profile and the shared lists (offices, directories, holidays);
  today's punch list comes from `core.kiosk_today_punches()` (its office only). Disabling the account (status
  inactive) stops it at once — `private.user_role()` ignores inactive profiles.

> [!CAUTION]
> 1. **Never record a punch any other way** (no direct inserts / updates of `core.attendances` from a kiosk), and never
>    move a kiosk to a public / anon route.
> 2. **Wrong passcodes lock the kiosk**: 5 failures within 5 minutes (unknown passcode, or someone from another office)
>    are counted in `core.kiosk_failed_attempts` and block that kiosk for 5 minutes. Both failures return the same kind
>    of answer so a kiosk can't be used to find valid passcodes of other offices. Keep it that way.
> 3. **Only kiosk users have passcodes** — admins, supervisors and kiosk accounts have none (NULL, enforced by
>    `set_profile_passcode`).
> 4. **Passcodes are credentials**: never log them, show them in lists other than User Management, put them in URLs, or
>    cache them.
> 5. **The admin kiosk device** still runs an admin session that can open every admin screen: keep it physically
>    supervised, ideally with a dedicated kiosk admin account. Office PCs use kiosk accounts, never an admin session.
> 6. `core.attendances.recorded_by` records which kiosk account (or admin) recorded the latest punch of the day.

---

## 6. Password & Account Security

### 6.1 Password Rules

Signup (`Signup.vue`) and Add User (`useUserManagement.ts`) require **at least 6 characters** (Supabase default).
When touching these forms, raise the minimum (recommend ≥ 12) and set the same minimum in Supabase Auth settings —
client checks alone can be bypassed.

### 6.2 Admin Account Creation (`userManagementService.createUser`)

```
1. Save the admin session            supabase.auth.getSession()
2. Create the auth user              supabase.auth.signUp({ email, password, options.data: names/position })
                                     └─ trigger creates public.profiles (role 'beneficiary', unique passcode)
3. Restore the admin session         supabase.auth.setSession(adminSession)   ← BEFORE any profile write
4. Set admin-controlled fields       update profiles set role, office_id, position, status … (as admin)
```

Step 3 must come before step 4: if email confirmation is off, `signUp()` switches the client to the new user, and the
guard trigger rejects role/office changes from a non-admin.

> [!TIP]
> The cleaner pattern is a **temporary client** with `persistSession: false, autoRefreshToken: false,
> detectSessionInUrl: false` for step 2, so the admin session is never replaced. It is the only permitted second client.

### Rules

> [!IMPORTANT]
> 1. **Passwords are never stored** in Pinia state, `localStorage`, or logs — they live only in the form and go to Supabase Auth.
> 2. **No public signup.** The `/signup` route was removed (11/24/2026); accounts are created by admins in User
>    Management, and unknown paths redirect to `/login`. Supabase Auth signups stay enabled only because admin account
>    creation uses `auth.signUp`; `handle_new_user` still never reads `role` from metadata.

---

## 7. Credential & Secret Management

| Variable                        | Purpose                  | Public? |
| ------------------------------- | ------------------------ | ------- |
| `VITE_SUPABASE_URL`             | Supabase project URL      | Yes     |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | Yes — safe only because RLS restricts it |

> [!CAUTION]
> 1. **NEVER commit `.env`** — it is in `.gitignore`.
> 2. **NEVER put the `service_role` key, DB password, or any private key in a `VITE_` variable** — every `VITE_` value is
>    shipped to every visitor's browser.
> 3. **NEVER hardcode keys, URLs, or secrets** in source code.
> 4. `supabase/.temp/` is CLI cache (project ref, pooler URL) — don't commit new files from it.

---

## 8. Input Validation

- **Client**: form validators in composables / helpers (e.g. `validateOfficeForm`, `useUserManagement` checks,
  `kioskhelper.validatePunch`). They improve UX only.
- **Server**: NOT NULL / UNIQUE / FK / enum constraints, RLS, the guard trigger, and the punch cooldown trigger.

> [!IMPORTANT]
> 1. **Never rely solely on client-side validation.** A rule that protects data (who can write what, uniqueness,
>    allowed values) must exist in the database.
> 2. Enum-typed inputs must come from the enum's option list, never free text.

---

## 9. What DevTools Can Show

| Tab             | Rule |
| --------------- | ---- |
| **Console**     | Never log records, profiles, passcodes, responses or IDs. `console.error` with a message only. |
| **Application** | `localStorage` holds the Supabase session, the theme (`useColorMode`) and the PSGC cache; a cookie holds the sidebar open state — nothing else. |
| **Network**     | Every selected column is visible. RLS limits rows; **select only the columns the screen needs**, especially for other people's data. |
| **Elements**    | Never put passcodes or personal data in `data-*` attributes, hidden inputs or `title` attributes. |

Error messages shown to users must not echo raw Postgres errors that name tables, columns or policies; messages
raised on purpose in SQL (e.g. the guard trigger's) may pass through.

---

## 10. Security Checklist for New Features

- [ ] Route sits under its role's parent record (`requiresAuth` + `allowedRoles`)
- [ ] New table: RLS enabled, policies per command, no `anon` grant, no TRUNCATE, FK + filter indexes (DATABASE.md §9)
- [ ] Policy change tested by impersonating each role in a rolled-back transaction
- [ ] `core` queries use `.schema('core')`
- [ ] No profile writes of `role` / `status` / `office_id` / `position` / `passcode` from a non-admin session
- [ ] Writes that may be skipped by RLS chain `.select('id')` and report partial results
- [ ] No hardcoded credentials; no new private key in a `VITE_` variable
- [ ] No passwords, passcodes or personal data in Pinia, `localStorage`, logs or URLs
- [ ] Queries reading other users' data select only the columns shown
- [ ] Error messages are generic for unexpected failures
- [ ] Personal data follows the checklist in [`PRIVACY.md`](PRIVACY.md) §6
